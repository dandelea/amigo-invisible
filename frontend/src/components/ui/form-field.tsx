import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pill } from './pill';

interface FormFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  // Muestra la etiqueta «Opcional» junto al título.
  optionalLabel?: string;
  // Muestra el contador «n/max» con la longitud del valor actual.
  showCounter?: boolean;
}

// Campo de formulario de los mockups: etiqueta, contador u «Opcional»,
// campo de 48 px, ayuda y error accesible.
export function FormField({
  label,
  hint,
  error,
  optionalLabel,
  showCounter,
  className,
  value,
  maxLength,
  ...inputProps
}: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;
  const length = typeof value === 'string' ? Array.from(value).length : 0;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2.5">
        <label htmlFor={id}>{label}</label>
        {optionalLabel && <Pill>{optionalLabel}</Pill>}
        {showCounter && maxLength && (
          <span
            className="text-[13px] text-muted-foreground"
            aria-hidden="true"
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-12 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          error && 'border-2 border-destructive',
        )}
        {...inputProps}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-[13px] font-semibold text-destructive"
        >
          <CircleAlert aria-hidden="true" className="mt-px size-4 flex-none" />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
