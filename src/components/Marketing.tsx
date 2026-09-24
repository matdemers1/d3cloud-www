import type { ReactNode } from 'react';
import type { Project, Screenshot } from '../content/projects';
import { useNavigateOnClick } from '../router';

/**
 * The small vocabulary the marketing pages are written in (DI-ADR-006):
 * a mono kicker, a display heading, pill buttons, framed screenshots.
 * Colours and interface type are all system tokens.
 */

export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-12 tracking-label text-fg-muted uppercase ${className}`}>
      {children}
    </p>
  );
}

/** A section's number and name on the left, its display heading beside it. */
export function SectionHead({
  number,
  label,
  id,
  children,
  aside,
}: {
  number: string;
  label: string;
  id: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-24">
      <Kicker className="shrink-0 lg:w-44 lg:pt-4">
        {number} — {label}
      </Kicker>
      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <h2
          id={id}
          className="max-w-4xl font-display text-display-lg tracking-display text-fg"
        >
          {children}
        </h2>
        {aside}
      </div>
    </div>
  );
}

/** The display face's italic, in the accent — the one flourish per heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="text-accent italic">{children}</em>;
}

/** A second clause, quieter than the first. */
export function Quiet({ children }: { children: ReactNode }) {
  return <span className="text-fg-muted">{children}</span>;
}

const PILL =
  'inline-flex min-h-11 items-center justify-center rounded-full px-6 text-16 font-semibold transition-colors duration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** In-app when `to` starts with a slash and has no hash; a plain link otherwise. */
function useHref(href: string) {
  const inApp = href.startsWith('/') && !href.includes('#');
  const onClick = useNavigateOnClick(href);
  return inApp ? onClick : undefined;
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} onClick={useHref(href)} className={`${PILL} bg-fg text-bg hover:bg-fg-muted`}>
      {children}
    </a>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={useHref(href)}
      className={`${PILL} border border-border-field text-fg hover:bg-surface-hover`}
    >
      {children}
    </a>
  );
}

/** A plain in-app link styled as the site's arrow link. */
export function ArrowLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={useHref(href)}
      className={`inline-flex min-h-11 items-center text-16 font-semibold text-fg underline decoration-border-field underline-offset-4 hover:decoration-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`}
    >
      {children}
    </a>
  );
}

/** A product's colour as a dot. Decorative: its name always sits beside it. */
export function Dot({ project, size = 'md' }: { project: Project; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${size === 'sm' ? 'size-2' : 'size-2.5'}`}
      style={{ backgroundColor: project.accent }}
    />
  );
}

/** Kicker naming a product: its dot, its name and what it is. */
export function ProductKicker({ project, prefix }: { project: Project; prefix?: string }) {
  return (
    <p className="flex items-center gap-2.5 font-mono text-12 tracking-label text-fg-muted uppercase">
      <Dot project={project} />
      {prefix ? `${prefix} · ` : ''}
      {project.name} · {project.role}
    </p>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-border px-3 py-1.5 text-13 text-fg-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A desktop screenshot in a window frame. Dimensions reserve the space. */
export function BrowserFrame({ shot, eager = false }: { shot: Screenshot; eager?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface">
      <div aria-hidden="true" className="flex h-8 items-center gap-1.5 border-b border-border px-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      <img
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </figure>
  );
}

/** A phone screenshot, framed. */
export function PhoneFrame({ shot, className = '' }: { shot: Screenshot; className?: string }) {
  return (
    <img
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      loading="lazy"
      decoding="async"
      className={`h-auto rounded-lg border-4 border-surface-raised ${className}`}
    />
  );
}
