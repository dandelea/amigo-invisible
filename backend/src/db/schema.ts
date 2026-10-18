import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Esquema de base de datos. Todo cuelga de la sala con ON DELETE CASCADE,
// para que el script de borrado manual elimine una sala con todo lo suyo.

export const roomStatus = pgEnum('room_status', ['open', 'drawn']);

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull(),
  // Día de entrega de los regalos (YYYY-MM-DD).
  giftDate: date('gift_date', { mode: 'string' }),
  budgetCents: integer('budget_cents'),
  status: roomStatus('status').notNull().default('open'),
  pairRuleEnabled: boolean('pair_rule_enabled').notNull().default(true),
  // Número de sorteos hechos: 0 antes del primero; sube al repetir.
  drawRound: integer('draw_round').notNull().default(0),
  // Código aleatorio del enlace de invitación (no es el id interno).
  inviteCode: varchar('invite_code', { length: 32 }).notNull().unique(),
  // SHA-256 en hexadecimal del token de gestión. El token nunca se guarda.
  manageTokenHash: varchar('manage_token_hash', { length: 64 })
    .notNull()
    .unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 30 }).notNull(),
    // Nombre normalizado (sin mayúsculas ni tildes) para detectar repetidos.
    nameKey: varchar('name_key', { length: 30 }).notNull(),
    // SHA-256 en hexadecimal del token personal.
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    // Momento en que vio su resultado (Fase 4). Se reinicia al repetir.
    seenAt: timestamp('seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // La restricción única empieza por room_id, así que también sirve de
  // índice para listar los participantes de una sala.
  (t) => [unique('participants_room_name_key').on(t.roomId, t.nameKey)],
);

// Pareja de dos participantes que no pueden tocarse con la regla activa.
// Se guarda ordenada (a < b). Al borrar a cualquiera de los dos se borra la
// pareja (y, en cascada, sus filas de pair_members).
export const pairs = pgTable(
  'pairs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    participantAId: uuid('participant_a_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    participantBId: uuid('participant_b_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('pairs_ordered', sql`${t.participantAId} < ${t.participantBId}`),
  ],
);

// Una fila por miembro de cada pareja. La clave primaria es el participante,
// así que la base de datos impide que alguien esté en dos parejas aunque
// lleguen peticiones simultáneas.
export const pairMembers = pgTable('pair_members', {
  participantId: uuid('participant_id')
    .primaryKey()
    .references(() => participants.id, { onDelete: 'cascade' }),
  pairId: uuid('pair_id')
    .notNull()
    .references(() => pairs.id, { onDelete: 'cascade' }),
});

export const wishlistKind = pgEnum('wishlist_kind', ['link', 'file']);

// Lista de deseos: un único elemento por participante, un enlace https o un
// archivo guardado en el almacenamiento S3 (R2 en producción).
export const wishlists = pgTable(
  'wishlists',
  {
    participantId: uuid('participant_id')
      .primaryKey()
      .references(() => participants.id, { onDelete: 'cascade' }),
    kind: wishlistKind('kind').notNull(),
    url: varchar('url', { length: 2000 }),
    // Clave del objeto: rooms/<sala>/<participante>/<aleatorio>.<ext>
    fileKey: varchar('file_key', { length: 200 }),
    fileName: varchar('file_name', { length: 100 }),
    fileType: varchar('file_type', { length: 50 }),
    fileSize: integer('file_size'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'wishlists_shape',
      sql`(${t.kind} = 'link' and ${t.url} is not null and ${t.fileKey} is null) or (${t.kind} = 'file' and ${t.fileKey} is not null and ${t.url} is null)`,
    ),
  ],
);

// Resultado del sorteo: a quién regala cada participante. Cada uno regala y
// recibe exactamente una vez (clave primaria y restricción única). Nunca sale
// del backend salvo la fila propia de cada participante.
export const assignments = pgTable(
  'assignments',
  {
    giverId: uuid('giver_id')
      .primaryKey()
      .references(() => participants.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
  },
  (t) => [
    unique('assignments_receiver_key').on(t.receiverId),
    check('assignments_not_self', sql`${t.giverId} <> ${t.receiverId}`),
  ],
);

export type Room = typeof rooms.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Pair = typeof pairs.$inferSelect;
export type Wishlist = typeof wishlists.$inferSelect;
