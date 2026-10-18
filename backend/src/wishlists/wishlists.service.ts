import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  fileRequired,
  isForeignKeyViolation,
  notFound,
  unsupportedFileType,
} from '../common/errors.js';
import { type Db, InjectDb, type Tx } from '../db/db.module.js';
import { participants, wishlists, type Participant } from '../db/schema.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { DownloadUrlDto, WishlistDto } from '../rooms/dto.js';
import { lockRoom } from '../rooms/room-lock.js';
import { toWishlistDto } from '../rooms/rooms.service.js';
import { detectFileType, safeFileName } from '../storage/file-type.js';
import {
  DOWNLOAD_URL_SECONDS,
  StorageService,
} from '../storage/storage.service.js';

type NewWishlist = Omit<typeof wishlists.$inferInsert, 'participantId'>;

// Lista de deseos: un único elemento por participante (enlace o archivo).
// Guardar reemplaza el anterior y borra su archivo. Se puede crear, cambiar
// y quitar también después del sorteo (decisión del usuario, Fase 5).
@Injectable()
export class WishlistsService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeGateway,
  ) {}

  setLink(me: Participant, url: string): Promise<WishlistDto> {
    return this.replace(me, {
      kind: 'link',
      url,
      fileKey: null,
      fileName: null,
      fileType: null,
      fileSize: null,
    });
  }

  // El archivo se sube antes de la transacción; si luego no se puede
  // guardar (sala cerrada, participante borrado), se borra.
  async setFile(
    me: Participant,
    file: { buffer: Buffer; originalname: string; size: number } | undefined,
  ): Promise<WishlistDto> {
    // Los archivos de más de MAX_FILE_BYTES ya los rechaza multer (413).
    if (!file || file.size === 0) throw fileRequired();
    const type = detectFileType(file.buffer);
    if (!type) throw unsupportedFileType();
    const key = StorageService.wishlistKey(me.roomId, me.id, type.extension);
    await this.storage.put(key, file.buffer, type.mime);
    try {
      return await this.replace(me, {
        kind: 'file',
        url: null,
        fileKey: key,
        fileName: safeFileName(file.originalname, type),
        fileType: type.label,
        fileSize: file.size,
      });
    } catch (error) {
      await this.storage.deleteQuietly(key);
      throw error;
    }
  }

  async remove(me: Participant): Promise<void> {
    const oldKey = await this.db.transaction(async (tx) => {
      await lockRoom(tx, me.roomId);
      const [deleted] = await tx
        .delete(wishlists)
        .where(eq(wishlists.participantId, me.id))
        .returning({ fileKey: wishlists.fileKey });
      return deleted?.fileKey ?? null;
    });
    await this.storage.deleteQuietly(oldKey);
    this.realtime.notifyRoomChanged(me.roomId);
  }

  // URL firmada para descargar el archivo de alguien de la misma sala. La
  // lista es visible para todos los participantes, también tras el sorteo.
  async downloadUrl(
    viewer: Participant,
    participantId: string,
  ): Promise<DownloadUrlDto> {
    const [row] = await this.db
      .select({ fileKey: wishlists.fileKey, fileName: wishlists.fileName })
      .from(wishlists)
      .innerJoin(participants, eq(participants.id, wishlists.participantId))
      .where(
        and(
          eq(wishlists.participantId, participantId),
          eq(participants.roomId, viewer.roomId),
          eq(wishlists.kind, 'file'),
        ),
      )
      .limit(1);
    if (!row?.fileKey || !row.fileName) throw notFound();
    return {
      url: await this.storage.signedDownloadUrl(row.fileKey, row.fileName),
      expiresInSeconds: DOWNLOAD_URL_SECONDS,
    };
  }

  private async replace(
    me: Participant,
    values: NewWishlist,
  ): Promise<WishlistDto> {
    let saved: typeof wishlists.$inferSelect;
    let oldKey: string | null;
    try {
      [saved, oldKey] = await this.db.transaction(async (tx) => {
        await lockRoom(tx, me.roomId);
        const old = await this.currentFileKey(tx, me.id);
        const [row] = await tx
          .insert(wishlists)
          .values({ participantId: me.id, ...values })
          .onConflictDoUpdate({
            target: wishlists.participantId,
            set: { ...values, updatedAt: new Date() },
          })
          .returning();
        return [row, old] as const;
      });
    } catch (error) {
      // El participante se borró (salió o lo expulsaron) mientras guardaba.
      if (isForeignKeyViolation(error)) throw notFound();
      throw error;
    }
    await this.storage.deleteQuietly(oldKey);
    this.realtime.notifyRoomChanged(me.roomId);
    return toWishlistDto(saved)!;
  }

  private async currentFileKey(tx: Tx, participantId: string) {
    const [row] = await tx
      .select({ fileKey: wishlists.fileKey })
      .from(wishlists)
      .where(eq(wishlists.participantId, participantId));
    return row?.fileKey ?? null;
  }
}
