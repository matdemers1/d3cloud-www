import type { ReactNode } from 'react';
import { Link as UiLink } from '@d3cloud/ui';
import { Logo } from './Logo';
import { Link } from '../router';
import { CONTACT_EMAIL, PROJECTS, STUDIO } from '../content/projects';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" variant="muted" className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="text-14 font-semibold">
              Demers Design &amp; Development
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <nav
            aria-label="Projects"
            className="flex flex-wrap gap-x-6 gap-y-2 text-14"
          >
            {PROJECTS.map((project) => (
              <Link key={project.slug} to={`/${project.slug}`} variant="muted">
                {project.name}
              </Link>
            ))}
            <UiLink href={`mailto:${CONTACT_EMAIL}`} variant="muted">
              Contact
            </UiLink>
          </nav>
          <p className="mt-4 text-12 text-fg-muted">
            © {new Date().getFullYear()} {STUDIO}
          </p>
        </div>
      </footer>
    </div>
  );
}
