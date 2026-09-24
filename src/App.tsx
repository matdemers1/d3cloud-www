import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/Project';
import { LegalPage, SupportPage } from './pages/Legal';
import { LEGAL_DOCS } from './content/legal';
import { projectBySlug, type Project } from './content/projects';
import { NOT_FOUND_TITLE, resolveRoute } from './routes';
import { Link, useRouter } from './router';

/** Reading pages — legal text, support, not found — keep a readable measure. */
function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">{children}</div>;
}

function NotFound() {
  return (
    <div className="py-10">
      <h1 className="mb-3 text-24 font-title text-fg">
        Page not found
      </h1>
      <p className="mb-6 text-14 text-fg-muted">
        That address doesn&apos;t exist — it may have moved.
      </p>
      <Link to="/">
        Back to D3 Cloud →
      </Link>
    </div>
  );
}

/** Resolves a pathname to a page plus the document title it should set. */
function resolve(path: string): {
  view: ReactNode;
  title: string;
  canonical?: string;
  project?: Project;
} {
  const route = resolveRoute(path);
  if (!route) return { view: <Narrow><NotFound /></Narrow>, title: NOT_FOUND_TITLE };

  const { meta } = route;
  const project = meta.slug ? projectBySlug(meta.slug) : undefined;
  const canonical = route.redirect ? meta.path : undefined;

  if (meta.kind === 'home' || !project) {
    return { view: <Home />, title: meta.title, canonical };
  }
  if (meta.kind === 'project') {
    return { view: <ProjectPage project={project} />, title: meta.title, canonical, project };
  }
  if (meta.kind === 'support') {
    return {
      view: <Narrow><SupportPage project={project} /></Narrow>,
      title: meta.title,
      canonical,
      project,
    };
  }
  const doc = LEGAL_DOCS[project.slug][meta.doc!];
  return {
    view: <Narrow><LegalPage doc={doc} project={project} /></Narrow>,
    title: meta.title,
    canonical,
    project,
  };
}

export function App() {
  const { path } = useRouter();
  const { view, title, canonical, project } = resolve(path);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // The Worker redirects these on a fresh load; this covers an in-app link to an
  // old address, so the bar never shows /daypart or a trailing slash.
  useEffect(() => {
    if (canonical) window.history.replaceState({}, '', canonical);
  }, [canonical]);

  return <Layout project={project}>{view}</Layout>;
}
