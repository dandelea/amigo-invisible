import type { Room } from '@/api/types';
import { formatBudget, formatShortDate } from '@/lib/format';
import { t } from '@/texts/es';

// «Entrega: 20 dic 2026 · hasta 15 €» (o solo lo que tenga la sala).
export function roomSummary(room: Room): string {
  return t.room.summary(
    room.giftDate ? formatShortDate(room.giftDate) : null,
    room.budget != null ? formatBudget(room.budget) : null,
  );
}
