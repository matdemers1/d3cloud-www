import { LEGAL_DOCS } from './content/legal';
import { BRAND, PROJECTS, projectBySlug } from './content/projects';
import { WORKSHOP, workshopPath, type WorkshopItem } from './content/ecosystem';
import {
  EARLIER,
  EXTENSIONS,
  LIBRARIES,
  SPECS,
  STATUS_LABEL,
  chapterBySlug,
  chapterLabel,
  chapterPath,
  earlierOf,
  extensionByName,
  isCurrent,
  libraryByName,
  specAt,
  specByCode,
  specName,
} from './floorspec/spec';
import type { ChapterSummary, ExtensionIndex, LibraryIndex, SpecIndex } from './floorspec/ast';

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
  /**
   * The Floorspec standard (FLR-ADR-018): its landing page, a chapter, its coverage, the extension
   * registry and an extension's page, and a library (DI-T-10.6).
   */
  | 'floorspec'
  | 'floorspec-chapter'
  | 'floorspec-coverage'
  | 'floorspec-registry'
  | 'floorspec-extension'
  | 'floorspec-library';

export interface RouteMeta {
  /** Canonical path: no trailing slash, current slugs. */
  path: string;
  kind: RouteKind;
  /** The document title. */
  title: string;
  /** One sentence, for search results and link previews. */
  description: string;
  slug?: string;
  /**
   * For `legal`: the key into LEGAL_DOCS[slug]. For `floorspec-chapter`: the chapter's slug. For
   * `floorspec-extension`: the extension's name. For `floorspec-library`: the library's name.
   */
  doc?: string;
  /** For `floorspec-chapter`: the specification the chapter belongs to — `core`, `ops`, `rules`. */
  spec?: string;
  /**
   * For `floorspec-chapter`: the draft — `0.3`, or `0.2` for an earlier draft at
   * /floorspec/<spec>/0.2/<chapter>. For `floorspec-library`: one version of the library, or absent
   * for the library itself.
   */
  version?: string;
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
 * current draft of each specification at `/floorspec/<spec>/<chapter>` (Core, Ops and Rules), every
 * earlier draft at `/floorspec/<spec>/<version>/<chapter>` (DI-T-10.5), `/floorspec/coverage`, the
 * extension registry at `/floorspec/registry` and `/floorspec/registry/<NAME>`, and each library at
 * `/floorspec/library/<name>` and `/floorspec/library/<name>/<version>` (DI-T-10.6).
 * `/floorspec/<spec>/<current version>/<chapter>` redirects to the current page, so a versioned
 * link can be made today and still work when the draft is superseded; a chapter the current draft
 * no longer has redirects to the newest earlier draft that does. Its schemas and library files are
 * files under /floorspec/schema/ and /floorspec/library/<name>/<version>/, served by the assets
 * binding, not pages.
 */
const FLOORSPEC_DESCRIPTION =
  'An open standard for describing houses as code: exact integer geometry, walls on a junction graph, rooms derived from them, the edits that change them, and a conformance test for every MUST.';

const list = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

function floorspecRoute(segments: string[]): RouteMeta | null {
  if (segments.length === 1) {
    return {
      path: '/floorspec',
      kind: 'floorspec',
      title: `Floorspec — ${BRAND}`,
      description: `${FLOORSPEC_DESCRIPTION} ${list(SPECS.map(specName))} ${SPECS.length === 1 ? 'is a draft' : 'are drafts'}.`,
    };
  }
  if (segments.length === 2 && segments[1] === 'registry' && EXTENSIONS.length) return registryRoute();
  if (segments[1] === 'registry') {
    const ext = segments.length === 3 ? extensionByName(segments[2]) : undefined;
    return ext ? extensionRoute(ext) : null;
  }
  if (segments[1] === 'library') {
    const lib = segments.length === 3 || segments.length === 4 ? libraryByName(segments[2]) : undefined;
    if (!lib) return null;
    if (segments.length === 3) return libraryRoute(lib);
    return lib.versions.includes(segments[3]) ? libraryRoute(lib, segments[3]) : null;
  }
  if (segments.length === 2 && segments[1] === 'coverage') {
    return {
      path: '/floorspec/coverage',
      kind: 'floorspec-coverage',
      title: `Conformance coverage — Floorspec — ${BRAND}`,
      description: `Every mandatory statement of the Floorspec drafts and its conformance tests: ${list(
        SPECS.map((spec) => `${spec.covered} of ${spec.mandatory} in ${specName(spec)}, from ${spec.tests} ${spec.tests === 1 ? 'test' : 'tests'}`),
      )}.`,
    };
  }
  if (segments.length === 3) {
    const spec = specByCode(segments[1]);
    if (!spec) return null;
    const chapter = chapterBySlug(spec, segments[2]);
    if (chapter) return chapterRoute(spec, chapter);
    for (const old of earlierOf(spec.spec)) {
      const was = chapterBySlug(old, segments[2]);
      if (was) return chapterRoute(old, was);
    }
    return null;
  }
  if (segments.length === 4) {
    const spec = specAt(segments[1], segments[2]);
    const chapter = spec && chapterBySlug(spec, segments[3]);
    return chapter ? chapterRoute(spec, chapter) : null;
  }
  return null;
}

function registryRoute(): RouteMeta {
  return {
    path: '/floorspec/registry',
    kind: 'floorspec-registry',
    title: `Extension registry — Floorspec — ${BRAND}`,
    description: `The Floorspec extension registry: ${list(EXTENSIONS.map((ext) => `${ext.name} ${ext.version}`))} — each with its status, specification, schema, implementations and the evidence that they pass its conformance suite.`,
  };
}

function extensionRoute(ext: ExtensionIndex): RouteMeta {
  return {
    path: `/floorspec/registry/${ext.name}`,
    kind: 'floorspec-extension',
    title: `${ext.name} ${ext.version} — Floorspec registry — ${BRAND}`,
    description: `${ext.name} ${ext.version} (${STATUS_LABEL[ext.status]}), the Floorspec extension for ${ext.title.toLowerCase()}: its specification, schema, kinds, implementations and evidence.`,
    doc: ext.name,
  };
}

function libraryRoute(lib: LibraryIndex, version?: string): RouteMeta {
  return {
    path: `/floorspec/library/${lib.name}${version ? `/${version}` : ''}`,
    kind: 'floorspec-library',
    title: `${lib.title}${version ? ` ${version}` : ''} — Floorspec — ${BRAND}`,
    description: version
      ? `${lib.title} ${version}: every item and file, published byte for byte at d3cloud.io/floorspec/library/${lib.name}/${version}/ and never changed.`
      : `${lib.title}: published at immutable, versioned URLs — ${list(lib.versions)}.`,
    doc: lib.name,
    ...(version ? { version } : {}),
  };
}

function chapterRoute(spec: SpecIndex, chapter: ChapterSummary): RouteMeta {
  const where = /^\d+$/.test(chapter.number) ? `chapter ${chapter.number}` : `Annex ${chapter.number}`;
  return {
    path: chapterPath(spec, chapter.slug),
    kind: 'floorspec-chapter',
    title: `${chapterLabel(chapter)} — ${specName(spec)} — ${BRAND}`,
    description: `${specName(spec)} (${isCurrent(spec) ? 'Draft' : 'an earlier Draft, kept as published'}), ${where}: ${chapter.summary}.`,
    doc: chapter.slug,
    spec: spec.spec,
    version: spec.version,
  };
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

  // A page known by another address — a renamed slug, a trailing slash, a versioned link to the
  // current Floorspec draft — redirects to its canonical one.
  return { meta, redirect: renamed || trailingSlash || meta.path !== path };
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
  for (const spec of [...SPECS, ...EARLIER]) {
    for (const chapter of spec.chapters) routes.push(chapterRoute(spec, chapter));
  }
  routes.push(floorspecRoute(['floorspec', 'coverage'])!);
  if (EXTENSIONS.length) routes.push(registryRoute());
  for (const ext of EXTENSIONS) routes.push(extensionRoute(ext));
  for (const lib of LIBRARIES) {
    routes.push(libraryRoute(lib));
    for (const version of lib.versions) routes.push(libraryRoute(lib, version));
  }
  return routes;
}

export const NOT_FOUND_TITLE = `Not found — ${BRAND}`;
