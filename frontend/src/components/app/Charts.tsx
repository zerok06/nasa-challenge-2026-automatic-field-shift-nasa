/**
 * AndenBarChart + ChartCard — web port of the native plain-View bar chart.
 * Charts always ship an accessible data table (docs/accessibility.md).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { chartColors } from '../../design/tokens';

export type BarDatum = { label: string; value: number | null; color?: string };

export function BarChart({
  data,
  formatValue = (value) => String(Math.round(value)),
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
}) {
  const { t } = useTranslation();
  const clean = data.filter(
    (item): item is { label: string; value: number; color?: string } =>
      item.value !== null && Number.isFinite(item.value),
  );

  if (clean.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t('Sin datos')}</p>;
  }

  const max = Math.max(...clean.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="space-y-3">
      {clean.map((item) => {
        const negative = item.value < 0;
        const width = Math.max(2, Math.round((Math.abs(item.value) / max) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              <span
                className={`text-sm font-semibold ${negative ? 'text-error' : 'text-foreground'}`}
              >
                {formatValue(item.value)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-3 rounded-full ${negative ? 'ml-auto' : ''}`}
                style={{
                  width: `${width}%`,
                  backgroundColor: negative
                    ? '#6E2F24'
                    : (item.color ?? chartColors.primary),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  columns,
  rows,
  children,
}: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: { label: string; values: string[] }[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
      <details className="rounded-xl border border-border">
        <summary className="min-h-12 cursor-pointer list-none px-3 py-2 text-sm font-semibold">
          {t('Ver datos')}
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                {columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${index}`} className="px-3 py-2 text-foreground">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
