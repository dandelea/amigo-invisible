import { randomBytes } from 'node:crypto';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Env } from '../config/env.js';
import { InjectEnv } from '../config/env.module.js';

// Duración de las URLs firmadas de descarga.
export const DOWNLOAD_URL_SECONDS = 300;

// Almacenamiento de archivos compatible con S3 (R2 en producción). Nunca se
// usa el disco local, que en Render se borra al dormirse.
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger('Storage');
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@InjectEnv() private readonly env: Env) {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  // En desarrollo y tests crea el bucket si no existe. En producción el
  // bucket se crea a mano en R2 (README).
  async onModuleInit(): Promise<void> {
    if (this.env.NODE_ENV === 'production') return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  // Clave de un archivo de deseos. Va bajo el prefijo de la sala para que el
  // script de borrado pueda eliminar todo lo de una sala.
  static wishlistKey(roomId: string, participantId: string, ext: string) {
    return `rooms/${roomId}/${participantId}/${randomBytes(8).toString('hex')}.${ext}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  // Borra sin lanzar: si falla, el archivo queda huérfano y se registra (sin
  // datos personales) para borrarlo a mano.
  async deleteQuietly(key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      const name = error instanceof Error ? error.name : 'Unknown';
      this.logger.error(`No se pudo borrar un archivo (${name})`);
    }
  }

  // URL firmada de descarga, como adjunto y con el nombre indicado.
  signedDownloadUrl(key: string, fileName: string): Promise<string> {
    const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    const disposition = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: disposition,
      }),
      { expiresIn: DOWNLOAD_URL_SECONDS },
    );
  }
}
