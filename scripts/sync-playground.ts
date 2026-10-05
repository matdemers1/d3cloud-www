/**
 * Pins a commit of D3 Floorspec — the reference implementation — and bundles the part of it the
 * /floorspec/playground page runs in the browser (FLR-T-10.2, FLR-REQ-137):
 *
 *   npm run sync:playground [-- <path to the d3-floorspec checkout> [<commit>]]
 *   (or D3_FLOORSPEC_DIR=…; default ../d3-floorspec; the commit defaults to its origin/main)
 *
 * 1. Reads the commit with `git archive` into a temporary directory — never the working tree, which
 *    may hold anyone's uncommitted work — and installs it there with its own lockfile
 *    (`pnpm install --frozen-lockfile --ignore-scripts`), for the four packages the playground needs
 *    and what they depend on: @floorspec/engine (validate, canonicalize, hash, derive),
 *    @floorspec/render2d (the plan SVG), @floorspec/package (.floorspec archives) and
 *    @floorspec/mesh (3D, with manifold-3d's WASM).
 * 2. Builds them there with their own build (`tsc`), and bundles the surface in ENGINE_EXPORTS and
 *    MESH_EXPORTS with esbuild into two browser modules, engine.js and mesh.js, sharing a chunk —
 *    so the page can validate and draw in 2D before the mesher and its WASM are fetched. manifold-3d's
 *    Node-only branch (`import("module")`) is never taken in a browser; it is bundled against an
 *    empty stub. Its embind glue compiles code from strings at start-up, which would need
 *    'unsafe-eval'; EMBIND_PATCHES swaps that for Emscripten's own closure form (see there).
 * 3. Copies the standard's starter templates (templates/*.floorspec.json) byte for byte from the
 *    Floorspec commit this site already publishes (src/floorspec/floorspec.lock.json), read with
 *    `git archive` from ../floorspec (or FLOORSPEC_DIR), as the playground's samples.
 * 4. Checks the result before writing anything: every name the hand-written declarations
 *    (engine.d.ts, mesh.d.ts, from scripts/playground-dts.ts) promise is exported by the bundle, the
 *    bundled engine finds every template valid and draws each of its levels, and every template
 *    meshes byte for byte the same with and without the embind patch (in Node).
 * 5. Writes vendor/d3-floorspec/ — the bundle, manifold.wasm, the declarations, the templates, the
 *    licences of what was bundled — and lock.json, recording both commits, the package versions and
 *    every file's SHA-256. All of it is committed, so CI builds the site without either checkout.
 *    Never hand-edit it; a test holds the files to the lock.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, type Plugin } from 'esbuild';
import { ENGINE_DTS, MESH_DTS } from './playground-dts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkout = resolve(root, process.argv[2] ?? process.env.D3_FLOORSPEC_DIR ?? '../d3-floorspec');
const standard = resolve(root, process.env.FLOORSPEC_DIR ?? '../floorspec');
const out = join(root, 'vendor/d3-floorspec');
const REPO = 'matdemers1/d3-floorspec';
const PNPM = process.env.PNPM ?? 'pnpm';

/** The packages bundled, by directory under packages/. */
const PACKAGES = ['engine', 'render2d', 'package', 'mesh'] as const;

/** What engine.js exports: the playground's whole use of the engine, the plan renderer and the package reader. */
const ENGINE_EXPORTS: Record<string, string[]> = {
  '@floorspec/engine': [
    'evaluate',
    'deriveEvaluation',
    'canonicalize',
    'contentHash',
    'sha256',
    'toHex',
    'CATALOGUE',
    'OFFICIAL_READER',
    'ENGINE_VERSION',
    'CORE_VERSION',
    'IMPLEMENTED_VERSIONS',
    'Package',
  ],
  '@floorspec/render2d': ['renderPlan', 'defaultLevel'],
  '@floorspec/package': ['readPackage', 'isZip', 'PackageError', 'DOCUMENT_NAME'],
};
/** What mesh.js exports. */
const MESH_EXPORTS: Record<string, string[]> = { '@floorspec/mesh': ['loadMesher', 'flatShaded'] };

function fail(message: string): never {
  console.error(`sync-playground: ${message}`);
  process.exit(1);
}

const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;
const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();

/** `git archive <commit> [paths…]` unpacked into `into`. */
function archive(dir: string, commit: string, into: string, paths: string[] = []) {
  const tar = execFileSync('git', ['-C', dir, 'archive', '--format=tar', commit, ...paths], { maxBuffer: 1 << 30 });
  const unpacked = spawnSync('tar', ['-x', '-C', into], { input: tar });
  if (unpacked.status !== 0) fail(`could not unpack ${commit} of ${dir}: ${unpacked.stderr.toString()}`);
}

function run(cwd: string, command: string, args: string[]) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: '1' } });
  if (r.status !== 0) fail(`${command} ${args.join(' ')} failed in ${cwd}:\n${r.stdout}\n${r.stderr}`);
}

// ---------------------------------------------------------------------------------------------
// 1. The commit, read with git archive, installed with its own lockfile.

if (!existsSync(join(checkout, 'packages/engine'))) fail(`no d3-floorspec checkout at ${checkout} (pass a path, or set D3_FLOORSPEC_DIR)`);
const commit = git(checkout, 'rev-parse', '--verify', `${process.argv[3] ?? 'origin/main'}^{commit}`);
const committedAt = git(checkout, 'show', '-s', '--format=%cI', commit);

const standardLock = JSON.parse(readFileSync(join(root, 'src/floorspec/floorspec.lock.json'), 'utf8')) as { repository: string; commit: string };
if (!existsSync(join(standard, '.git')) && !existsSync(join(standard, 'spec'))) fail(`no Floorspec checkout at ${standard} (set FLOORSPEC_DIR)`);

// Its real path: macOS's tmpdir is a symlink, and the bundle's chunk names hash paths relative to it.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'd3-floorspec-sync-')));
const cleanup = () => rmSync(scratch, { recursive: true, force: true });
process.on('exit', cleanup);

const tree = join(scratch, 'tree');
mkdirSync(tree);
archive(checkout, commit, tree);
console.log(`d3-floorspec ${commit.slice(0, 7)} (${committedAt}) → ${tree}`);

run(tree, PNPM, ['install', '--frozen-lockfile', '--ignore-scripts', ...PACKAGES.flatMap((p) => ['--filter', `@floorspec/${p}...`])]);

// ---------------------------------------------------------------------------------------------
// 2. Build with the packages' own build, then bundle what the playground uses.

run(tree, PNPM, [...PACKAGES.flatMap((p) => ['--filter', `@floorspec/${p}`]), 'run', 'build']);

const versions: Record<string, string> = {};
for (const p of PACKAGES) {
  const manifest = JSON.parse(readFileSync(join(tree, 'packages', p, 'package.json'), 'utf8')) as { name: string; version: string };
  versions[manifest.name] = manifest.version;
}

const entries = join(scratch, 'entries');
mkdirSync(entries);
const entryFile = (name: string, exports: Record<string, string[]>) => {
  const file = join(entries, `${name}.ts`);
  writeFileSync(file, Object.entries(exports).map(([from, names]) => `export { ${names.join(', ')} } from '${from}';\n`).join(''));
  return file;
};

const NODE_ONLY = /^(?:node:.*|module|fs|path|url|crypto|worker_threads)$/;
const resolver: Plugin = {
  name: 'd3-floorspec',
  setup(b) {
    // Each package from what its own build wrote.
    b.onResolve({ filter: /^@floorspec\/[a-z0-9]+$/ }, (a) => {
      const name = a.path.split('/')[1]!;
      if (!(PACKAGES as readonly string[]).includes(name)) return { errors: [{ text: `${a.path} is not one of the bundled packages` }] };
      return { path: join(tree, 'packages', name, 'dist/index.js') };
    });
    // manifold-3d's Node branch: only reached when `process.versions.node` is a string.
    b.onResolve({ filter: NODE_ONLY }, (a) => ({ path: a.path, namespace: 'node-only' }));
    b.onLoad({ filter: /.*/, namespace: 'node-only' }, () => ({ contents: 'export default {};\nexport const createRequire = undefined;\n' }));
  },
};

/**
 * manifold-3d 3.x is built with Emscripten's embind, which writes each binding's JavaScript wrapper
 * as a string and compiles it with `new Function` (DYNAMIC_EXECUTION) when the module starts — two
 * places: the invoker of every bound function (craftInvokerFunction) and emval's method callers.
 * A page that allows that needs 'unsafe-eval'. Instead, each is replaced here by the closure
 * Emscripten itself compiles in with DYNAMIC_EXECUTION=0, doing the same steps in the same order
 * — so the playground needs only 'wasm-unsafe-eval'. Each patch must match exactly once (a new
 * manifold-3d fails the sync rather than slipping through), and the sync meshes every template
 * with the patched and the original module in Node and refuses unless they agree byte for byte.
 */
const EMBIND_PATCHES: { what: string; from: string; to: string }[] = [
  {
    what: "embind's invoker (craftInvokerFunction)",
    from: 'let[args,invokerFnBody]=createJsInvoker(argTypes,isClassMethodFunc,returns,isAsync);args.push(invokerFnBody);var invokerFn=newFunc(Function,args)(...closureArgs);',
    to: [
      'var expectedArgCount=argCount-2;',
      'var invokerFn=function(...args){',
      'if(args.length!==expectedArgCount){throwBindingError("function "+humanName+" called with "+args.length+" arguments, expected "+expectedArgCount)}',
      'var destructors=needsDestructorStack?[]:null;var wired=[];var thisWired;var argsWired=new Array(expectedArgCount);',
      'if(isClassMethodFunc){thisWired=argTypes[1]["toWireType"](destructors,this);wired.push(thisWired)}',
      'for(var i=0;i<expectedArgCount;++i){argsWired[i]=argTypes[i+2]["toWireType"](destructors,args[i]);wired.push(argsWired[i])}',
      'var rv=cppInvokerFunc(cppTargetFunc,...wired);',
      'if(needsDestructorStack){runDestructors(destructors)}else{for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var param=i===1?thisWired:argsWired[i-2];if(argTypes[i].destructorFunction!==null){argTypes[i].destructorFunction(param)}}}',
      'if(returns){return argTypes[0]["fromWireType"](rv)}',
      '};',
    ].join(''),
  },
  {
    what: "emval's method caller (__emval_get_method_caller)",
    from: 'params.push(functionBody);var invokerFunction=newFunc(Function,params)(...args);',
    to: [
      'var invokerFunction=function(obj,func,destructorsRef,argsPtr){',
      'var argN=new Array(argCount);var at=0;',
      'for(var i=0;i<argCount;++i){argN[i]=types[i].readValueFromPointer(argsPtr+at);at+=types[i]["argPackAdvance"]}',
      'var rv=kind===1?reflectConstruct(func,argN):kind===0?func.apply(obj,argN):func.apply(argN[0],argN.slice(1));',
      'if(!retType.isVoid){return emval_returnValue(retType,destructorsRef,rv)}',
      '};',
    ].join(''),
  },
];

const embindWithoutEval: Plugin = {
  name: 'embind-without-eval',
  setup(b) {
    b.onLoad({ filter: /manifold-3d[\\/]manifold\.js$/ }, (a) => {
      let source = readFileSync(a.path, 'utf8');
      for (const patch of EMBIND_PATCHES) {
        const found = source.split(patch.from).length - 1;
        if (found !== 1) return { errors: [{ text: `${patch.what}: expected its code once in ${a.path}, found it ${found} times — manifold-3d changed; look again` }] };
        source = source.replace(patch.from, () => patch.to);
      }
      if (/newFunc\(Function/.test(source)) return { errors: [{ text: `${a.path} still compiles code at run time` }] };
      return { contents: source, loader: 'js' };
    });
  },
};

/** For the Node check: the packages from their dist, and Node's own modules left to Node. */
const nodeResolver: Plugin = {
  name: 'd3-floorspec-node',
  setup(b) {
    b.onResolve({ filter: /^@floorspec\/[a-z0-9]+$/ }, (a) => ({ path: join(tree, 'packages', a.path.split('/')[1]!, 'dist/index.js') }));
  },
};

const bundleDir = join(scratch, 'bundle');
const result = await build({
  entryPoints: { engine: entryFile('engine', ENGINE_EXPORTS), mesh: entryFile('mesh', MESH_EXPORTS) },
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  chunkNames: 'shared-[hash]',
  outdir: bundleDir,
  // Paths relative to the scratch directory, whose name is random: chunk names are then the same every run.
  absWorkingDir: scratch,
  metafile: true,
  logLevel: 'warning',
  plugins: [resolver, embindWithoutEval],
});

const outputs = result.metafile.outputs;
const exportsOf = (file: string) => outputs[Object.keys(outputs).find((k) => basename(k) === file)!]?.exports ?? [];
for (const [file, wanted] of [
  ['engine.js', ENGINE_EXPORTS],
  ['mesh.js', MESH_EXPORTS],
] as const) {
  const have = new Set(exportsOf(file));
  for (const name of Object.values(wanted).flat()) if (!have.has(name)) fail(`${file} does not export ${name}`);
}
// Only manifold-3d's guarded Node branch may reach for a Node module: the engine is isomorphic (FLR-ADR-010).
const nodeOnly = new Set<string>();
for (const [file, meta] of Object.entries(result.metafile.inputs))
  for (const i of meta.imports)
    if (i.path.startsWith('node-only:')) {
      if (!/manifold-3d/.test(file)) fail(`${file} imports the Node module ${i.path.slice('node-only:'.length)}; the engine must stay isomorphic`);
      nodeOnly.add(i.path.slice('node-only:'.length));
    }

// manifold-3d's WASM, from the copy mesh was installed with, and the licences of what was bundled.
const meshRequire = createRequire(join(tree, 'packages/mesh/package.json'));
const manifoldDir = dirname(realpathSync(meshRequire.resolve('manifold-3d')));
const manifoldVersion = (JSON.parse(readFileSync(join(manifoldDir, 'package.json'), 'utf8')) as { version: string }).version;
const packageRequire = createRequire(join(tree, 'packages/package/package.json'));
const fflateDir = (() => {
  let dir = dirname(realpathSync(packageRequire.resolve('fflate')));
  while (!existsSync(join(dir, 'package.json')) || basename(dir) !== 'fflate') dir = dirname(dir);
  return dir;
})();
const fflateVersion = (JSON.parse(readFileSync(join(fflateDir, 'package.json'), 'utf8')) as { version: string }).version;

const files = new Map<string, Uint8Array | string>();
for (const name of readdirSync(bundleDir).sort()) files.set(name, readFileSync(join(bundleDir, name)));
files.set('manifold.wasm', readFileSync(join(manifoldDir, 'manifold.wasm')));
files.set('licenses/d3-floorspec.LICENSE', readFileSync(join(tree, 'LICENSE')));
files.set('licenses/manifold-3d.LICENSE', readFileSync(join(manifoldDir, 'LICENSE')));
files.set('licenses/fflate.LICENSE', readFileSync(join(fflateDir, 'LICENSE')));

// ---------------------------------------------------------------------------------------------
// 3. The standard's starter templates, at the commit the site publishes.

const standardTree = join(scratch, 'standard');
mkdirSync(standardTree);
archive(standard, standardLock.commit, standardTree, ['templates', 'LICENSE']);
const templates = readdirSync(join(standardTree, 'templates'))
  .filter((f) => f.endsWith('.floorspec.json'))
  .sort();
if (!templates.length) fail(`floorspec ${standardLock.commit.slice(0, 7)} has no templates/*.floorspec.json`);
for (const t of templates) files.set(`templates/${t}`, readFileSync(join(standardTree, 'templates', t)));
files.set('licenses/floorspec.LICENSE', readFileSync(join(standardTree, 'LICENSE')));

// ---------------------------------------------------------------------------------------------
// 4. Declarations, and a check of the bundle against the templates before anything is written.

files.set('engine.d.ts', ENGINE_DTS);
files.set('mesh.d.ts', MESH_DTS);

const declared = (dts: string) => [...dts.matchAll(/^export (?:declare )?(?:function|const|class) (\w+)/gm)].map((m) => m[1]!);
for (const [dts, wanted] of [
  [ENGINE_DTS, ENGINE_EXPORTS],
  [MESH_DTS, MESH_EXPORTS],
] as const) {
  const names = new Set(declared(dts));
  for (const name of Object.values(wanted).flat()) if (!names.has(name)) fail(`the declarations do not declare ${name}`);
  for (const name of names) if (!Object.values(wanted).flat().includes(name)) fail(`the declarations declare ${name}, which is not bundled`);
}

/**
 * The patch above, checked: the same entry built for Node twice, with and without it, and every
 * template meshed by both. Every part's key, triangles and positions must agree exactly.
 */
async function meshesAgree(): Promise<string[]> {
  type Part = { key: string; mesh: { positions: Float32Array; indices: Uint32Array } };
  type NodeCheck = {
    evaluate: (bytes: Uint8Array, options: unknown) => { document?: object; view?: object };
    deriveEvaluation: (ev: unknown) => unknown;
    OFFICIAL_READER: unknown;
    loadMesher: (options: { locateFile: () => string }) => Promise<{ meshDerived: (doc: object, derived: unknown) => { parts: Part[] } }>;
  };
  const entry = join(entries, 'node-check.ts');
  writeFileSync(entry, "export { evaluate, deriveEvaluation, OFFICIAL_READER } from '@floorspec/engine';\nexport { loadMesher } from '@floorspec/mesh';\n");
  const modules: NodeCheck[] = [];
  for (const [name, plugins] of [
    ['original', [nodeResolver]],
    ['patched', [nodeResolver, embindWithoutEval]],
  ] as const) {
    const dir = join(scratch, `node-${name}`);
    await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', target: 'node22', outdir: dir, absWorkingDir: scratch, logLevel: 'error', plugins: [...plugins] });
    modules.push((await import(pathToFileURL(join(dir, 'node-check.js')).href)) as NodeCheck);
  }
  const wasm = join(manifoldDir, 'manifold.wasm');
  const digest = (parts: Part[]) =>
    sha256(JSON.stringify(parts.map((p) => [p.key, sha256(new Uint8Array(p.mesh.positions.buffer)), sha256(new Uint8Array(p.mesh.indices.buffer))])));
  const lines: string[] = [];
  for (const t of templates) {
    const bytes = new Uint8Array(readFileSync(join(standardTree, 'templates', t)));
    const meshed: Part[][] = [];
    for (const m of modules) {
      const ev = m.evaluate(bytes, m.OFFICIAL_READER);
      const mesher = await m.loadMesher({ locateFile: () => wasm });
      meshed.push(mesher.meshDerived((ev.view ?? ev.document)!, m.deriveEvaluation(ev)).parts);
    }
    const [original, patched] = meshed as [Part[], Part[]];
    if (!original.length || digest(original) !== digest(patched)) fail(`the patched manifold-3d meshes ${t} differently from the original`);
    lines.push(`mesh ${t}: ${original.length} parts, identical with and without the embind patch`);
  }
  return lines;
}

type Engine = typeof import('../vendor/d3-floorspec/engine.js');
const engine = (await import(pathToFileURL(join(bundleDir, 'engine.js')).href)) as Engine;
const report: string[] = [];
for (const t of templates) {
  const bytes = new Uint8Array(readFileSync(join(standardTree, 'templates', t)));
  const ev = engine.evaluate(bytes, engine.OFFICIAL_READER);
  if (!ev.valid || !ev.document) fail(`the bundled engine finds ${t} invalid: ${ev.diagnostics.map((d) => d.code).join(', ')}`);
  const levels = Object.keys((ev.document.levels ?? {}) as Record<string, unknown>);
  for (const level of levels) if (!engine.renderPlan(ev.document, { level }).startsWith('<svg')) fail(`the bundled renderer draws no plan of ${t} ${level}`);
  report.push(`template ${t}: valid, ${ev.diagnostics.length} diagnostics, ${levels.length} levels drawn`);
}

report.push(...(await meshesAgree()));

// ---------------------------------------------------------------------------------------------
// 5. Write.

const lock = {
  repository: REPO,
  commit,
  committedAt,
  packages: versions,
  engine: { version: engine.ENGINE_VERSION, core: engine.CORE_VERSION, reads: engine.IMPLEMENTED_VERSIONS },
  dependencies: { 'manifold-3d': manifoldVersion, fflate: fflateVersion },
  bundledWith: `esbuild ${(JSON.parse(readFileSync(join(root, 'node_modules/esbuild/package.json'), 'utf8')) as { version: string }).version}`,
  standard: { repository: standardLock.repository, commit: standardLock.commit, templates: templates.map((t) => `templates/${t}`) },
  files: Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => [path, sha256(content)])),
};

rmSync(out, { recursive: true, force: true });
for (const [path, content] of files) {
  mkdirSync(dirname(join(out, path)), { recursive: true });
  writeFileSync(join(out, path), content);
}
writeFileSync(join(out, 'lock.json'), json(lock));

for (const [path, content] of files) if (!path.startsWith('licenses/')) report.push(`${path}: ${typeof content === 'string' ? content.length : content.byteLength} bytes`);
if (nodeOnly.size) report.push(`stubbed in manifold-3d's Node branch: ${[...nodeOnly].join(', ')}`);
console.log([`pinned ${REPO}@${commit} and floorspec@${standardLock.commit.slice(0, 7)} → vendor/d3-floorspec/`, ...report].join('\n'));
