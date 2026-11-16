/** ProgressRing — the ficha completion percentage, without the badge look. */
export function ProgressRing({
  value,
  size = 56,
  label,
}: {
  value: number;
  size?: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <span
      role="img"
      aria-label={`${label}: ${clamped}%`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#DFF0E2"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1B5E20"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xs font-bold text-primary">{clamped}%</span>
    </span>
  );
}
