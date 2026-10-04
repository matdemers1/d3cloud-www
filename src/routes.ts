import { LEGAL_DOCS } from './content/legal';
import { BRAND, PROJECTS, projectBySlug } from './content/projects';
import { WORKSHOP, workshopPath, type WorkshopItem } from './content/ecosystem';
import { SPEC, SPEC_NAME, chapterBySlug, chapterLabel } from './floorspec/spec';

/**
 * Every page the site has, in one place.
 *
 * The SPA, the Worker and the sitemap all answer "is this a page?", and three
 * copies of that answer would drift — a project added to the catalog and not
 * to the sitemap, or a Worker returning 404 for a page the app renders. So all
 * three read this module. It is plain data: no React, no DOM, nothing the
 * Worker bundle cannot carry.
 */

export const ORIGIN = 'https://d3cloud.io';

export const TAGLINE =
  'Software you get to keep: self-hostable tools that work together, and small apps that each fix one thing.';

/**
 * Paths that changed after launch. `/daypart/*` was live and is baked into an
 * early build of the app, so it has to keep resolving rather than 404.
 */
export const RENAMED: Record<string, string> = { daypart: 'clearwhen' };

export type RouteKind =
  | 'home'
  | 'project'
  | 'workshop'
  | 'legal'
  | 'support'
  /** The Floorspec standard (FLR-ADR-018): its landing page, a chapter, and its coverage. */
  | 'floorspec'
  | 'floorspec-chapter'
  | 'floorspec-coverage';

export interface RouteMeta {
  /** Canonical path: no trailing slash, current slugs. */
  path: string;
  kind: RouteKind;
  /** The document title. */
  title: string;
  /** One sentence, for search results and link previews. */
  description: string;
  slug?: string;
  /** For `legal`: the key into LEGAL_DOCS[slug]. For `floorspec-chapter`: the chapter's slug. */
  doc?: string;
}

function projectRoute(slug: string): RouteMeta | null {
  const project = projectBySlug(slug);
  if (!project) return null;
  return {
    path: `/${project.slug}`,
    kind: 'project',
    title: `${project.name} — ${BRAND}`,
    description: project.tagline,
    slug: project.slug,
  };
}

/**
 * A project on the bench (DI-REQ-037): a page of its own, no legal pages yet. It lives at
 * `/<slug>` unless it declares a path of its own — D3 Floorspec is at /floorspec/app, because
 * /floorspec is the standard.
 */
function workshopRoute(item: WorkshopItem | undefined): RouteMeta | null {
  if (!item) return null;
  return {
    path: workshopPath(item),
    kind: 'workshop',
    title: `${item.name} — ${BRAND}`,
    description: `${item.tagline} ${item.stage}, in the D3 Cloud workshop.`,
    slug: item.slug,
  };
}

/**
 * The Floorspec standard, published here by FLR-ADR-018: `/floorspec`, a page per chapter of the
 * current draft at `/floorspec/core/<chapter>`, and `/floorspec/coverage`. Its schemas are files
 * under /floorspec/schema/, served by the assets binding, not pages.
 */
const FLOORSPEC_DESCRIPTION =
  'An open standard for describing houses as code: exact integer geometry, walls on a junction graph, rooms derived from them, and a conformance test for every MUST.';

function floorspecRoute(segments: string[]): RouteMeta | null {
  if (segments.length === 1) {
    return {
      path: '/floorspec',
      kind: 'floorspec',
      title: `Floorspec — ${BRAND}`,
      description: `${FLOORSPEC_DESCRIPTION} ${SPEC_NAME} is a draft.`,
    };
  }
  if (segments.length === 2 && segments[1] === 'coverage') {
    return {
      path: '/floorspec/coverage',
      kind: 'floorspec-coverage',
      title: `Conformance coverage — ${SPEC_NAME} — ${BRAND}`,
      description: `${SPEC.covered} of ${SPEC.mandatory} mandatory statements in ${SPEC_NAME} (Draft) have a conformance test, from ${SPEC.tests} ${SPEC.tests === 1 ? 'test' : 'tests'}.`,
    };
  }
  if (segments.length === 3 && segments[1] === 'core') {
    const chapter = chapterBySlug(segments[2]);
    if (!chapter) return null;
    return {
      path: `/floorspec/core/${chapter.slug}`,
      kind: 'floorspec-chapter',
      title: `${chapterLabel(chapter)} — ${SPEC_NAME} — ${BRAND}`,
      description: `${SPEC_NAME} (Draft), ${/^\d+$/.test(chapter.number) ? `chapter ${chapter.number}` : `Annex ${chapter.number}`}: ${chapter.summary}.`,
      doc: chapter.slug,
    };
  }
  return null;
}

function subRoute(slug: string, page: string): RouteMeta | null {
  const project = projectBySlug(slug);
  const docs = LEGAL_DOCS[slug];
  if (!project || !docs) return null;

  if (page === 'support') {
    return {
      path: `/${slug}/support`,
      kind: 'support',
      title: `${project.name} Support — ${BRAND}`,
      description: `Help with ${project.name}, and how to get in touch.`,
      slug,
    };
  }

  const doc = docs[page];
  if (!doc) return null;
  return {
    path: `/${slug}/${page}`,
    kind: 'legal',
    title: `${doc.title} — ${BRAND}`,
    description:
      page === 'privacy'
        ? project.privacyLine
        : `The terms for using ${project.name}.`,
    slug,
    doc: page,
  };
}

/**
 * What a pathname is. `redirect` is set when the page exists under another
 * address — a renamed slug or a trailing slash — and the caller should send
 * people to `meta.path` instead.
 */
export function resolveRoute(
  pathname: string,
): { meta: RouteMeta; redirect: boolean } | null {
  const segments = pathname.split('/').filter(Boolean);
  const trailingSlash = pathname.length > 1 && pathname.endsWith('/');

  if (segments.length === 0) {
    return {
      meta: { path: '/', kind: 'home', title: `${BRAND} — Software you get to keep`, description: TAGLINE },
      redirect: false,
    };
  }

  let renamed = false;
  if (RENAMED[segments[0]]) {
    segments[0] = RENAMED[segments[0]];
    renamed = true;
  }

  const path = `/${segments.join('/')}`;
  const meta: RouteMeta | null =
    workshopRoute(WORKSHOP.find((item) => workshopPath(item) === path)) ??
    (segments[0] === 'floorspec'
      ? floorspecRoute(segments)
      : segments.length === 1
        ? projectRoute(segments[0])
        : segments.length === 2
          ? subRoute(segments[0], segments[1])
          : null);
  if (!meta) return null;

  return { meta, redirect: renamed || trailingSlash };
}

/** Every canonical page, home first — the sitemap's contents. */
export function allRoutes(): RouteMeta[] {
  const routes: RouteMeta[] = [resolveRoute('/')!.meta];
  for (const project of PROJECTS) {
    routes.push(projectRoute(project.slug)!);
    const docs = LEGAL_DOCS[project.slug];
    if (!docs) continue;
    for (const page of Object.keys(docs)) {
      routes.push(subRoute(project.slug, page)!);
    }
    routes.push(subRoute(project.slug, 'support')!);
  }
  for (const item of WORKSHOP) routes.push(workshopRoute(item)!);
  routes.push(floorspecRoute(['floorspec'])!);
  for (const chapter of SPEC.chapters) routes.push(floorspecRoute(['floorspec', 'core', chapter.slug])!);
  routes.push(floorspecRoute(['floorspec', 'coverage'])!);
  return routes;
}

export const NOT_FOUND_TITLE = `Not found — ${BRAND}`;
