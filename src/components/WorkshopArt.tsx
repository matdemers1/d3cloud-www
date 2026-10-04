import type { ReactNode } from 'react';

/**
 * A drawing for a workshop project that has nothing public to screenshot yet, keyed by its slug.
 * Drawn in code from tokens; a project's accent appears only as a mark.
 */

// d3-allow: D3 Floorspec's identity colour, as declared in src/content/ecosystem.ts — used only to mark the proposed wall.
const FLOORSPEC_ACCENT = '#B5D84A';

/**
 * D3 Floorspec, as its plan describes it: a plan on its wall graph, and a change Claude has
 * proposed — a wall that splits the bedroom — waiting, validated, for a person to accept.
 * An illustration of the workflow, not of a screen that exists.
 */
function FloorspecPlan() {
  const wall = { className: 'stroke-fg', strokeWidth: 8, strokeLinecap: 'square' as const, fill: 'none' };
  const junction = (x: number, y: number) => <circle key={`${x}-${y}`} cx={x} cy={y} r="6" className="fill-fg" />;
  const label = (x: number, y: number, text: string) => (
    <text x={x} y={y} textAnchor="middle" className="fill-fg-muted font-sans text-13">
      {text}
    </text>
  );
  return (
    <figure className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        <svg
          viewBox="0 0 480 300"
          className="h-auto w-full lg:max-w-xl lg:flex-1"
          role="img"
          aria-label="A floor plan of three rooms — a living room, a kitchen and a bedroom — with a door swinging into the living room, and a dashed proposed wall splitting the bedroom in two."
        >
          {/* The rooms, as the faces of the wall graph. */}
          <rect x="40" y="30" width="400" height="240" className="fill-bg-sunken" />
          {/* Outer walls, with a door opening in the south wall of the living room. */}
          <path d="M120 270 H40 V30 H440 V270 H170" {...wall} />
          {/* Interior walls: they meet at a three-way junction. */}
          <path d="M220 30 V270 M220 150 H440" {...wall} />
          {/* The door: its leaf and its swing. */}
          <path d="M120 270 V220" {...wall} strokeWidth={5} />
          <path d="M120 220 A50 50 0 0 1 170 270" fill="none" className="stroke-fg-muted" strokeWidth="2" strokeDasharray="5 6" />
          {/* The proposed wall: not in the house until someone accepts it. */}
          <path d="M330 150 V270" fill="none" stroke={FLOORSPEC_ACCENT} strokeWidth="8" strokeDasharray="12 9" opacity="0.9" />
          <circle cx="330" cy="150" r="9" fill="none" stroke={FLOORSPEC_ACCENT} strokeWidth="3" />
          <circle cx="330" cy="270" r="9" fill="none" stroke={FLOORSPEC_ACCENT} strokeWidth="3" />
          {[junction(220, 150), junction(220, 30), junction(220, 270), junction(440, 150)]}
          <circle cx="120" cy="270" r="7" fill={FLOORSPEC_ACCENT} />
          {label(130, 140, 'Living')}
          {label(330, 95, 'Kitchen')}
          {label(275, 215, 'Bedroom')}
          {label(385, 215, 'Study')}
        </svg>

        <div className="flex flex-col gap-4 rounded-lg border border-border-float bg-surface-raised p-5 lg:w-80 lg:shrink-0">
          <p className="font-mono text-11 tracking-label text-fg-muted uppercase">Changeset · proposed by Claude</p>
          <p className="text-16 font-semibold text-fg">Split the bedroom to make a study</p>
          <ul className="flex flex-col gap-1.5 font-mono text-13 text-fg-muted">
            <li>+ 1 wall, between two existing junctions</li>
            <li>+ 1 room, Study</li>
            <li>~ Bedroom, made smaller</li>
          </ul>
          <p className="flex items-center gap-2 text-14 text-fg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-success" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
            Validated: no errors, no warnings
          </p>
          <div aria-hidden="true" className="flex gap-2 pt-1">
            <span className="rounded-full bg-fg px-4 py-1.5 text-14 font-semibold text-bg">Accept</span>
            <span className="rounded-full border border-border-field px-4 py-1.5 text-14 font-semibold text-fg">Reject</span>
          </div>
        </div>
      </div>
      <figcaption className="text-13 text-fg-muted">
        A drawing, not a screenshot — there is nothing to try yet. Claude proposes a change; the engine
        validates it; nothing lands in the house until you accept it.
      </figcaption>
    </figure>
  );
}

export const WORKSHOP_ART: Record<string, () => ReactNode> = {
  'floorspec-app': FloorspecPlan,
};
