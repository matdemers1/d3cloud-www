/**
 * What the playground does with a file (FLR-T-10.2, FLR-REQ-137), with no React and no DOM, so the
 * tests run it as the page does: open it (a JSON document, or a `.floorspec` package — a ZIP holding
 * model.json and the files its assets name), validate it with the reference engine as the reference
 * implementation's reader does (every official extension, Core 12.2), and say what the engine said —
 * its diagnostics exactly as reported, the tiers they fall in, the content hash and whether the
 * file is byte for byte its canonical form.
 *
 * Everything here runs in the browser on bytes the page already holds: nothing is fetched or stored.
 * The engine (vendor/d3-floorspec, pinned by scripts/sync-playground.ts) is a chunk of its own.
 */
import {
  CATALOGUE,
  CORE_VERSION,
  DOCUMENT_NAME,
  OFFICIAL_READER,
  Package,
  PackageError,
  canonicalize,
  contentHash,
  defaultLevel,
  deriveEvaluation,
  evaluate,
  isZip,
  readPackage,
  renderPlan,
  sha256,
  toHex,
  type Derived,
  type Diagnostic,
  type Evaluation,
  type FloorspecDocument,
  type PackagedAsset,
  type Tier,
} from '../../../vendor/d3-floorspec/engine.js';

/** A file the page was given: its name, and its bytes as read. */
export interface Dropped {
  name: string;
  bytes: Uint8Array;
}

/** A `.floorspec` package, as opened. */
export interface PackageInfo {
  /** Where the document is in the archive: model.json, usually. */
  documentPath: string;
  /** The files the document's assets name, which the package holds. */
  files: Map<string, Uint8Array>;
  /** Assets whose file the package does not hold. */
  missing: PackagedAsset[];
  /** Files nothing in the document names. */
  ignored: string[];
}

/** Why a file was not validated at all, or why it is not a Floorspec document. */
export interface NotFloorspec {
  title: string;
  detail: string;
}

export type Check = 'pass' | 'fail' | 'unchecked';

export interface Level {
  id: string;
  name: string;
}

export interface Analysis {
  name: string;
  /** The file's size in bytes, as dropped. */
  size: number;
  kind: 'document' | 'package';
  package?: PackageInfo;
  /** The document's bytes: the file itself, or the package's model.json. */
  documentBytes: Uint8Array;
  /** Set when the file could not be read as Floorspec at all — then `evaluation` may be absent. */
  notFloorspec?: NotFloorspec;
  evaluation?: Evaluation;
  /** The draft the document declares (`"floorspec": "0.3"`), when it declares one. */
  declared?: string;
  /** The extensions the document uses (`extensionsUsed`), with their versions. */
  extensions: [string, string][];
  diagnostics: Diagnostic[];
  /** Parse, document and schema tiers (Core 10.1): did the document get past them? */
  schema: Check;
  /** The invariant tier, and any extension's errors: only checked once the schema tier passed. */
  invariants: Check;
  /** Diagnostics of the lint tier, and any other that is not an error. */
  lints: number;
  errors: number;
  /** For a valid document: its content hash (Core 9.3), and whether the file is its canonical form (9.2) byte for byte. */
  canonical?: { hash: string; byteIdentical: boolean };
  /** SHA-256 of the document's bytes as given. */
  fileSha256: string;
  /** The document's levels, lowest first, when it has any the page can name. */
  levels: Level[];
}

const TIER = new Map<string, Tier>(CATALOGUE.map((entry) => [entry.code, entry.tier]));
const BEFORE_INVARIANTS: ReadonlySet<Tier> = new Set(['configuration', 'parse', 'document', 'schema']);

/** The tier a code belongs to (Core 10.4); an extension's own codes are not in Core's catalogue. */
export const tierOf = (code: string): Tier | 'extension' => TIER.get(code) ?? 'extension';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const encoder = new TextEncoder();

const equalBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * A file that was never meant to be JSON: a NUL in its first kilobyte (binary), or text whose first
 * character is not where a JSON object or array starts.
 */
const notJsonAtAll = (bytes: Uint8Array) => {
  const head = bytes.subarray(0, 1024);
  if (head.includes(0)) return true;
  const first = new TextDecoder().decode(head).replace(/^\uFEFF/, '').trimStart().charAt(0);
  return first !== '' && first !== '{' && first !== '[';
};

function levelsOf(value: unknown): Level[] {
  if (!isObject(value) || !isObject(value.levels)) return [];
  const levels = Object.entries(value.levels).filter((entry): entry is [string, Record<string, unknown>] => isObject(entry[1]));
  const elevation = (l: Record<string, unknown>) => (typeof l.elevation === 'number' ? l.elevation : 0);
  return levels
    .sort(([ia, a], [ib, b]) => elevation(a) - elevation(b) || (ia < ib ? -1 : ia > ib ? 1 : 0))
    .map(([id, l]) => ({ id, name: typeof l.name === 'string' && l.name.trim() ? l.name : id }));
}

/** The package reader's reason as a sentence: "This is not a ZIP archive: it is too short." */
const sentence = (message: string) => `${message.charAt(0).toUpperCase()}${message.slice(1)}${/[.!?]$/.test(message) ? '' : '.'}`;

/** A package the page could not open: the reader's own reason, which names what to do. */
function packageProblem(error: unknown): NotFloorspec {
  if (error instanceof PackageError) {
    if (error.code === 'not-a-zip' || error.code === 'corrupt')
      return { title: 'This is not a .floorspec package.', detail: `A .floorspec package is a ZIP archive holding ${DOCUMENT_NAME} and the files its assets name. ${sentence(error.message)}` };
    return { title: 'This .floorspec package could not be opened.', detail: `${sentence(error.message)} (${error.code})` };
  }
  return { title: 'This .floorspec package could not be opened.', detail: error instanceof Error ? error.message : String(error) };
}

/**
 * Open and validate a file. Never throws: a file the page cannot use says why in `notFloorspec`,
 * and a document the engine finds invalid still has every diagnostic.
 */
export function analyse(file: Dropped): Analysis {
  /** A file the engine never sees: a package that would not open, or a .floorspec that is not one. */
  const refused = (notFloorspec: NotFloorspec): Analysis => ({
    name: file.name,
    size: file.bytes.byteLength,
    kind: 'package',
    documentBytes: file.bytes,
    notFloorspec,
    extensions: [],
    diagnostics: [],
    schema: 'unchecked',
    invariants: 'unchecked',
    lints: 0,
    errors: 0,
    fileSha256: toHex(sha256(file.bytes)),
    levels: [],
  });

  let kind: Analysis['kind'] = 'document';
  let documentBytes = file.bytes;
  let pkg: PackageInfo | undefined;
  if (isZip(file.bytes)) {
    try {
      const opened = readPackage(file.bytes);
      kind = 'package';
      documentBytes = opened.document;
      pkg = { documentPath: opened.documentPath, files: opened.files, missing: opened.missing, ignored: opened.ignored };
    } catch (error) {
      return refused(packageProblem(error));
    }
  } else if (/\.floorspec$/i.test(file.name)) {
    return refused({
      title: 'This is not a .floorspec package.',
      detail: `A .floorspec package is a ZIP archive holding ${DOCUMENT_NAME} and the files its assets name; this file is not a ZIP archive.`,
    });
  }

  const evaluation = evaluate(documentBytes, { ...OFFICIAL_READER, ...(pkg && { package: new Package(pkg.files) }) });
  const diagnostics = evaluation.diagnostics;
  const value = evaluation.value;
  const declared = isObject(value) && typeof value.floorspec === 'string' ? value.floorspec : undefined;
  const extensions = isObject(value) && isObject(value.extensionsUsed) ? Object.entries(value.extensionsUsed).map(([n, v]): [string, string] => [n, typeof v === 'string' ? v : '']) : [];

  const early = diagnostics.filter((d) => BEFORE_INVARIANTS.has(tierOf(d.code) as Tier));
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const schema: Check = early.some((d) => d.severity === 'error') ? 'fail' : 'pass';
  const invariants: Check = schema === 'fail' ? 'unchecked' : errors.some((d) => !BEFORE_INVARIANTS.has(tierOf(d.code) as Tier)) ? 'fail' : 'pass';
  const lints = diagnostics.filter((d) => d.severity !== 'error').length;

  let notFloorspec: NotFloorspec | undefined;
  if (value === undefined) {
    // The engine could not parse it (FS-JSON-001…003): say what the file is, before the codes.
    notFloorspec = notJsonAtAll(documentBytes)
      ? { title: 'This is not a Floorspec file.', detail: 'A Floorspec document is a JSON text, and a .floorspec package is a ZIP archive; this file is neither.' }
      : { title: 'This is not well-formed JSON.', detail: 'A Floorspec document is a UTF-8 JSON text (Core 9.1). The engine stopped at parsing; its diagnostics say where.' };
  } else if (declared === undefined) {
    notFloorspec = {
      title: 'This is JSON, but not a Floorspec document.',
      detail: `A Floorspec document is a JSON object whose "floorspec" member names the draft it is written to, as "floorspec": "${CORE_VERSION}" (Core 1.1).`,
    };
  }

  let canonical: Analysis['canonical'];
  if (evaluation.valid && evaluation.document) {
    canonical = { hash: contentHash(evaluation.document), byteIdentical: equalBytes(encoder.encode(canonicalize(evaluation.document)), documentBytes) };
  }

  return {
    name: file.name,
    size: file.bytes.byteLength,
    kind,
    ...(pkg && { package: pkg }),
    documentBytes,
    ...(notFloorspec && { notFloorspec }),
    evaluation,
    ...(declared !== undefined && { declared }),
    extensions,
    diagnostics,
    schema,
    invariants,
    lints,
    errors: errors.length,
    ...(canonical && { canonical }),
    fileSha256: toHex(sha256(documentBytes)),
    levels: levelsOf(value),
  };
}

/** A plan of one level, or why there is none. */
export type Plan = { svg: string } | { reason: string };

/**
 * One level's plan, drawn by the reference renderer from what the engine derives — so only for a
 * document a Core reader finds valid. `highlight` draws those elements in the accent.
 */
export function drawPlan(a: Analysis, level: string | undefined, theme: 'light' | 'dark', highlight: readonly string[] = []): Plan {
  const document = a.evaluation?.document;
  if (!document) return { reason: a.notFloorspec ? 'Nothing to draw.' : 'The document did not pass the schema tier, so the engine derives no geometry to draw.' };
  if (!a.levels.length) return { reason: 'The document has no levels to draw.' };
  try {
    return { svg: renderPlan(document, { level: level ?? defaultLevel(document), theme, highlight }) };
  } catch (error) {
    if (!a.evaluation?.valid) return { reason: 'The document has errors, so the engine derives no rooms or wall outlines from it: below is each wall’s line as written.' };
    return { reason: `The plan renderer could not draw this level: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** A wall or separator as written: its two junctions' positions, in base units, y up. */
export interface Segment {
  id: string;
  kind: 'wall' | 'separator';
  a: [number, number];
  b: [number, number];
}

/**
 * What can still be drawn of a document the engine derives nothing from: each wall's and separator's
 * line between its junctions, as written, on one level — when the document is shaped enough for it.
 */
export function skeleton(a: Analysis, level: string | undefined): Segment[] {
  const value = a.evaluation?.value;
  if (!isObject(value) || !isObject(value.junctions)) return [];
  const junctions = value.junctions;
  const at = (id: unknown): [number, number] | undefined => {
    const j = typeof id === 'string' ? junctions[id] : undefined;
    if (!isObject(j) || !Array.isArray(j.position) || j.position.length !== 2) return undefined;
    const [x, y] = j.position;
    return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
  };
  const segments: Segment[] = [];
  for (const kind of ['wall', 'separator'] as const) {
    const collection = value[`${kind}s`];
    if (!isObject(collection)) continue;
    for (const [id, e] of Object.entries(collection)) {
      if (!isObject(e) || (level !== undefined && e.level !== level)) continue;
      const p = at(e.start);
      const q = at(e.end);
      if (p && q) segments.push({ id, kind, a: p, b: q });
    }
  }
  return segments;
}

/** What the mesher needs: the document as seen in its derived design, and what the engine derives. Null when nothing is derived. */
export function derivedOf(a: Analysis): { document: FloorspecDocument; derived: Derived } | null {
  const ev = a.evaluation;
  if (!ev?.valid || !ev.document) return null;
  try {
    return { document: ev.view ?? ev.document, derived: deriveEvaluation(ev) };
  } catch {
    return null;
  }
}
