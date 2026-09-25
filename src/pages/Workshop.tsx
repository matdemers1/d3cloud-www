import { CONTACT_EMAIL, projectBySlug } from "../content/projects";
import {
  WORKSHOP,
  describeRelation,
  type WorkshopItem,
} from "../content/ecosystem";
import { WORKSHOP_ART } from "../components/WorkshopArt";
import { Link, useNavigateOnClick } from "../router";
import {
  Band,
  BrowserFrame,
  Chips,
  PrimaryButton,
  SecondaryButton,
  WRAP,
} from "../components/Marketing";

/**
 * A project on the bench (DI-REQ-037). Same language as a product page, but it
 * leads with where the project stands, and every feature it lists says whether
 * it is built or planned (DI-REQ-038) — a workshop page never sells what does
 * not exist yet.
 */

function Colour({ item }: { item: WorkshopItem }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: item.accent }}
    />
  );
}

function FeatureMark({ built }: { built: boolean }) {
  return built ? (
    <span className="shrink-0 rounded-full bg-success-muted px-2.5 py-0.5 font-mono text-11 tracking-label text-success uppercase">
      Built
    </span>
  ) : (
    <span className="shrink-0 rounded-full border border-dashed border-border-field px-2.5 py-0.5 font-mono text-11 tracking-label text-fg-muted uppercase">
      Planned
    </span>
  );
}

export function WorkshopPage({ item }: { item: WorkshopItem }) {
  const built = item.features.filter((f) => f.built);
  const planned = item.features.filter((f) => !f.built);
  const next = WORKSHOP[(WORKSHOP.indexOf(item) + 1) % WORKSHOP.length];
  const goNext = useNavigateOnClick(`/${next.slug}`);
  const Art = WORKSHOP_ART[item.slug];

  return (
    <>
      <section
        aria-labelledby="workshop-title"
        className="relative overflow-hidden"
      >
        <div className={`${WRAP} flex flex-col gap-7 pt-16 pb-14 lg:pt-24`}>
          <p className="flex animate-rise flex-wrap items-center gap-2.5 font-mono text-12 tracking-label text-fg-muted uppercase">
            <Colour item={item} />
            In the workshop · {item.role}
            <span className="rounded-full border border-dashed border-border-field px-2.5 py-0.5 text-fg">
              {item.stage}
            </span>
          </p>
          <h1
            id="workshop-title"
            className="stagger-1 animate-rise font-display text-display-xl tracking-display text-fg"
          >
            {item.name}
          </h1>
          <p className="stagger-2 max-w-3xl animate-rise font-display text-display-sm text-fg">
            {item.tagline}
          </p>
          {item.quote && (
            <blockquote className="stagger-2 max-w-2xl animate-rise border-l-2 border-border-field pl-5 text-16 text-fg-muted italic sm:text-20">
              “{item.quote}”
            </blockquote>
          )}
          <div className="stagger-3 flex animate-rise flex-wrap items-center gap-3 pt-2">
            <PrimaryButton href={item.cta.href}>
              {item.cta.label} ↗
            </PrimaryButton>
            <SecondaryButton href="/#log">
              Everything on the bench
            </SecondaryButton>
          </div>
        </div>
        <div className={`${WRAP} pb-16`}>
          {item.screenshot ? (
            <BrowserFrame shot={item.screenshot} eager />
          ) : (
            Art && <Art />
          )}
        </div>
      </section>

      <Band label="Where it stands" title={item.stage} sunken>
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-16 text-fg sm:text-20">{item.stageNote}</p>
          <p className="text-14 text-fg-muted">
            {built.length} of {item.features.length} features below{' '}
            {built.length === 1 ? 'is' : 'are'} built
            {planned.length ? `; ${planned.length} ${planned.length === 1 ? 'is' : 'are'} planned` : ''}.
          </p>
        </div>
      </Band>

      <Band label="Why it exists" title="The reason.">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-16 text-fg sm:text-20">{item.why}</p>
          <p className="text-16 text-fg-muted">{item.audience}</p>
        </div>
      </Band>

      <Band label="What it does" title="Built, and planned." sunken>
        <ul className="flex max-w-3xl flex-col divide-y divide-border">
          {item.features.map((feature) => (
            <li
              key={feature.text}
              className="flex items-start justify-between gap-6 py-4 first:pt-0"
            >
              <span
                className={`text-16 ${feature.built ? "text-fg" : "text-fg-muted"}`}
              >
                {feature.text}
              </span>
              <FeatureMark built={feature.built} />
            </li>
          ))}
        </ul>
      </Band>

      <Band label="Principles" title="What it stands by.">
        <ul className="flex max-w-3xl flex-col gap-4">
          {item.principles.map((principle) => (
            <li key={principle} className="flex gap-3 text-16 text-fg">
              <span
                aria-hidden="true"
                className="mt-2 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.accent }}
              />
              <span>{principle}</span>
            </li>
          ))}
        </ul>
      </Band>

      {item.relations.length > 0 && (
        <Band label="In the constellation" title="Already connected." sunken>
          <ul className="grid gap-4 sm:grid-cols-2">
            {item.relations.map((relation) => {
              const other = projectBySlug(relation.to)!;
              return (
                <li key={`${relation.to}-${relation.type}`}>
                  <Link
                    to={`/${other.slug}`}
                    variant="muted"
                    className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-6 no-underline hover:bg-surface-hover"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: other.accent }}
                      />
                      <span className="text-16 font-semibold text-fg">
                        {other.name}
                      </span>
                    </span>
                    <span className="text-14 text-fg-muted">
                      {describeRelation(relation.type, other.name)}.
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Band>
      )}

      <Band label="Where it runs">
        <div className="flex flex-col gap-5">
          <Chips items={item.platforms} />
          <p className="text-14 text-fg-muted">
            Questions, or want in early?{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(item.name)}`}
              className="text-accent underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </Band>

      <section aria-label="Next" className="border-t border-border">
        <div
          className={`${WRAP} flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between`}
        >
          {next !== item ? (
            <a
              href={`/${next.slug}`}
              onClick={goNext}
              className="flex items-center gap-4 rounded-sm font-display text-display-sm text-fg hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Colour item={next} />
              Also on the bench: {next.name} →
            </a>
          ) : (
            <span className="font-display text-display-sm text-fg">
              The only thing on the bench, for now.
            </span>
          )}
          <SecondaryButton href="/">Back to the ecosystem</SecondaryButton>
        </div>
      </section>
    </>
  );
}
