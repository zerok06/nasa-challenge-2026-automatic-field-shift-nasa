/**
 * AppHeader — port of the native header: "ANDEN" wordmark, subtitle and the
 * sources/settings actions. Sticky so the brand is always visible.
 */
import { ArrowLeft, FileText, Settings } from 'lucide-react';
import { AppIconButton } from './AppButton';

export function AppHeader({
  title = 'ANDEN',
  subtitle,
  onBack,
  onSources,
  onSettings,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSources?: () => void;
  onSettings?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card px-4 py-3">
      {onBack ? <AppIconButton icon={ArrowLeft} label="Volver" onClick={onBack} /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-extrabold tracking-[2px] text-primary">{title}</p>
        {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {onSources ? <AppIconButton icon={FileText} label="Fuentes y límites" onClick={onSources} tone="muted" /> : null}
      {onSettings ? <AppIconButton icon={Settings} label="Ajustes" onClick={onSettings} tone="muted" /> : null}
    </header>
  );
}
