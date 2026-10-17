import {
  boolean,
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
// Parejas, listas de deseos y asignaciones llegan en las fases 3 y 4.

export const roomStatus = pgEnum('room_status', ['open', 'drawn']);

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull(),
  // Día de entrega de los regalos (YYYY-MM-DD).
  giftDate: date('gift_date', { mode: 'string' }),
  budgetCents: integer('budget_cents'),
  status: roomStatus('status').notNull().default('open'),
  pairRuleEnabled: boolean('pair_rule_enabled').notNull().default(true),
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

export type Room = typeof rooms.$inferSelect;
export type Participant = typeof participants.$inferSelect;
