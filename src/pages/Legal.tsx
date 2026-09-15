import { Card, Link as UiLink } from '@d3cloud/ui';
import { Link } from '../router';
import type { LegalDoc } from '../content/legal';
import { CONTACT_EMAIL, type Project, STUDIO } from '../content/projects';

export function LegalPage({
  doc,
  project,
}: {
  doc: LegalDoc;
  project: Project;
}) {
  return (
    <article>
      <div className="mb-8">
        <Link to={`/${project.slug}`} variant="muted" className="text-13">
          ← {project.name}
        </Link>
      </div>

      <h1 className="mb-2 text-24 font-title text-fg">{doc.title}</h1>
      <p className="mb-8 text-13 text-fg-muted">
        Effective {doc.effective} · {STUDIO}
      </p>

      <p className="mb-10 max-w-prose text-16 text-fg">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="mb-3 text-16 font-semibold text-fg">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mb-3 max-w-prose text-14 text-fg-muted"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-14 text-fg-muted">
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
      <div className="mb-8">
        <Link to={`/${project.slug}`} variant="muted" className="text-13">
          ← {project.name}
        </Link>
      </div>

      <h1 className="mb-2 text-24 font-title text-fg">
        {project.name} Support
      </h1>
      <p className="mb-10 text-13 text-fg-muted">{STUDIO}</p>

      <div className="mb-8">
        <Card padding="lg">
          <h2 className="mb-2 text-16 font-semibold text-fg">Get in touch</h2>
          <p className="mb-4 text-14 text-fg-muted">
            Email is the fastest way to reach us — bug reports, feature
            requests, or anything that looks wrong. A real person reads every
            message.
          </p>
          <UiLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</UiLink>
        </Card>
      </div>

      {project.slug === 'clearwhen' && (
        <section className="mb-8">
          <h2 className="mb-3 text-16 font-semibold text-fg">
            Common questions
          </h2>
          <dl className="flex flex-col gap-5">
            <div>
              <dt className="mb-1 text-14 font-medium text-fg">
                Why does a window show no forecast?
              </dt>
              <dd className="text-14 text-fg-muted">
                A window only appears on days it is scheduled for, and it drops
                off once it has finished for the day. If a whole day is blank,
                pull down to refresh.
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-14 font-medium text-fg">
                The headline says clear but it rained overnight.
              </dt>
              <dd className="text-14 text-fg-muted">
                That is deliberate. Each day&apos;s headline covers only your
                Day Summary hours (7 AM–10 PM by default), so an overnight
                shower never ruins a sunny day. You can change that range in
                Settings.
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-14 font-medium text-fg">
                My Apple Watch is not showing anything.
              </dt>
              <dd className="text-14 text-fg-muted">
                The Watch app receives its data from your iPhone. Open Clearwhen
                on the phone once with the Watch paired and nearby, and the
                Watch will fill in.
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-14 font-medium text-fg">
                Can I use it without sharing my location?
              </dt>
              <dd className="text-14 text-fg-muted">
                Yes. Decline the location prompt and add any city by name from
                the locations list instead.
              </dd>
            </div>
          </dl>
        </section>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-13">
        <Link to={`/${project.slug}/privacy`}>Privacy Policy</Link>
        <Link to={`/${project.slug}/terms`}>Terms of Use</Link>
      </div>
    </article>
  );
}
