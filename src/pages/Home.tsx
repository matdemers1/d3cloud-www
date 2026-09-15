import { Badge, Card } from '@d3cloud/ui';
import { useNavigateOnClick } from '../router';
import { PROJECTS, type Project } from '../content/projects';
import { ProjectMark } from '../components/ProjectMark';

function ProjectCard({ project }: { project: Project }) {
  const to = `/${project.slug}`;
  return (
    <Card
      interactive
      href={to}
      padding="lg"
      onClick={useNavigateOnClick(to)}
      className="block"
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <ProjectMark project={project} />
        <h3 className="text-16 font-semibold">{project.name}</h3>
        <Badge size="sm">{project.status}</Badge>
      </div>
      <p className="mb-3 text-14 text-fg">{project.tagline}</p>
      <p className="text-13 text-fg-muted">{project.privacyLine}</p>
      <span className="mt-4 inline-block text-13 font-medium text-accent">
        Learn more →
      </span>
    </Card>
  );
}

export function Home() {
  return (
    <>
      <section className="mb-14">
        <h1 className="mb-3 text-24 font-title text-fg">
          Independent software studio building privacy-first everyday tools.
        </h1>
        <p className="max-w-prose text-16 text-fg-muted">
          Small, useful apps that do one thing properly. No accounts, no ads, no
          analytics, and no tracking — not as a feature, just as how they are
          built.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-11 font-semibold text-fg-muted uppercase">
          Projects
        </h2>
        <ul className="flex flex-col gap-4">
          {PROJECTS.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
