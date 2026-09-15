import type { Project } from '../content/projects';

/** The small dot in each product's own colour. Decorative. */
export function ProjectMark({
  project,
  size = 'sm',
}: {
  project: Project;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={`shrink-0 rounded-full ${size === 'md' ? 'size-3' : 'size-2.5'}`}
      style={{ backgroundColor: project.accent }}
      aria-hidden="true"
    />
  );
}
