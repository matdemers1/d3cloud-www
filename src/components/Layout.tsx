import type { ReactNode } from 'react';
import { ThemeSwitch } from '@d3cloud/ui';
import { Logo } from './Logo';
import { Kicker } from './Marketing';
import { useNavigateOnClick } from '../router';
import { BRAND, CONTACT_EMAIL, PROJECTS, STUDIO, type Project } from '../content/projects';

const NAV = [
  { href: '/#what', label: 'What this is' },
  { href: '/#ecosystem', label: 'Ecosystem' },
  { href: '/#fixes', label: 'Fixes' },
  { href: '/#log', label: 'Build log' },
  { href: '/#studio', label: 'Studio' },
];

const FOCUS =
  'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

function InAppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={to} onClick={useNavigateOnClick(to)} className={className}>
      {children}
    </a>
  );
}

function Header({ project }: { project?: Project }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <InAppLink to="/" className={`flex items-center gap-3 text-fg ${FOCUS}`}>
            <Logo size={30} star={project?.accent} label={false} />
            <span className="text-16 font-semibold whitespace-nowrap">{BRAND}</span>
          </InAppLink>
          {project && (
            <>
              <span aria-hidden="true" className="hidden text-fg-faint sm:inline">
                /
              </span>
              <span className="hidden truncate text-16 text-fg-muted sm:inline">{project.name}</span>
            </>
          )}
        </div>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-14 text-fg-muted">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={`hover:text-fg ${FOCUS}`}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeSwitch size="sm" />
          <details className="relative lg:hidden">
            <summary
              className={`flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border-field text-fg ${FOCUS}`}
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </summary>
            <nav
              aria-label="Menu"
              className="absolute right-0 mt-2 w-56 rounded-lg border border-border-float bg-surface-raised p-2"
            >
              <ul className="flex flex-col">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={`flex min-h-11 items-center rounded-md px-3 text-14 text-fg hover:bg-surface-hover ${FOCUS}`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <Kicker className="text-11">{title}</Kicker>
      <ul className="flex flex-col gap-2 text-14">{children}</ul>
    </div>
  );
}

function Footer() {
  const link = `text-fg-muted hover:text-fg ${FOCUS}`;
  return (
    <footer className="border-t border-border bg-bg-sunken">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-14 sm:px-8 lg:flex-row lg:justify-between lg:px-24">
        <div className="flex max-w-sm flex-col gap-4">
          <span className="flex items-center gap-3 text-fg">
            <Logo size={28} label={false} />
            <span className="text-16 font-semibold">{BRAND}</span>
          </span>
          <p className="text-14 text-fg-muted">
            No analytics on this site. Not a cookie banner — a content security policy that won’t
            let a tracker load.
          </p>
          <p className="text-12 text-fg-muted">
            © {new Date().getFullYear()} {STUDIO}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
          <FooterColumn title="Ecosystem">
            {PROJECTS.filter((p) => p.kind === 'ecosystem').map((p) => (
              <li key={p.slug}>
                <InAppLink to={`/${p.slug}`} className={link}>
                  {p.name}
                </InAppLink>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Fixes">
            {PROJECTS.filter((p) => p.kind === 'fix').map((p) => (
              <li key={p.slug}>
                <InAppLink to={`/${p.slug}`} className={link}>
                  {p.name}
                </InAppLink>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title="Studio">
            <li>
              <a href="/#log" className={link}>
                Build log
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                Contact
              </a>
            </li>
            <li>
              <a href="https://github.com/matdemers1" className={link}>
                GitHub
              </a>
            </li>
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children, project }: { children: ReactNode; project?: Project }) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg"
      >
        Skip to content
      </a>
      <Header project={project} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
