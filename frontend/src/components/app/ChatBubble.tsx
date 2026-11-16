/**
 * ChatBubble — the three shapes of the Anden conversation.
 *
 * User messages are deep-green bubbles on the right; agent answers are white
 * cards with the Anden avatar on the left; system notes (a saved draft, a
 * discarded proposal) are small muted pills in the centre. Agent answers also
 * carry the ReAct observation summary behind "Cómo llegué a esto": the farmer
 * sees the plain-language step, never the raw chain of thought or tool names.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Disclosure } from './Feedback';

/** One ReAct observation. `step` is 1-based; older APIs omit it (0). */
export type ChatTraceStep = {
  tool: string;
  status?: string;
  summary: string;
  step?: number;
};

type ChatBubbleProps =
  | { role: 'user'; text: string }
  | { role: 'note'; text: string }
  | { role: 'agent'; text: string; trace?: ChatTraceStep[]; children?: ReactNode };

/** Tool names are internal: map them to the action the agent took. */
const traceLabelKeys: Record<string, string> = {
  get_parcel_context: 'Revisé tu parcela',
  compare_rotations: 'Comparé tus planes',
  get_catalog_price_reference: 'Busqué el precio en el catálogo',
  simulate_scenario: 'Probé el cambio',
  propose_capture: 'Preparé el dato para guardar',
};

export function ChatBubble(props: ChatBubbleProps) {
  const { t } = useTranslation();

  if (props.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-base leading-6 text-white shadow-sm">
          {props.text}
        </p>
      </div>
    );
  }

  if (props.role === 'note') {
    return (
      <div className="flex justify-center">
        <p className="inline-flex max-w-[86%] items-start gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm leading-5 text-muted-foreground">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <span>{props.text}</span>
        </p>
      </div>
    );
  }

  const trace = props.trace ?? [];

  return (
    <div className="flex items-start gap-2">
      <img
        src="/img/anden-icon.png"
        alt="Anden"
        width={32}
        height={32}
        className="mt-1 h-8 w-8 shrink-0 rounded-full border border-border bg-white object-cover"
      />
      <div className="min-w-0 max-w-[86%] space-y-1.5">
        <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-3 text-base leading-6 text-foreground shadow-sm">
          {props.text}
        </p>
        {props.children}
        {trace.length > 0 ? (
          <Disclosure title={t('Cómo llegué a esto')}>
            <ol className="space-y-2">
              {trace.map((item, index) => {
                const step = item.step && item.step > 0 ? item.step : index + 1;
                const labelKey = traceLabelKeys[item.tool];
                const failed = item.status !== undefined && item.status !== 'ok';
                // A failed/skipped observation is described by its own summary,
                // never by the optimistic label of the tool that did not run.
                const label = failed || !labelKey ? item.summary : t(labelKey);
                const detail = labelKey && !failed && item.summary !== label ? item.summary : null;
                return (
                  <li key={`${step}-${item.tool}-${index}`} className="space-y-0.5">
                    <p className="text-sm font-semibold leading-5 text-foreground">
                      {t('Paso {{step}} · {{label}}', { step, label })}
                    </p>
                    {detail ? (
                      <p className="text-sm leading-5 text-muted-foreground">{detail}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Disclosure>
        ) : null}
      </div>
    </div>
  );
}
