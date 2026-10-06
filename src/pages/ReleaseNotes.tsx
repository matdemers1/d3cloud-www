import { Link as UiLink } from "@d3cloud/ui";
import type { Project } from "../content/projects";
import { CHANGELOGS } from "../content/changelogs";
import { Band } from "../components/Marketing";

/** A product's "What's new", newest first — nothing at all when it has no releases. */
export function ReleaseNotes({ project }: { project: Project }) {
  const releases = CHANGELOGS[project.slug];
  if (!releases || releases.length === 0) return null;
  return (
    <Band label="What’s new" title="Release notes." sunken>
      <ol className="flex flex-col gap-10 border-l border-border-field pl-7">
        {releases.map((release) => (
          <li key={release.version} className="relative flex flex-col gap-2">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-9 size-3 rounded-full border-2 border-bg-sunken"
              style={{ backgroundColor: project.accent }}
            />
            <div className="flex flex-wrap items-baseline gap-x-3">
              {release.href ? (
                <UiLink href={release.href} className="text-16 font-semibold">
                  {release.version}
                </UiLink>
              ) : (
                <span className="text-16 font-semibold text-fg">
                  {release.version}
                </span>
              )}
              <time
                className="font-mono text-12 text-fg-muted"
                dateTime={release.date}
              >
                {new Date(`${release.date}T00:00:00`).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
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
  );
}
