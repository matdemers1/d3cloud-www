import type { ReactNode } from 'react';

/**
 * What a fix answers, drawn as the generic thing that annoyed its maker
 * (DI-REQ-033). Deliberately generic — no real product's UI, no name — and
 * built from system tokens so both themes work.
 */

function RainToday() {
  return (
    <div
      role="img"
      aria-label="A typical weather app: “Today: rain, 80%”. The rain starts at 11:40 PM."
      className="flex w-64 flex-col gap-1.5 rounded-lg bg-surface-raised px-6 py-5"
    >
      <span className="text-13 text-fg-muted">Today</span>
      <span className="flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-fg-muted" aria-hidden="true">
          <path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15H7z" />
          <path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" />
        </svg>
        <span className="text-24 font-semibold text-fg">Rain · 80%</span>
      </span>
      <span className="mt-1 font-mono text-12 text-warning">↳ it starts at 11:40 PM</span>
    </div>
  );
}

const QR_CELLS = [
  [1, 1], [3, 0], [3, 1], [5, 1], [0, 3], [1, 3], [3, 3], [5, 3], [6, 3], [1, 5], [3, 5], [4, 5], [6, 6],
];

function Paywall() {
  return (
    <div
      role="img"
      aria-label="A typical online QR code generator: the code is blurred, and the only button says “Start free trial to download”."
      className="flex w-80 max-w-full items-center gap-5 rounded-lg bg-surface-raised px-6 py-5"
    >
      <svg width="72" height="72" viewBox="0 0 7 7" aria-hidden="true" className="shrink-0 blur-xs">
        <rect width="7" height="7" className="fill-fg-muted" />
        {QR_CELLS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="fill-surface-raised" />
        ))}
      </svg>
      <span className="flex flex-col gap-2">
        <span className="text-14 font-semibold text-fg">Your QR code is ready</span>
        <span className="rounded-sm bg-fg-muted px-3 py-1.5 text-center text-13 text-bg">
          Start free trial to download
        </span>
      </span>
    </div>
  );
}

export const PROBLEM_ART: Record<string, () => ReactNode> = {
  clearwhen: RainToday,
  qr: Paywall,
};
