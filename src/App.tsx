import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/Project';
import { LegalPage, SupportPage } from './pages/Legal';
import { LEGAL_DOCS } from './content/legal';
import { projectBySlug, STUDIO } from './content/projects';
import { Link, useRouter } from './router';

function NotFound() {
  return (
    <div className="py-10">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mb-6 text-text-muted">
        That address doesn&apos;t exist — it may have moved.
      </p>
      <Link to="/" className="text-accent hover:underline">
        Back to all projects →
      </Link>
    </div>
  );
}

/**
 * Paths that changed after launch. `/daypart/*` was live and is baked into an
 * early build of the app, so it has to keep resolving rather than 404.
 */
const RENAMED: Record<string, string> = { daypart: 'clearwhen' };

/** Resolves a pathname to a page plus the document title it should set. */
function resolve(path: string): { view: ReactNode; title: string } {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { view: <Home />, title: STUDIO };
  }

  if (RENAMED[segments[0]]) {
    segments[0] = RENAMED[segments[0]];
  }

  const project = projectBySlug(segments[0]);
  if (!project) {
    return { view: <NotFound />, title: `Not found — ${STUDIO}` };
  }

  if (segments.length === 1) {
    return {
      view: <ProjectPage project={project} />,
      title: `${project.name} — ${STUDIO}`,
    };
  }

  const page = segments[1];

  if (page === 'support') {
    return {
      view: <SupportPage project={project} />,
      title: `${project.name} Support — ${STUDIO}`,
    };
  }

  const doc = LEGAL_DOCS[project.slug]?.[page];
  if (doc) {
    return {
      view: <LegalPage doc={doc} project={project} />,
      title: `${doc.title} — ${STUDIO}`,
    };
  }

  return { view: <NotFound />, title: `Not found — ${STUDIO}` };
}

export function App() {
  const { path } = useRouter();
  const { view, title } = resolve(path);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return <Layout>{view}</Layout>;
}
