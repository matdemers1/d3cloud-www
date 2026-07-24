import { Link } from '../router';
import type { LegalDoc } from '../content/legal';
import { CONTACT_EMAIL, type Project, STUDIO } from '../content/projects';

export function LegalPage({ doc, project }: { doc: LegalDoc; project: Project }) {
  return (
    <article>
      <Link
        to={`/${project.slug}`}
        className="mb-8 inline-block text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← {project.name}
      </Link>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        {doc.title}
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Effective {doc.effective} · {STUDIO}
      </p>

      <p className="mb-10 text-text-primary">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mb-3 text-text-muted">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-text-muted">
                  <span className="text-accent" aria-hidden="true">
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

/** Apple requires the Support URL to carry real, reachable contact details. */
export function SupportPage({ project }: { project: Project }) {
  return (
    <article>
      <Link
        to={`/${project.slug}`}
        className="mb-8 inline-block text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        ← {project.name}
      </Link>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        {project.name} Support
      </h1>
      <p className="mb-10 text-sm text-text-muted">{STUDIO}</p>

      <section className="mb-8 rounded-xl border border-border bg-elevated p-6">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">
          Get in touch
        </h2>
        <p className="mb-4 text-text-muted">
          Email is the fastest way to reach us — bug reports, feature requests,
          or anything that looks wrong. A real person reads every message.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-accent hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      {project.slug === 'daypart' && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Common questions
          </h2>
          <dl className="flex flex-col gap-5">
            <div>
              <dt className="mb-1 font-medium">
                Why does a window show no forecast?
              </dt>
              <dd className="text-text-muted">
                A window only appears on days it is scheduled for, and it drops
                off once it has finished for the day. If a whole day is blank,
                pull down to refresh.
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium">
                The headline says clear but it rained overnight.
              </dt>
              <dd className="text-text-muted">
                That is deliberate. Each day&apos;s headline covers only your Day
                Summary hours (7 AM–10 PM by default), so an overnight shower
                never ruins a sunny day. You can change that range in Settings.
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium">
                My Apple Watch is not showing anything.
              </dt>
              <dd className="text-text-muted">
                The Watch app receives its data from your iPhone. Open Daypart on
                the phone once with the Watch paired and nearby, and the Watch
                will fill in.
              </dd>
            </div>
            <div>
              <dt className="mb-1 font-medium">
                Can I use it without sharing my location?
              </dt>
              <dd className="text-text-muted">
                Yes. Decline the location prompt and add any city by name from
                the locations list instead.
              </dd>
            </div>
          </dl>
        </section>
      )}

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
      </div>
    </article>
  );
}
