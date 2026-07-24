import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { Link } from '../router';
import { CONTACT_EMAIL, PROJECTS, STUDIO } from '../content/projects';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-text-primary transition-opacity hover:opacity-70"
          >
            <Logo size={26} />
            <span className="text-sm font-semibold tracking-tight">
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
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {PROJECTS.map((project) => (
              <Link
                key={project.slug}
                to={`/${project.slug}`}
                className="text-text-muted transition-colors hover:text-text-primary"
              >
                {project.name}
              </Link>
            ))}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-text-muted transition-colors hover:text-text-primary"
            >
              Contact
            </a>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            © {new Date().getFullYear()} {STUDIO}
          </p>
        </div>
      </footer>
    </div>
  );
}
