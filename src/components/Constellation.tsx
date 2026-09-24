import type { CSSProperties } from 'react';
import { PROJECTS, projectBySlug, type Project } from '../content/projects';
import { WORKSHOP, edges, type Edge } from '../content/ecosystem';

/**
 * The ecosystem drawn as a sky: every project a star at its declared position,
 * every declared relation a line (DI-REQ-030). Lines live in an SVG stretched to
 * the box; stars are HTML so they stay round at any aspect ratio, and so the
 * interactive map's stars can be real buttons.
 */

/** Faint background stars. Fixed, so the sky does not reshuffle on every render. */
const DUST: [number, number, number][] = [
  [6, 9, 1], [19, 4, 2], [41, 11, 3], [59, 6, 1], [94, 12, 2], [97, 31, 3],
  [4, 52, 2], [34, 64, 1], [70, 59, 3], [95, 87, 1], [31, 94, 2], [9, 88, 3],
  [62, 39, 1], [39, 39, 2], [81, 97, 3], [55, 18, 2], [14, 22, 1], [88, 52, 1],
];

const DUST_ANIMATION = ['', 'animate-twinkle', 'animate-twinkle stagger-2', 'animate-twinkle stagger-4'];

function lineStyle(edge: Edge): { stroke: string; dashed: boolean } {
  // A line takes the colour of the project it depends on — D3 Auth's violet
  // for sign-in, D3 UI's lilac for the design system, Foreman's coral, dashed,
  // for planning — so the legend is the stars themselves.
  return { stroke: edge.to.accent, dashed: edge.type === 'planned-in' };
}

interface ConstellationProps {
  /** Which star is selected; its lines light, the rest dim. */
  selected?: string;
  /** Present only on the interactive map: stars become buttons. */
  onSelect?: (slug: string) => void;
  /** The dim, unnamed stars of work on the bench. */
  showWorkshop?: boolean;
  /** Gentle whole-sky drift, and lines fading in one by one on load. */
  animated?: boolean;
  className?: string;
}

export function Constellation({
  selected,
  onSelect,
  showWorkshop = false,
  animated = true,
  className = '',
}: ConstellationProps) {
  const all = edges();
  const touches = (edge: Edge) =>
    edge.from.slug === selected || edge.to.slug === selected;
  const near = new Set<string>(selected ? [selected] : []);
  for (const edge of all) {
    if (edge.from.slug === selected) near.add(edge.to.slug);
    if (edge.to.slug === selected) near.add(edge.from.slug);
  }
  const interactive = Boolean(onSelect);
  // The caller may place the sky absolutely; otherwise it is the containing block.
  const position = /\babsolute\b/.test(className) ? '' : 'relative';

  return (
    <div className={`${position} ${className}`}>
      {DUST.map(([x, y, kind]) => (
        <span
          key={`${x}-${y}`}
          aria-hidden="true"
          className={`absolute size-0.5 rounded-full bg-fg-muted ${DUST_ANIMATION[kind]}`}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}

      <div className={`absolute inset-0 ${animated ? 'animate-drift' : ''}`}>
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
        >
          {showWorkshop &&
            WORKSHOP.map((item) => {
              const to = projectBySlug(item.near);
              if (!to) return null;
              return (
                <line
                  key={item.name}
                  x1={item.star.x}
                  y1={item.star.y}
                  x2={to.star.x}
                  y2={to.star.y}
                  className="stroke-fg-faint"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          {all.map((edge, index) => {
            const { stroke, dashed } = lineStyle(edge);
            const lit = !selected || touches(edge);
            return (
              <line
                key={`${edge.from.slug}-${edge.to.slug}-${edge.type}`}
                x1={edge.from.star.x}
                y1={edge.from.star.y}
                x2={edge.to.star.x}
                y2={edge.to.star.y}
                stroke={stroke}
                strokeWidth={lit && selected ? 2 : 1.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={dashed ? '3 5' : undefined}
                className={`transition-opacity duration-3 ${animated ? 'animate-appear' : ''}`}
                style={{
                  opacity: lit ? (dashed ? 0.75 : 0.9) : 0.1,
                  animationDelay: animated ? `${0.2 + index * 0.12}s` : undefined,
                }}
              />
            );
          })}
        </svg>

        {showWorkshop &&
          WORKSHOP.map((item) => (
            <span
              key={item.name}
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-fg-faint"
              style={{ left: `${item.star.x}%`, top: `${item.star.y}%` }}
            />
          ))}

        {PROJECTS.map((project) => (
          <Star
            key={project.slug}
            project={project}
            selected={project.slug === selected}
            dimmed={Boolean(selected) && !near.has(project.slug)}
            onSelect={onSelect}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
}

function Star({
  project,
  selected,
  dimmed,
  interactive,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  dimmed: boolean;
  interactive: boolean;
  onSelect?: (slug: string) => void;
}) {
  const position: CSSProperties = { left: `${project.star.x}%`, top: `${project.star.y}%` };
  // The halo and the dot are the product's own colour — its identity, as on
  // every other surface that shows it.
  const glow: CSSProperties = { backgroundColor: project.accent };
  // Labels sit left of stars near the right edge, so none runs off the sky.
  const labelLeft = project.star.x > 70;

  const body = (
    <>
      <span className="relative flex size-6 items-center justify-center">
        <span className="absolute inset-0 rounded-full opacity-20" style={glow} />
        {selected && (
          <span className="absolute inset-1 animate-halo rounded-full opacity-60" style={glow} />
        )}
        <span
          className={`relative rounded-full transition-all duration-3 ${selected ? 'size-4' : 'size-3'}`}
          style={glow}
        />
      </span>
      <span
        className={`font-mono text-11 tracking-label whitespace-nowrap uppercase ${
          selected ? 'text-fg' : 'text-fg-muted'
        } ${labelLeft ? 'order-first' : ''}`}
      >
        {project.name}
      </span>
    </>
  );

  // Put the dot's centre on the point: half the 1.5rem dot box, plus the
  // button's padding when it is one.
  const offset = interactive
    ? labelLeft
      ? '-translate-x-[calc(100%-1rem)]'
      : '-translate-x-4'
    : labelLeft
      ? '-translate-x-[calc(100%-0.75rem)]'
      : '-translate-x-3';
  const place = `absolute flex items-center gap-2 -translate-y-1/2 ${offset} transition-opacity duration-3 ${dimmed ? 'opacity-40' : 'opacity-100'}`;

  if (!interactive) {
    return (
      <span aria-hidden="true" className={place} style={position}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(project.slug)}
      className={`${place} cursor-pointer rounded-full p-1 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      style={position}
    >
      {body}
    </button>
  );
}
