import { Badge, Card, Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import { CONTACT_EMAIL, type Project } from '../content/projects';
import { LEGAL_DOCS } from '../content/legal';
import { ProjectMark } from '../components/ProjectMark';
import { Screenshots } from '../components/Screenshots';
import { CodeBlock } from '../components/CodeBlock';

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-11 font-semibold text-fg-muted uppercase">
      {children}
    </h2>
  );
}

export function ProjectPage({ project }: { project: Project }) {
  // Libraries like D3 UI have no privacy policy, terms or support page to link.
  const hasLegal = Boolean(LEGAL_DOCS[project.slug]);

  return (
    <>
      <div className="mb-8">
        <Link to="/" variant="muted" className="text-13">
          ← All projects
        </Link>
      </div>

      <header className="mb-10">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <ProjectMark project={project} size="md" />
          <h1 className="text-24 font-title text-fg">{project.name}</h1>
          <Badge>{project.status}</Badge>
        </div>
        <p className="mb-3 text-16 font-medium text-fg">{project.tagline}</p>
        <p className="max-w-prose text-14 text-fg-muted">{project.blurb}</p>

        {project.cta && (
          <a
            href={project.cta.href}
            className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-14 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {project.cta.label}
          </a>
        )}
      </header>

      {project.screenshots && project.screenshots.length > 0 && (
        <section className="mb-10" aria-labelledby="screenshots-label">
          <h2
            id="screenshots-label"
            className="mb-3 text-11 font-semibold text-fg-muted uppercase"
          >
            Screenshots
          </h2>
          <Screenshots shots={project.screenshots} />
        </section>
      )}

      <section className="mb-10">
        <SectionLabel>Platforms</SectionLabel>
        <ul className="flex flex-wrap gap-2">
          {project.platforms.map((platform) => (
            <li key={platform}>
              <Badge>{platform}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <SectionLabel>What it does</SectionLabel>
        <ul className="flex flex-col gap-2">
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 text-14 text-fg">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </section>

      {project.selfHost && (
        <section className="mb-10">
          <SectionLabel>Run it yourself</SectionLabel>
          <p className="mb-4 max-w-prose text-14 text-fg-muted">
            {project.selfHost.intro}
          </p>
          <div className="mb-4">
            <CodeBlock
              code={project.selfHost.code}
              label={`Commands to run ${project.name}`}
            />
          </div>
          <ol className="mb-4 flex flex-col gap-2">
            {project.selfHost.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-14 text-fg">
                <span className="font-mono text-13 text-accent" aria-hidden="true">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {project.selfHost.note && (
            <Card padding="md">
              <p className="text-13 text-fg-muted">{project.selfHost.note}</p>
            </Card>
          )}
        </section>
      )}

      {project.changelog && project.changelog.length > 0 && (
        <section className="mb-10">
          <SectionLabel>What’s new</SectionLabel>
          <ol className="flex flex-col gap-6">
            {project.changelog.map((release) => (
              <li key={release.version}>
                <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
                  <span className="text-14 font-semibold text-fg">
                    {release.version}
                  </span>
                  <time
                    className="font-mono text-12 text-fg-muted"
                    dateTime={release.date}
                  >
                    {new Date(`${release.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { year: 'numeric', month: 'long', day: 'numeric' },
                    )}
                  </time>
                </div>
                <p className="mb-2 text-14 text-fg">{release.summary}</p>
                <ul className="flex flex-col gap-1.5">
                  {release.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-13 text-fg-muted">
                      <span aria-hidden="true" className="select-none">
                        ·
                      </span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Card padding="lg">
        <h2 className="mb-2 text-14 font-semibold text-fg">Privacy</h2>
        <p className={`text-13 text-fg-muted ${hasLegal ? 'mb-4' : ''}`}>
          {project.privacyLine}
        </p>
        {hasLegal && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-13">
            <Link to={`/${project.slug}/privacy`}>Privacy Policy</Link>
            <Link to={`/${project.slug}/terms`}>Terms of Use</Link>
            <Link to={`/${project.slug}/support`}>Support</Link>
          </div>
        )}
      </Card>

      <p className="mt-8 text-13 text-fg-muted">
        Questions?{' '}
        <UiLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</UiLink>
      </p>
    </>
  );
}
