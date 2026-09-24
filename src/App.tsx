import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/Project';
import { LegalPage, SupportPage } from './pages/Legal';
import { LEGAL_DOCS } from './content/legal';
import { projectBySlug } from './content/projects';
import { NOT_FOUND_TITLE, resolveRoute } from './routes';
import { Link, useRouter } from './router';

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
        Back to all projects →
      </Link>
    </div>
  );
}

/** Resolves a pathname to a page plus the document title it should set. */
function resolve(path: string): { view: ReactNode; title: string; canonical?: string } {
  const route = resolveRoute(path);
  if (!route) return { view: <NotFound />, title: NOT_FOUND_TITLE };

  const { meta } = route;
  const project = meta.slug ? projectBySlug(meta.slug) : undefined;
  const canonical = route.redirect ? meta.path : undefined;

  if (meta.kind === 'home' || !project) {
    return { view: <Home />, title: meta.title, canonical };
  }
  if (meta.kind === 'project') {
    return { view: <ProjectPage project={project} />, title: meta.title, canonical };
  }
  if (meta.kind === 'support') {
    return { view: <SupportPage project={project} />, title: meta.title, canonical };
  }
  const doc = LEGAL_DOCS[project.slug][meta.doc!];
  return { view: <LegalPage doc={doc} project={project} />, title: meta.title, canonical };
}

export function App() {
  const { path } = useRouter();
  const { view, title, canonical } = resolve(path);

  useEffect(() => {
    document.title = title;
  }, [title]);

  // The Worker redirects these on a fresh load; this covers an in-app link to an
  // old address, so the bar never shows /daypart or a trailing slash.
  useEffect(() => {
    if (canonical) window.history.replaceState({}, '', canonical);
  }, [canonical]);

  return <Layout>{view}</Layout>;
}
