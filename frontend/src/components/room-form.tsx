import { FormField } from '@/components/ui/form-field';
import {
  maxGiftDate,
  type RoomFormErrors,
  type RoomFormValues,
} from '@/hooks/use-room-form';
import { todayIso } from '@/lib/format';
import { ROOM_NAME_MAX } from '@/lib/names';
import { t } from '@/texts/es';

// Campos de la sala: nombre, día de entrega y presupuesto.
export function RoomFields({
  values,
  errors,
  set,
}: {
  values: RoomFormValues;
  errors: RoomFormErrors;
  set: (
    field: 'name' | 'giftDate' | 'budget',
  ) => (value: string, invalid?: boolean) => void;
}) {
  return (
    <>
      <FormField
        label={t.create.name}
        hint={t.create.nameHint}
        error={errors.name}
        value={values.name}
        onChange={(e) => set('name')(e.target.value)}
        maxLength={ROOM_NAME_MAX}
        showCounter
        autoComplete="off"
        required
      />
      <FormField
        label={t.create.giftDate}
        optionalLabel={t.create.optional}
        error={errors.giftDate}
        type="date"
        min={todayIso()}
        max={maxGiftDate()}
        value={values.giftDate}
        onChange={(e) => set('giftDate')(e.target.value)}
      />
      <FormField
        label={t.create.budget}
        optionalLabel={t.create.optional}
        hint={t.create.budgetHint}
        error={errors.budget}
        type="number"
        inputMode="decimal"
        min={1}
        max={1000}
        step={0.01}
        value={values.budget}
        onChange={(e) =>
          set('budget')(e.target.value, e.target.validity.badInput)
        }
        autoComplete="off"
      />
    </>
  );
}
