import type { CSSProperties, ReactNode } from 'react';
import { Kicker, WRAP } from './Marketing';

/**
 * The vocabulary a product's deep dive is written in (DI-REQ-039): numbered
 * sections that can be linked to, an index to jump between them, and a few
 * chart marks. Each product arranges these its own way — the parts are shared
 * so the pages still read as one site.
 *
 * Every colour is a system token, except a product's own accent, which arrives
 * as data and is applied inline — the same way `Dot` applies it.
 */

export interface DeepEntry {
  id: string;
  label: string;
}

/** A sticky row of jump links under the hero. Scrolls sideways on a phone. */
export function DeepIndex({ entries, accent }: { entries: DeepEntry[]; accent: string }) {
  return (
    <nav
      aria-label="On this page"
      className="sticky top-18 z-20 border-y border-border bg-bg/85 backdrop-blur-md"
    >
      <ol className={`${WRAP} flex gap-1 overflow-x-auto py-2 text-13 whitespace-nowrap`}>
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="flex min-h-11 items-center gap-2 rounded-full px-3 text-fg-muted hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />
              <span aria-hidden="true" className="font-mono text-11 text-fg-faint">
                {String(index + 1).padStart(2, '0')}
              </span>
              {entry.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * One numbered section of a deep dive: a mono code, a display heading, a lede,
 * then the drawing at full width. `code` reads like the product's own IDs.
 */
export function DeepSection({
  id,
  code,
  label,
  title,
  lede,
  children,
  sunken = false,
}: {
  id: string;
  code: string;
  label: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  sunken?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-32 ${sunken ? 'border-y border-border bg-bg-sunken' : ''}`}
    >
      <div className={`${WRAP} flex flex-col gap-12 py-20 lg:py-28`}>
        <div className="flex flex-col gap-5 lg:max-w-4xl">
          <Kicker>
            {code} — {label}
          </Kicker>
          <h2 id={`${id}-title`} className="font-display text-display-lg tracking-display text-fg">
            {title}
          </h2>
          {lede && <p className="max-w-3xl text-16 text-fg-muted sm:text-20">{lede}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** A figure with a caption that says what is drawn, and where the numbers come from. */
export function Figure({ caption, children, className = '' }: { caption: ReactNode; children: ReactNode; className?: string }) {
  return (
    <figure className={`flex flex-col gap-4 ${className}`}>
      {children}
      <figcaption className="text-13 text-fg-muted">{caption}</figcaption>
    </figure>
  );
}

/** A big number and what it counts. */
export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-stat text-fg">{value}</span>
      <span className="text-14 text-fg-muted">{label}</span>
    </div>
  );
}

/** One row of a horizontal bar chart. `fraction` is 0–1 of the track. */
export function BarRow({
  label,
  value,
  fraction,
  accent,
  muted = false,
  note,
}: {
  label: ReactNode;
  value: ReactNode;
  fraction: number;
  accent: string;
  muted?: boolean;
  note?: ReactNode;
}) {
  const fill: CSSProperties = muted ? {} : { backgroundColor: accent };
  // Phone: label and value on one line, the bar under them. Wider: label, bar, value in a row.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)_3.5rem]">
      <span className="text-14 text-fg sm:col-start-1 sm:row-start-1">{label}</span>
      <span className="font-mono text-14 text-fg sm:col-start-3 sm:row-start-1 sm:text-right">{value}</span>
      <span className="col-span-2 h-3 overflow-hidden rounded-full bg-surface-raised sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <span
          className={`bar block h-full rounded-full ${muted ? 'bg-fg-faint' : ''}`}
          style={{ ...fill, width: `${Math.max(fraction, 0.01) * 100}%` }}
        />
      </span>
      {note && <span className="col-span-2 text-13 text-fg-muted sm:col-span-2 sm:col-start-2">{note}</span>}
    </div>
  );
}

/** A vertical connector with a dot travelling down it: "this flows into that". */
export function FlowDown({ accent, className = '' }: { accent: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`relative mx-auto block h-10 w-px bg-border-field ${className}`}>
      <span
        className="flow-y absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </span>
  );
}
