import type { ReactNode } from 'react';
import { Logo } from './Logo';

/**
 * The product marks (DI-REQ-040), as chosen on the Brand & Site Concepts canvas
 * on 2026-09-25: every product keeps the planisphere's ring, so membership of
 * D3 Cloud reads at a glance. Inside it, the same rules — ink lines, round
 * joints, stars where lines meet, and exactly one lit star in the product's
 * own colour.
 *
 * Ink is `currentColor`, so a mark takes the text colour in either theme. The
 * star is the only colour, and it comes from the project's `accent`.
 */

interface Ink {
  /** Line weight: heavier at icon sizes, finer at display sizes. */
  w: number;
  /** Radius of a joint star. */
  r: number;
}

interface MarkShape {
  /** The concept's name, from the canvas. */
  concept: string;
  /** Everything inside the ring but the lit star. */
  lines: (ink: Ink) => ReactNode;
  /** Where the lit star sits. */
  star: { x: number; y: number };
}

const joint = (x: number, y: number, ink: Ink) => (
  <circle key={`${x}-${y}`} cx={x} cy={y} r={ink.r} fill="currentColor" />
);

const stroke = (ink: Ink) => ({
  stroke: 'currentColor',
  strokeWidth: ink.w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const MARKS: Record<string, MarkShape> = {
  auth: {
    concept: 'Keyhole',
    lines: (ink) => (
      <>
        <circle cx="32" cy="25" r="7.5" {...stroke(ink)} />
        <path d="M28.5 31.5 L25 45 L39 45 L35.5 31.5" {...stroke(ink)} />
        {joint(25, 45, ink)}
        {joint(39, 45, ink)}
      </>
    ),
    star: { x: 32, y: 25 },
  },
  ui: {
    concept: 'Compass',
    lines: (ink) => (
      <>
        <path d="M32 13 L51 32 L32 51 L13 32 Z" {...stroke(ink)} />
        {joint(51, 32, ink)}
        {joint(32, 51, ink)}
        {joint(13, 32, ink)}
      </>
    ),
    star: { x: 32, y: 13 },
  },
  shipyard: {
    concept: 'Lift-off',
    lines: (ink) => (
      <>
        <path d="M18 47 Q21 27 45 18" {...stroke(ink)} />
        {joint(18, 47, ink)}
        {joint(25.5, 29, ink)}
      </>
    ),
    star: { x: 45, y: 18 },
  },
  foreman: {
    concept: 'True north',
    lines: (ink) => (
      <>
        <path d="M32 12 L38 32 L32 52 L26 32 Z" {...stroke(ink)} />
        {joint(32, 52, ink)}
      </>
    ),
    star: { x: 32, y: 12 },
  },
  bindery: {
    concept: 'Dog-ear',
    lines: (ink) => (
      <>
        <path d="M21 13 L37 13 L45 21 L45 51 L21 51 Z M37 13 L37 21 L45 21" {...stroke(ink)} />
        <path
          d="M26 30 L39 30 M26 38 L36 38"
          {...stroke({ ...ink, w: ink.w * 0.75 })}
          strokeDasharray="2.5 3.5"
          opacity="0.8"
        />
        {joint(21, 13, ink)}
        {joint(21, 51, ink)}
        {joint(45, 51, ink)}
      </>
    ),
    star: { x: 37, y: 21 },
  },
  // Chosen over Postmark (a letter with a wavy cancellation, too busy at 18px) and Sorted (a rack
  // of pigeonholes, which read as a window): the envelope reads as mail at every size. Joints sit
  // where the flap meets the body; the lit star is where the flap points.
  postroom: {
    concept: 'Envelope',
    lines: (ink) => (
      <>
        <path d="M17 22 H47 V44 H17 Z" {...stroke(ink)} />
        <path d="M17 22 L32 34.5 L47 22" {...stroke(ink)} />
        {joint(17, 22, ink)}
        {joint(47, 22, ink)}
      </>
    ),
    star: { x: 32, y: 34.5 },
  },
  // The standard: a three-room plan reduced to its wall graph, because in Floorspec the graph is the
  // truth and rooms are derived from it. Joints are where walls meet the outer wall; the lit star is
  // the three-way junction where the interior walls meet — the kind of point the spec computes exactly.
  floorspec: {
    concept: 'Junction',
    lines: (ink) => (
      <>
        <path d="M19 21 H45 V43 H19 Z" {...stroke(ink)} />
        <path d="M30 21 V43 M30 32 H45" {...stroke(ink)} />
        {joint(30, 43, ink)}
        {joint(45, 32, ink)}
      </>
    ),
    star: { x: 30, y: 32 },
  },
  // The app: the same plan language, now something you edit — a room with a door in its south wall,
  // its swing dashed like a proposal. The lit star is the hinge, the point everything turns on.
  'floorspec-app': {
    concept: 'Door swing',
    lines: (ink) => (
      <>
        <path d="M24 43 H19 V21 H45 V43 H38" {...stroke(ink)} />
        <path d="M24 43 V29" {...stroke(ink)} />
        <path
          d="M24 29 A14 14 0 0 1 38 43"
          {...stroke({ ...ink, w: ink.w * 0.75 })}
          strokeDasharray="2.5 3.5"
          opacity="0.8"
        />
        {joint(19, 21, ink)}
        {joint(45, 43, ink)}
      </>
    ),
    star: { x: 24, y: 43 },
  },
};

/**
 * A product with no mark of its own yet. Clearwhen ships an App Store icon,
 * and that is its mark; D3 QR falls back to the planisphere with its star lit.
 */
const ICONS: Record<string, string> = {
  clearwhen: '/marks/clearwhen.webp',
};

interface ProductMarkProps {
  slug: string;
  accent: string;
  size?: number;
  /** The accessible name. Pass false where the product's name sits beside it. */
  label?: string | false;
  /** A soft halo behind the lit star — for display sizes only. */
  halo?: boolean;
  className?: string;
}

export function ProductMark({ slug, accent, size = 32, label = false, halo = false, className }: ProductMarkProps) {
  const icon = ICONS[slug];
  if (icon) {
    return (
      <img
        src={icon}
        alt={label || ''}
        width={size}
        height={size}
        className={`shrink-0 rounded-lg ${className ?? ''}`}
        decoding="async"
      />
    );
  }

  const mark = MARKS[slug];
  if (!mark) return <Logo size={size} star={accent} label={label} className={className} />;

  // The canvas drew two weights: 4 at icon size, 2.2 at display size.
  const ink: Ink = size >= 72 ? { w: 2.2, r: 2.6 } : { w: 3.5, r: 3.4 };
  const lit = size >= 72 ? 4.4 : 5.5;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 ${className ?? ''}`}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="32" cy="32" r="26" {...stroke(ink)} />
      {mark.lines(ink)}
      {halo && <circle cx={mark.star.x} cy={mark.star.y} r="8.4" style={{ fill: accent }} opacity="0.18" />}
      <circle
        cx={mark.star.x}
        cy={mark.star.y}
        r={lit}
        style={{ fill: accent }}
        className={halo ? 'animate-twinkle' : undefined}
      />
    </svg>
  );
}
