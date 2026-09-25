import type { ReactNode } from 'react';

/**
 * A drawing for a workshop project that has nothing public to screenshot yet.
 * Shipyard's is its own deploy sequence, step for step as its README states
 * it: the agent's own checks, then the swap, then the proof, with the images
 * rolled back if any step after the checks fails.
 */

const CHECKS = ['CI passed', 'On main', 'Newer than live', 'Images in GHCR'];
const STEPS = ['Back up', 'Migrate', 'Swap to digest', 'Check digest, revision, schema', 'Soak'];

function Step({ children, tone }: { children: ReactNode; tone: 'check' | 'step' }) {
  return (
    <li
      className={`flex min-h-11 items-center gap-2.5 rounded-md px-3.5 py-2 text-14 ${
        tone === 'check'
          ? 'border border-dashed border-border-field text-fg-muted'
          : 'border border-border bg-surface-raised text-fg'
      }`}
    >
      {tone === 'check' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : null}
      {children}
    </li>
  );
}

function ShipyardSequence() {
  return (
    <figure className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 sm:p-8">
      <figcaption className="font-mono text-12 tracking-label text-fg-muted uppercase">
        One deploy, as the agent runs it
      </figcaption>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-3 lg:w-64 lg:shrink-0">
          <p className="text-13 font-semibold text-fg">1 · It checks, itself</p>
          <ol className="flex flex-col gap-2">
            {CHECKS.map((check) => (
              <Step key={check} tone="check">
                {check}
              </Step>
            ))}
          </ol>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-13 font-semibold text-fg">2 · Then it deploys, and proves it</p>
          <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {STEPS.map((step, index) => (
              <Step key={step} tone="step">
                <span className="font-mono text-12 text-fg-muted">{index + 1}</span>
                {step}
              </Step>
            ))}
          </ol>
          <p className="mt-1 flex items-start gap-2.5 rounded-md border border-dashed border-warning px-3.5 py-2.5 text-14 text-fg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-warning" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            If any step fails, the images roll back on their own. Restoring data is always a
            person’s decision.
          </p>
        </div>
      </div>
    </figure>
  );
}

export const WORKSHOP_ART: Record<string, () => ReactNode> = {
  shipyard: ShipyardSequence,
};
