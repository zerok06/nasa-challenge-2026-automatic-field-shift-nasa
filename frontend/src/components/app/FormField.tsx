/** FormField — labelled input with hint and 48 dp target, native parity. */
import type { InputHTMLAttributes, ReactNode } from 'react';

export function FormField({
  label,
  hint,
  error,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
}) {
  const id = props.id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-warning"> *</span> : null}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        className={`min-h-12 w-full rounded-xl border bg-background px-3 py-2 text-base text-foreground placeholder:text-subtle ${
          error ? 'border-error' : 'border-border'
        } ${props.className ?? ''}`}
      />
      {hint && !error ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs leading-4 text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Decimal input used by every editor: acepta coma o punto, igual que la app. */
export function NumberField({
  label,
  hint,
  value,
  onValueChange,
  placeholder,
  suffix,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          aria-label={label}
          className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-subtle"
        />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Select with the same shape and target size as FormField. */
export function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value as T)}
        aria-label={label}
        className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Progress bar used by the intro/onboarding step indicator. */
export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-primary-100"
    >
      <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${clamped}%` }} />
    </div>
  );
}
