import { CONTACT_EMAIL, PROJECTS, projectBySlug, type Project } from '../content/projects';
import {
  BUILD_LOG,
  WORKSHOP,
  ecosystemProjects,
  edges,
  fixProjects,
  type WorkshopItem,
} from '../content/ecosystem';
import { Constellation } from '../components/Constellation';
import { EcosystemMap } from '../components/EcosystemMap';
import { PROBLEM_ART } from '../components/FixProblems';
import {
  Accent,
  ArrowLink,
  BrowserFrame,
  Chips,
  Kicker,
  PhoneFrame,
  PrimaryButton,
  ProductKicker,
  Quiet,
  SecondaryButton,
  SectionHead,
} from '../components/Marketing';
import { useNavigateOnClick } from '../router';

/** The width every section lays out in. */
const WRAP = 'mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-16 xl:px-24';

const PROMISES = [
  'No ads',
  'No analytics',
  'No tracking',
  'Self-hostable',
  'Apache-2.0',
  'Built in the open',
  'Nothing phones home',
  'Axe-clean, both themes',
];

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className={`${WRAP} grid items-center gap-10 pt-16 pb-20 lg:grid-cols-2 lg:gap-0 lg:pt-24 lg:pb-28`}>
        <div className="relative z-10 flex flex-col gap-7">
          <p className="animate-rise font-mono text-12 tracking-label text-accent uppercase">
            Independent software · built in the open
          </p>
          <h1
            id="hero-title"
            className="stagger-1 animate-rise font-display text-display-xl tracking-display text-fg"
          >
            Software you
            <br />
            get to <Accent>keep.</Accent>
          </h1>
          <p className="stagger-2 max-w-xl animate-rise text-16 text-fg-muted sm:text-20">
            D3 Cloud is two kinds of software: self-hostable tools that work together — one sign-in,
            one design language, one plan of record — and small apps that each fix one thing that
            bugged me.
          </p>
          <div className="stagger-3 flex animate-rise flex-wrap gap-3 pt-2">
            <PrimaryButton href="#ecosystem">Explore the ecosystem</PrimaryButton>
            <SecondaryButton href="#fixes">See the fixes →</SecondaryButton>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-xl lg:max-w-none lg:translate-x-8">
          {/* The planisphere's rings, behind the sky. */}
          <div aria-hidden="true" className="absolute inset-[4%] rounded-full border border-border" />
          <div aria-hidden="true" className="absolute inset-[16%] rounded-full border border-dashed border-border" />
          <Constellation showWorkshop className="absolute inset-[10%]" />
        </div>
      </div>
    </section>
  );
}

function Promises() {
  const row = PROMISES.flatMap((promise) => [promise, '✦']);
  return (
    <section
      aria-label="What every product promises"
      className="overflow-hidden border-y border-border bg-bg-sunken py-5"
    >
      {/* The list is read once; the moving copy beside it is decoration. */}
      <ul className="sr-only">
        {PROMISES.map((promise) => (
          <li key={promise}>{promise}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="flex w-max animate-marquee gap-12 font-mono text-13 tracking-label whitespace-nowrap text-fg-muted uppercase">
        {[...row, ...row].map((item, index) => (
          <span key={index} className={item === '✦' ? 'text-accent' : undefined}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function KindCard({
  href,
  kicker,
  title,
  body,
  projects,
  connected,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  projects: Project[];
  connected: boolean;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col gap-7 rounded-lg border border-border bg-surface p-8 transition-colors duration-2 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:p-10"
    >
      <MiniSky projects={projects} connected={connected} />
      <span className="flex flex-col gap-3">
        <Kicker>{kicker}</Kicker>
        <span className="font-display text-display-sm text-fg">{title}</span>
        <span className="max-w-xl text-16 text-fg-muted">{body}</span>
        <span className="text-14 text-fg">{projects.map((p) => p.name).join(' · ')}</span>
      </span>
    </a>
  );
}

/**
 * A small sky: the ecosystem joined by its real relations, or the fixes each
 * on their own. Positions are the map's, squeezed into the circle.
 */
function MiniSky({ projects, connected }: { projects: Project[]; connected: boolean }) {
  const slugs = new Set(projects.map((p) => p.slug));
  const xs = projects.map((p) => p.star.x);
  const ys = projects.map((p) => p.star.y);
  const fit = (v: number, lo: number, hi: number) => (hi === lo ? 50 : 24 + ((v - lo) / (hi - lo)) * 52);
  const at = (p: Project) => ({
    x: fit(p.star.x, Math.min(...xs), Math.max(...xs)),
    y: connected ? fit(p.star.y, Math.min(...ys), Math.max(...ys)) : p.slug === projects[0].slug ? 36 : 64,
  });
  const lines = connected
    ? edges().filter((e) => slugs.has(e.from.slug) && slugs.has(e.to.slug) && e.type !== 'planned-in')
    : [];
  return (
    <span aria-hidden="true" className="relative size-28 shrink-0 rounded-full border border-border">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none">
        {lines.map((e) => (
          <line
            key={`${e.from.slug}-${e.to.slug}`}
            x1={at(e.from).x}
            y1={at(e.from).y}
            x2={at(e.to).x}
            y2={at(e.to).y}
            stroke={e.to.accent}
            strokeWidth="1.2"
            opacity="0.7"
          />
        ))}
      </svg>
      {projects.map((project, index) => (
        <span
          key={project.slug}
          className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${connected ? '' : 'animate-twinkle'} ${index ? 'stagger-3' : ''}`}
          style={{ left: `${at(project).x}%`, top: `${at(project).y}%`, backgroundColor: project.accent }}
        />
      ))}
    </span>
  );
}

function TwoKinds() {
  return (
    <section aria-labelledby="what" className={`${WRAP} flex scroll-mt-20 flex-col gap-14 py-24 lg:py-32`}>
      <SectionHead number="01" label="What this is" id="what">
        D3 Cloud is two kinds of software.{' '}
        <Quiet>Tools that work together, and small apps that fix one thing.</Quiet>
      </SectionHead>
      <div className="grid gap-6 lg:grid-cols-2">
        <KindCard
          href="#ecosystem"
          kicker="The ecosystem"
          title="Tools that work together."
          body="Self-hosted software for running things yourself: one sign-in, one design language, one plan of record. Every piece makes the next one easier to build."
          projects={ecosystemProjects()}
          connected
        />
        <KindCard
          href="#fixes"
          kicker="The fixes"
          title="Small apps for things that bugged me."
          body="Sometimes the problem is just a bad app. When I hit one, I build the version I wanted — and it gets a star of its own."
          projects={fixProjects()}
          connected={false}
        />
      </div>
      <ul className="flex flex-col gap-3 border-t border-border pt-7 text-14 text-fg-muted lg:flex-row lg:items-center lg:gap-10">
        <li>
          <Kicker>Either way, the same rules</Kicker>
        </li>
        <li>
          <strong className="font-semibold text-fg">Kept, not rented</strong> — your machine, or no
          account at all
        </li>
        <li>
          <strong className="font-semibold text-fg">Honest by construction</strong> — no telemetry,
          enforced
        </li>
        <li>
          <strong className="font-semibold text-fg">Built to be checked</strong> — open, tested,
          drilled
        </li>
      </ul>
    </section>
  );
}

function MapSection() {
  return (
    <section aria-labelledby="ecosystem" className="scroll-mt-20 border-y border-border bg-bg-sunken">
      <div className={`${WRAP} flex flex-col gap-12 py-24`}>
        <SectionHead number="02" label="The system" id="ecosystem">
          Some stars form a constellation. <Accent>Some shine alone.</Accent>
        </SectionHead>
        <EcosystemMap />
      </div>
    </section>
  );
}

function Feature({ project, flip }: { project: Project; flip: boolean }) {
  const shot = project.screenshots?.[0];
  return (
    <article className={`flex flex-col gap-10 lg:items-center lg:gap-18 ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
      <div className="flex flex-col gap-5 lg:w-md lg:shrink-0">
        <ProductKicker project={project} />
        <h3 className="font-display text-display-md text-fg">{project.headline}</h3>
        <p className="text-16 text-fg-muted">{project.summary}</p>
        <Chips items={project.proof} />
        <ArrowLink href={`/${project.slug}`} className="self-start">
          Meet {project.name} →
        </ArrowLink>
      </div>
      {shot && (
        <div className="flex-1">
          <BrowserFrame shot={shot} />
        </div>
      )}
    </article>
  );
}

function CompactCard({ project }: { project: Project }) {
  const shot = project.screenshots?.[0];
  const to = `/${project.slug}`;
  return (
    <a
      href={to}
      onClick={useNavigateOnClick(to)}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors duration-2 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {shot && (
        <span className="block h-56 overflow-hidden border-b border-border sm:h-64">
          <img
            src={shot.src}
            alt=""
            width={shot.width}
            height={shot.height}
            loading="lazy"
            decoding="async"
            className="block w-full"
          />
        </span>
      )}
      <span className="flex flex-col gap-3 p-7">
        <ProductKicker project={project} />
        <span className="font-display text-display-sm text-fg">{project.headline}</span>
        <span className="text-14 text-fg-muted">{project.proof.join(' · ')}</span>
      </span>
    </a>
  );
}

function Ecosystem() {
  const tools = ecosystemProjects();
  const featured = tools.filter((p) => ['bindery', 'foreman', 'shipyard'].includes(p.slug));
  const rest = tools.filter((p) => !featured.includes(p));
  return (
    <section aria-labelledby="work" className={`${WRAP} flex flex-col gap-20 py-24 lg:gap-24 lg:py-32`}>
      <SectionHead number="03" label="The ecosystem" id="work">
        Built to work <Accent>together.</Accent>
      </SectionHead>
      {featured.map((project, index) => (
        <Feature key={project.slug} project={project} flip={index % 2 === 1} />
      ))}
      <div className="grid gap-6 lg:grid-cols-2">
        {rest.map((project) => (
          <CompactCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}

function Fix({ project }: { project: Project }) {
  const Art = PROBLEM_ART[project.slug];
  const shot = project.screenshots?.[0];
  const phone = shot && shot.height > shot.width;
  const to = `/${project.slug}`;
  return (
    <article
      aria-label={`${project.name}: the problem, and the fix`}
      className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1fr_auto_1.35fr] xl:gap-6"
    >
      <div className="flex flex-col gap-5 rounded-lg border border-dashed border-border-field p-7 sm:p-8">
        <Kicker>The problem</Kicker>
        {Art && <Art />}
        <p className="text-16 text-fg">{project.problem}</p>
      </div>
      <div aria-hidden="true" className="flex items-center justify-center text-fg-muted">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="rotate-90 xl:rotate-0">
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </div>
      <div
        className={`flex flex-col gap-7 rounded-lg border border-border bg-surface p-7 sm:p-8 ${
          phone ? 'sm:flex-row sm:items-center' : ''
        }`}
      >
        {shot &&
          (phone ? (
            <PhoneFrame shot={shot} className="w-40 shrink-0 self-center sm:w-44" />
          ) : (
            <img
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-md border border-border"
            />
          ))}
        <div className="flex flex-col gap-4">
          <ProductKicker project={project} prefix="The fix" />
          <h3 className="font-display text-display-sm text-fg">{project.headline}</h3>
          <p className="text-16 text-fg-muted">{project.summary}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {project.cta && <PrimaryButton href={project.cta.href}>{project.cta.label}</PrimaryButton>}
            <ArrowLink href={to}>More about {project.name}</ArrowLink>
          </div>
        </div>
      </div>
    </article>
  );
}

function Fixes() {
  return (
    <section aria-labelledby="fixes" className="scroll-mt-20 border-y border-border bg-bg-sunken">
      <div className={`${WRAP} flex flex-col gap-14 py-24 lg:py-32`}>
        <SectionHead number="04" label="The fixes" id="fixes">
          Small apps for things <Accent>that bugged me.</Accent>
        </SectionHead>
        <p className="max-w-3xl text-16 text-fg-muted sm:text-20 lg:ml-68">
          No platform and no grand plan. Just a problem I kept running into, and the app I wished
          already existed.
        </p>
        {fixProjects().map((project) => (
          <Fix key={project.slug} project={project} />
        ))}
        <p className="flex flex-wrap items-center justify-center gap-x-3 text-center text-16 text-fg-muted">
          Something bugging you that software should fix?
          <ArrowLink href={`mailto:${CONTACT_EMAIL}?subject=Something%20that%20bugs%20me`}>
            Tell me about it →
          </ArrowLink>
        </p>
      </div>
    </section>
  );
}

function BuildLog() {
  return (
    <section aria-labelledby="log" className={`${WRAP} flex scroll-mt-20 flex-col gap-14 py-24 lg:py-32`}>
      <SectionHead number="05" label="Momentum" id="log">
        Moving forward, <Accent>in public.</Accent>
      </SectionHead>
      <div className="flex flex-col gap-14 lg:flex-row lg:gap-16">
        <ol className="flex flex-1 flex-col gap-6 border-l border-border-field pl-7">
          {BUILD_LOG.map((entry) => {
            // A log entry may be a product or a project still on the bench.
            const project = projectBySlug(entry.slug) ?? WORKSHOP.find((w) => w.slug === entry.slug)!;
            return (
              <li key={`${entry.date}-${entry.text}`} className="relative flex flex-col gap-1">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-9 size-3 rounded-full border-2 border-bg"
                  style={{ backgroundColor: project.accent }}
                />
                <time dateTime={entry.date} className="font-mono text-12 text-fg-muted">
                  {entry.date}
                </time>
                <span className="text-16 text-fg">{entry.text}</span>
              </li>
            );
          })}
        </ol>
        {/* With nothing on the bench, the log has the width to itself. */}
        {WORKSHOP.length > 0 && (
          <div className="flex flex-col gap-4 lg:w-md">
            <Kicker>On the bench — the next star</Kicker>
            <ul className="flex flex-col gap-4">
              {WORKSHOP.map((item) => (
                <li key={item.slug}>
                  <BenchCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function BenchCard({ item }: { item: WorkshopItem }) {
  const to = `/${item.slug}`;
  return (
    <a
      href={to}
      onClick={useNavigateOnClick(to)}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-border-field p-5 transition-colors duration-2 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="flex flex-wrap items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: item.accent }} />
        <span className="text-16 font-semibold text-fg">{item.name}</span>
        <span className="rounded-full border border-dashed border-border-field px-2 py-0.5 font-mono text-11 tracking-label text-fg-muted uppercase">
          {item.stage}
        </span>
      </span>
      <span className="text-14 text-fg-muted">{item.line}</span>
      <span className="text-14 font-semibold text-fg">See where it stands →</span>
    </a>
  );
}

function Numbers() {
  const live = PROJECTS.filter((p) => p.status === 'Live').length;
  const open = PROJECTS.filter((p) => p.cta?.href.startsWith('https://github.com/')).length;
  const stats: [string, string][] = [
    [String(live), 'products live'],
    [String(open), 'open source under Apache-2.0'],
    // D3 UI's own count, from its release notes.
    ['38', 'shared components'],
    ['0', 'trackers, ads or analytics'],
  ];
  return (
    <section aria-label="By the numbers" className="border-y border-border">
      <dl className={`${WRAP} grid grid-cols-2 lg:grid-cols-4`}>
        {stats.map(([value, label], index) => (
          <div
            key={label}
            className={`flex flex-col-reverse gap-2 border-border py-10 lg:py-14 ${index % 2 ? 'border-l pl-6' : ''} ${index ? 'lg:border-l lg:pl-10' : ''}`}
          >
            <dt className="text-14 text-fg-muted">{label}</dt>
            <dd className={`font-display text-stat ${index === 3 ? 'text-accent' : 'text-fg'}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Studio() {
  return (
    <section aria-labelledby="studio" className={`${WRAP} flex scroll-mt-20 flex-col gap-8 py-24 lg:py-32`}>
      <SectionHead number="06" label="The studio" id="studio">
        One independent studio, using everything it makes.{' '}
        <Quiet>The archive holds real documents. The ledger tracks this very website.</Quiet>
      </SectionHead>
      <div className="flex flex-col gap-8 lg:ml-68">
        <p className="max-w-2xl text-16 text-fg-muted sm:text-20">
          Some of it is infrastructure I run at home. Some of it just fixes a bad morning. All of it
          is designed, built and run by Matthew Demers, as Demers Design and Development.
        </p>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton href={`mailto:${CONTACT_EMAIL}`}>Say hello</PrimaryButton>
          <SecondaryButton href="https://github.com/matdemers1">Follow along on GitHub ↗</SecondaryButton>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <Promises />
      <TwoKinds />
      <MapSection />
      <Ecosystem />
      <Fixes />
      <BuildLog />
      <Numbers />
      <Studio />
    </>
  );
}
