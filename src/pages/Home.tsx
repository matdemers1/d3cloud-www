import { Link } from '../router';
import { PROJECTS } from '../content/projects';

export function Home() {
  return (
    <>
      <section className="mb-14">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Independent software studio building privacy-first everyday tools.
        </h1>
        <p className="max-w-2xl text-base text-text-muted sm:text-lg">
          Small, useful apps that do one thing properly. No accounts, no ads, no
          analytics, and no tracking — not as a feature, just as how they are
          built.
        </p>
      </section>

      <section>
        <h2 className="mb-5 text-xs font-semibold tracking-widest text-text-muted uppercase">
          Projects
        </h2>
        <ul className="flex flex-col gap-4">
          {PROJECTS.map((project) => (
            <li key={project.slug}>
              <Link
                to={`/${project.slug}`}
                className="group block rounded-xl border border-border bg-elevated p-6 transition-colors hover:border-accent"
              >
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.accent }}
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-semibold tracking-tight">
                    {project.name}
                  </h3>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    {project.status}
                  </span>
                </div>
                <p className="mb-3 text-text-primary">{project.tagline}</p>
                <p className="text-sm text-text-muted">{project.privacyLine}</p>
                <span className="mt-4 inline-block text-sm text-accent group-hover:underline">
                  Learn more →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
