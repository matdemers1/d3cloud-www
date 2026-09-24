import { useState } from 'react';
import { projectBySlug } from '../content/projects';
import { RELATION_LABEL, connectionsOf, edges } from '../content/ecosystem';
import { Constellation } from './Constellation';
import { ArrowLink, Dot, Kicker } from './Marketing';

/**
 * The map (DI-REQ-030, DI-REQ-031). Stars are buttons — pointer or keyboard —
 * and the panel beside the sky says in words what the lines say in colour, so
 * nothing on the map is carried by colour alone.
 */
export function EcosystemMap({ initial = 'auth' }: { initial?: string }) {
  const [selected, setSelected] = useState(initial);
  const project = projectBySlug(selected) ?? projectBySlug(initial)!;
  const connections = connectionsOf(project.slug);

  // One swatch per relation type actually on the map, in its provider's colour.
  const legend = [...new Map(edges().map((e) => [e.type, e])).values()];

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
      <div className="flex-1">
        <div className="relative overflow-hidden rounded-lg border border-border bg-bg">
          <Constellation
            selected={project.slug}
            onSelect={setSelected}
            animated={false}
            className="mx-6 my-10 aspect-[4/3] sm:mx-14 sm:my-14"
          />
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-13 text-fg-muted" aria-label="Legend">
          {legend.map((edge) => (
            <li key={edge.type} className="flex items-center gap-2.5">
              <svg aria-hidden="true" width="28" height="4" viewBox="0 0 28 4">
                <line
                  x1="1"
                  y1="2"
                  x2="27"
                  y2="2"
                  stroke={edge.to.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={edge.type === 'planned-in' ? '3 4' : undefined}
                />
              </svg>
              {RELATION_LABEL[edge.type]}
            </li>
          ))}
        </ul>
      </div>

      <section
        aria-live="polite"
        aria-label={`${project.name} in the ecosystem`}
        className="flex flex-col gap-5 lg:w-96 lg:pt-4"
      >
        <p className="flex items-center gap-2.5 font-mono text-12 tracking-label text-fg-muted uppercase">
          <Dot project={project} />
          {project.kind === 'fix' ? 'A fix' : 'The ecosystem'} · {project.role}
        </p>
        <h3 className="font-display text-display-md text-fg">{project.name}</h3>
        <p className="text-16 text-fg-muted">{project.tagline}</p>

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <Kicker>Connections</Kicker>
          <ul className="flex flex-col gap-3">
            {connections.map((connection) => (
              <li
                key={`${connection.other.slug}-${connection.type}`}
                className="flex items-center gap-3 text-14 text-fg"
              >
                <svg aria-hidden="true" width="22" height="4" viewBox="0 0 22 4" className="shrink-0">
                  <line
                    x1="1"
                    y1="2"
                    x2="21"
                    y2="2"
                    stroke={legend.find((e) => e.type === connection.type)?.to.accent}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={connection.type === 'planned-in' ? '3 4' : undefined}
                  />
                </svg>
                {connection.text}
              </li>
            ))}
            {connections.length === 0 && (
              <li className="text-14 text-fg-muted">Stands on its own.</li>
            )}
          </ul>
        </div>

        <ArrowLink href={`/${project.slug}`}>Visit {project.name} →</ArrowLink>
      </section>
    </div>
  );
}
