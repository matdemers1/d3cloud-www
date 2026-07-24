import { Link } from '../router';
import { CONTACT_EMAIL, type Project } from '../content/projects';

export function ProjectPage({ project }: { project: Project }) {
  return (
    <>
      <Link
        to="/"
        className="mb-8 inline-block text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← All projects
      </Link>

      <header className="mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.accent }}
            aria-hidden="true"
          />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {project.name}
          </h1>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
            {project.status}
          </span>
        </div>
        <p className="mb-4 text-lg text-text-primary">{project.tagline}</p>
        <p className="max-w-2xl text-text-muted">{project.blurb}</p>

        {project.cta && (
          <a
            href={project.cta.href}
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {project.cta.label}
          </a>
        )}
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-text-muted uppercase">
          Platforms
        </h2>
        <div className="flex flex-wrap gap-2">
          {project.platforms.map((platform) => (
            <span
              key={platform}
              className="rounded-full border border-border px-3 py-1 text-sm text-text-muted"
            >
              {platform}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-text-muted uppercase">
          What it does
        </h2>
        <ul className="flex flex-col gap-2">
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 text-text-primary">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-elevated p-6">
        <h2 className="mb-2 text-sm font-semibold">Privacy</h2>
        <p className="mb-4 text-sm text-text-muted">{project.privacyLine}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            to={`/${project.slug}/privacy`}
            className="text-accent hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            to={`/${project.slug}/terms`}
            className="text-accent hover:underline"
          >
            Terms of Use
          </Link>
          <Link
            to={`/${project.slug}/support`}
            className="text-accent hover:underline"
          >
            Support
          </Link>
        </div>
      </section>

      <p className="mt-8 text-sm text-text-muted">
        Questions?{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-accent hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </>
  );
}
