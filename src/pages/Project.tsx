import { Link as UiLink } from '@d3cloud/ui';
import { Link, useNavigateOnClick } from '../router';
import { CONTACT_EMAIL, PROJECTS, type Project } from '../content/projects';
import { LEGAL_DOCS } from '../content/legal';
import { connectionsOf, edges } from '../content/ecosystem';
import { Screenshots } from '../components/Screenshots';
import { CodeBlock } from '../components/CodeBlock';
import { PROBLEM_ART } from '../components/FixProblems';
import {
  Band,
  Chips,
  Dot,
  PrimaryButton,
  SecondaryButton,
  WRAP,
} from '../components/Marketing';

function Hero({ project }: { project: Project }) {
  return (
    <section aria-labelledby="product-title" className="relative overflow-hidden">
      <div className={`${WRAP} flex flex-col gap-7 pt-16 pb-16 lg:pt-24`}>
        <p className="flex animate-rise items-center gap-2.5 font-mono text-12 tracking-label text-fg-muted uppercase">
          <Dot project={project} />
          {project.kind === 'fix' ? 'A fix' : 'The ecosystem'} · {project.role} ·{' '}
          {project.status}
        </p>
        <h1
          id="product-title"
          className="stagger-1 animate-rise font-display text-display-xl tracking-display text-fg"
        >
          {project.name}
        </h1>
        <p className="stagger-2 max-w-3xl animate-rise font-display text-display-sm text-fg">
          {project.tagline}
        </p>
        <p className="stagger-2 max-w-2xl animate-rise text-16 text-fg-muted sm:text-20">
          {project.blurb}
        </p>
        <div className="stagger-3 flex animate-rise flex-wrap items-center gap-3 pt-2">
          {project.cta && <PrimaryButton href={project.cta.href}>{project.cta.label}</PrimaryButton>}
          {project.selfHost && <SecondaryButton href="#section-run-it-yourself">Run it yourself</SecondaryButton>}
        </div>
        <div className="stagger-4 animate-rise">
          <Chips items={project.platforms} />
        </div>
      </div>

      {project.screenshots && project.screenshots.length > 0 && (
        <div className={`${WRAP} pb-16`}>
          <h2 className="sr-only">Screenshots</h2>
          <Screenshots shots={project.screenshots} />
        </div>
      )}
    </section>
  );
}

function Constellation({ project }: { project: Project }) {
  const connections = connectionsOf(project.slug);
  const colour = (type: string) => edges().find((e) => e.type === type)?.to.accent;
  return (
    <Band label="In the constellation" title={connections.length ? 'How it connects.' : 'It stands on its own.'}>
      {connections.length === 0 ? (
        <p className="max-w-2xl text-16 text-fg-muted">
          No account, no server, nothing to sign into — a fix that needs nothing else.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {connections.map((connection) => (
            <li key={`${connection.other.slug}-${connection.type}`}>
              <Link
                to={`/${connection.other.slug}`}
                variant="muted"
                className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-6 no-underline hover:bg-surface-hover"
              >
                <span className="flex items-center gap-3">
                  <svg aria-hidden="true" width="22" height="4" viewBox="0 0 22 4">
                    <line
                      x1="1"
                      y1="2"
                      x2="21"
                      y2="2"
                      stroke={colour(connection.type)}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={connection.type === 'planned-in' ? '3 4' : undefined}
                    />
                  </svg>
                  <span className="text-16 font-semibold text-fg">{connection.other.name}</span>
                </span>
                <span className="text-14 text-fg-muted">{connection.text}.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Band>
  );
}

export function ProjectPage({ project }: { project: Project }) {
  // Libraries like D3 UI have no privacy policy, terms or support page to link.
  const hasLegal = Boolean(LEGAL_DOCS[project.slug]);
  const Art = PROBLEM_ART[project.slug];
  const next = PROJECTS[(PROJECTS.indexOf(project) + 1) % PROJECTS.length];
  const goNext = useNavigateOnClick(`/${next.slug}`);

  return (
    <>
      <Hero project={project} />

      {project.problem && (
        <Band label="The problem" title="Why it exists." sunken>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
            {Art && <Art />}
            <p className="max-w-xl text-16 text-fg sm:text-20">{project.problem}</p>
          </div>
        </Band>
      )}

      <Band label="What it does" title={project.headline} sunken={!project.problem}>
        <ul className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          {project.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-3 text-16 text-fg">
              <span
                aria-hidden="true"
                className="mt-2 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: project.accent }}
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </Band>

      {project.selfHost && (
        <Band label="Run it yourself" title="Runs on your machine." sunken>
          {/* Stacked, not side by side: this column is too narrow for prose and
              a command block to share, and a squeezed block hides the commands. */}
          <div className="flex max-w-3xl flex-col gap-8">
            <p className="text-16 text-fg-muted">{project.selfHost.intro}</p>
            <CodeBlock code={project.selfHost.code} label={`Commands to run ${project.name}`} />
            <ol className="flex flex-col gap-3">
              {project.selfHost.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-16 text-fg">
                  <span className="font-mono text-14 text-accent" aria-hidden="true">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {project.selfHost.note && (
              <p className="rounded-lg border border-border-field p-4 text-14 text-fg-muted">
                {project.selfHost.note}
              </p>
            )}
          </div>
        </Band>
      )}

      <Constellation project={project} />

      {project.changelog && project.changelog.length > 0 && (
        <Band label="What’s new" title="Release notes." sunken>
          <ol className="flex flex-col gap-10 border-l border-border-field pl-7">
            {project.changelog.map((release) => (
              <li key={release.version} className="relative flex flex-col gap-2">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-9 size-3 rounded-full border-2 border-bg-sunken"
                  style={{ backgroundColor: project.accent }}
                />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-16 font-semibold text-fg">{release.version}</span>
                  <time className="font-mono text-12 text-fg-muted" dateTime={release.date}>
                    {new Date(`${release.date}T00:00:00`).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <p className="text-16 text-fg">{release.summary}</p>
                <ul className="flex max-w-3xl flex-col gap-1.5">
                  {release.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-14 text-fg-muted">
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
        </Band>
      )}

      <Band label="Privacy">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="text-16 text-fg">{project.privacyLine}</p>
          {hasLegal && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-14">
              <Link to={`/${project.slug}/privacy`}>Privacy Policy</Link>
              <Link to={`/${project.slug}/terms`}>Terms of Use</Link>
              <Link to={`/${project.slug}/support`}>Support</Link>
            </div>
          )}
          <p className="text-14 text-fg-muted">
            Questions? <UiLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</UiLink>
          </p>
        </div>
      </Band>

      <section aria-label="Next" className="border-t border-border">
        <div className={`${WRAP} flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between`}>
          <a
            href={`/${next.slug}`}
            onClick={goNext}
            className="flex items-center gap-4 rounded-sm font-display text-display-sm text-fg hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Dot project={next} />
            Next star: {next.name} →
          </a>
          <SecondaryButton href="/">Back to the ecosystem</SecondaryButton>
        </div>
      </section>
    </>
  );
}
