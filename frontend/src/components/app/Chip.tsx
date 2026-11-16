/**
 * Chip + ChipBar — the horizontal "what do you need" row.
 *
 * Chips are filters/quick actions, never navigation duplicates: each one either
 * filters content or opens a distinct task.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function Chip({
  children,
  icon: Icon,
  selected = false,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-card text-foreground hover:bg-primary-50'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {Icon ? <Icon size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ChipBar({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}
