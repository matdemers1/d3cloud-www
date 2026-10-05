import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyse, drawPlan, skeleton, derivedOf } from './analyse';
import { formatSize, shortHash } from './format';
import { SAMPLES } from './samples';
import { canonicalize } from '../../../vendor/d3-floorspec/engine.js';
import standardLock from '../floorspec.lock.json';

const VENDOR = new URL('../../../vendor/d3-floorspec/', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('lock.json', VENDOR), 'utf8')) as {
  commit: string;
  standard: { commit: string; templates: string[] };
  files: Record<string, string>;
};
const template = (name: string) => new Uint8Array(readFileSync(new URL(`templates/${name}.floorspec.json`, VENDOR)));
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const bytesOf = (value: unknown) => new TextEncoder().encode(JSON.stringify(value, null, 2));

/** A ZIP archive of stored (uncompressed) entries: enough to make a .floorspec package in a test. */
function zip(entries: Record<string, Uint8Array | string>): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (b: Uint8Array) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const data = Buffer.from(typeof content === 'string' ? new TextEncoder().encode(content) : content);
    const fileName = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(0, 8); // stored
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(fileName.length, 26);
    local.push(header, fileName, data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(fileName.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, fileName);
    offset += header.length + fileName.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, cd, end]));
}

describe('the vendored engine (FLR-T-10.2)', () => {
  it('is every file the lock records, byte for byte, and nothing else', () => {
    const walk = (dir: URL, prefix = ''): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(new URL(`${e.name}/`, dir), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
      );
    const files = walk(VENDOR).filter((f) => f !== 'lock.json').sort();
    expect(files).toEqual(Object.keys(lock.files).sort());
    for (const [path, digest] of Object.entries(lock.files)) {
      expect(createHash('sha256').update(readFileSync(new URL(path, VENDOR))).digest('hex'), path).toBe(digest);
    }
  });

  it('takes its samples from the Floorspec commit this site publishes', () => {
    // Moving the standard's pin (npm run sync:floorspec) means re-running npm run sync:playground.
    expect(lock.standard.commit).toBe(standardLock.commit);
    expect(lock.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(SAMPLES.map((s) => `templates/${s.file}`).sort()).toEqual([...lock.standard.templates].sort());
    expect(SAMPLES.map((s) => s.name)).toEqual(['Ranch', 'Two-storey', 'Cabin']);
  });

  it('ships manifold-3d’s WebAssembly beside the mesher, and no Node module in the bundle', () => {
    expect(existsSync(new URL('manifold.wasm', VENDOR))).toBe(true);
    for (const file of Object.keys(lock.files).filter((f) => f.endsWith('.js'))) {
      const source = readFileSync(new URL(file, VENDOR), 'utf8');
      expect(source, file).not.toMatch(/from\s*["'](?:node:|fs|module)["']/);
      // CSP: the playground allows WebAssembly compilation, never eval — and embind's run-time
      // code generation (a Function constructed from strings) is patched out by the sync.
      expect(source, file).not.toMatch(/\bnew Function\(|\beval\(|\(Function,/);
    }
  });
});

describe('the playground validates with the browser engine', () => {
  it.each(['ranch', 'two-storey', 'cabin'])('finds the %s template valid, with no errors', (name) => {
    const a = analyse({ name: `${name}.floorspec.json`, bytes: template(name) });
    expect(a.notFloorspec).toBeUndefined();
    expect(a.evaluation?.valid).toBe(true);
    expect(a.errors).toBe(0);
    expect(a.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(a.schema).toBe('pass');
    expect(a.invariants).toBe('pass');
    expect(a.declared).toBe('0.3');
    expect(a.extensions.map(([n]) => n).sort()).toEqual(['FS_electrical', 'FS_plumbing']);
    expect(a.levels.length).toBeGreaterThan(0);
    for (const level of a.levels) {
      const plan = drawPlan(a, level.id, 'light');
      expect('svg' in plan && plan.svg.startsWith('<svg')).toBe(true);
    }
    expect(derivedOf(a)).not.toBeNull();
    // A selected diagnostic's elements are drawn in the Floorspec accent.
    const wall = Object.keys((a.evaluation!.document!.walls ?? {}) as Record<string, unknown>).sort()[0]!;
    const lit = drawPlan(a, a.levels[0]!.id, 'light', [wall]);
    expect('svg' in lit && lit.svg.toLowerCase().includes('#b5d84a')).toBe(true);
  });

  it('reports what the engine reports for the samples, and nothing of its own', () => {
    // templates/README.md: the ranch has no diagnostics; the two-storey and the cabin one FS-LINT-003 each.
    expect(analyse({ name: 'ranch.floorspec.json', bytes: template('ranch') }).diagnostics).toEqual([]);
    for (const name of ['two-storey', 'cabin']) {
      const a = analyse({ name, bytes: template(name) });
      expect(a.diagnostics.map((d) => [d.code, d.severity])).toEqual([['FS-LINT-003', 'info']]);
      expect(a.lints).toBe(1);
    }
  });

  it('shows a broken document’s codes, its severities and the elements they name', () => {
    const doc = JSON.parse(text(template('ranch'))) as { walls: Record<string, { start: string }> };
    const [wall] = Object.keys(doc.walls).sort();
    doc.walls[wall!]!.start = 'NO-SUCH-JUNCTION';
    const a = analyse({ name: 'broken.floorspec.json', bytes: bytesOf(doc) });
    expect(a.evaluation?.valid).toBe(false);
    expect(a.schema).toBe('pass');
    expect(a.invariants).toBe('fail');
    const ref = a.diagnostics.find((d) => d.code === 'FS-INV-002');
    expect(ref).toMatchObject({ severity: 'error', elements: [wall] });
    expect(a.canonical).toBeUndefined();
    // Nothing is derived, so the plan says why — and the walls can still be drawn as written.
    const plan = drawPlan(a, a.levels[0]!.id, 'light');
    expect('reason' in plan).toBe(true);
    expect(skeleton(a, a.levels[0]!.id).length).toBeGreaterThan(0);
    expect(derivedOf(a)).toBeNull();
  });

  it('stops at the schema tier, and says so', () => {
    const a = analyse({ name: 'bad.json', bytes: bytesOf({ floorspec: '0.3', levels: 5 }) });
    expect(a.diagnostics.map((d) => d.code)).toContain('FS-SCH-001');
    expect(a.schema).toBe('fail');
    expect(a.invariants).toBe('unchecked');
    expect(a.notFloorspec).toBeUndefined();
  });

  it('says a file that is not Floorspec is not, with the engine’s own diagnostics', () => {
    const notes = analyse({ name: 'notes.txt', bytes: new TextEncoder().encode('just some notes') });
    expect(notes.notFloorspec?.title).toBe('This is not a Floorspec file.');
    expect(notes.diagnostics.map((d) => d.code)).toEqual(['FS-JSON-001']);
    const notJson = analyse({ name: 'house.json', bytes: new TextEncoder().encode('{ "floorspec": "0.3", ') });
    expect(notJson.notFloorspec?.title).toBe('This is not well-formed JSON.');
    expect(notJson.diagnostics.map((d) => d.code)).toEqual(['FS-JSON-001']);
    const image = analyse({ name: 'photo.png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]) });
    expect(image.notFloorspec?.title).toBe('This is not a Floorspec file.');
    const other = analyse({ name: 'package.json', bytes: bytesOf({ name: 'x', version: '1.0.0' }) });
    expect(other.notFloorspec?.title).toBe('This is JSON, but not a Floorspec document.');
    expect(other.diagnostics.length).toBeGreaterThan(0);
  });

  it('gives the content hash, and says whether the file is byte for byte its canonical form', () => {
    const raw = analyse({ name: 'ranch.floorspec.json', bytes: template('ranch') });
    const canonicalBytes = new TextEncoder().encode(canonicalize(raw.evaluation!.document));
    const canon = analyse({ name: 'ranch.canonical.json', bytes: canonicalBytes });
    expect(canon.canonical).toEqual({ hash: raw.canonical!.hash, byteIdentical: true });
    // The template is written for people, not in canonical form; its content hash is the same.
    expect(raw.canonical?.byteIdentical).toBe(false);
    expect(raw.canonical?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(shortHash(raw.canonical!.hash)).toBe(`${raw.canonical!.hash.slice(0, 4)}…${raw.canonical!.hash.slice(-4)}`);
    expect(raw.fileSha256).toBe(createHash('sha256').update(template('ranch')).digest('hex'));
  });

  it('reads a .floorspec package: model.json and the files its assets name', () => {
    const pkg = zip({ 'model.json': template('cabin'), 'notes/readme.txt': 'hello' });
    const a = analyse({ name: 'cabin.floorspec', bytes: pkg });
    expect(a.kind).toBe('package');
    expect(a.package?.documentPath).toBe('model.json');
    expect(a.package?.ignored).toEqual(['notes/readme.txt']);
    expect(a.evaluation?.valid).toBe(true);
    expect(text(a.documentBytes)).toBe(text(template('cabin')));
    expect(a.size).toBe(pkg.byteLength);
    // A folder zipped whole: the document inside its one top-level folder.
    expect(analyse({ name: 'house.floorspec', bytes: zip({ 'house/model.json': template('ranch') }) }).package?.documentPath).toBe('house/model.json');
  });

  it('refuses a package with no document, and a .floorspec that is not a ZIP, saying why', () => {
    const empty = analyse({ name: 'empty.floorspec', bytes: zip({ 'readme.txt': 'nothing here' }) });
    expect(empty.notFloorspec?.title).toBe('This .floorspec package could not be opened.');
    expect(empty.notFloorspec?.detail).toContain('no-document');
    expect(empty.evaluation).toBeUndefined();
    const fake = analyse({ name: 'fake.floorspec', bytes: template('ranch') });
    expect(fake.notFloorspec?.title).toBe('This is not a .floorspec package.');
    const truncated = analyse({ name: 'bad.floorspec', bytes: new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]) });
    expect(truncated.notFloorspec?.detail).toMatch(/model\.json and the files its assets name\. [A-Z]/);
  });

  it('formats sizes as the drop zone shows them', () => {
    expect(formatSize(312)).toBe('312 bytes');
    expect(formatSize(41844)).toBe('41 KB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
