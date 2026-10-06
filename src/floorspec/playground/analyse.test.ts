/**
 * The playground validates a file once (DI-T-10.8): `analyse` evaluates it with the page's reader,
 * and every plan drawn afterwards comes from that one evaluation (render2d's renderEvaluation, which
 * never validates) — never from renderPlan, which would validate the document again on every level
 * switch, theme change and highlight. The engine's exports are wrapped in spies that call through.
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as engine from '../../../vendor/d3-floorspec/engine.js';
import { analyse, derivedOf, drawPlan } from './analyse';

vi.mock('../../../vendor/d3-floorspec/engine.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../vendor/d3-floorspec/engine.js')>();
  return { ...actual, evaluate: vi.fn(actual.evaluate), renderPlan: vi.fn(actual.renderPlan), renderEvaluation: vi.fn(actual.renderEvaluation) };
});

const VENDOR = new URL('../../../vendor/d3-floorspec/', import.meta.url);
const template = (name: string) => new Uint8Array(readFileSync(new URL(`templates/${name}.floorspec.json`, VENDOR)));
const bytesOf = (value: unknown) => new TextEncoder().encode(JSON.stringify(value, null, 2));

/**
 * A sample that requires an official extension (Core 12.1): the ranch, which already uses
 * FS_electrical and FS_plumbing, with FS_electrical in `extensionsRequired` as well. No conformance
 * case of the FS_ extensions at the pinned commit declares one required, so the test makes its own.
 */
function requiringAnExtension(): Uint8Array {
  const doc = JSON.parse(new TextDecoder().decode(template('ranch'))) as Record<string, unknown>;
  expect(Object.keys(doc.extensionsUsed as object)).toContain('FS_electrical');
  return bytesOf({ ...doc, extensionsRequired: ['FS_electrical'] });
}

beforeEach(() => vi.clearAllMocks());

describe('the playground validates each file once (DI-T-10.8)', () => {
  it('evaluates a file once, and draws every level from that evaluation', () => {
    const a = analyse({ name: 'two-storey.floorspec.json', bytes: template('two-storey') });
    expect(engine.evaluate).toHaveBeenCalledTimes(1);
    expect(a.levels.length).toBe(2);

    for (const level of a.levels)
      for (const theme of ['light', 'dark'] as const) {
        const plan = drawPlan(a, level.id, theme);
        expect('svg' in plan && plan.svg.startsWith('<svg')).toBe(true);
      }
    drawPlan(a, a.levels[0]!.id, 'light', [Object.keys(a.evaluation!.document!.walls as object)[0]!]);
    derivedOf(a);

    expect(engine.evaluate).toHaveBeenCalledTimes(1);
    expect(engine.renderPlan).not.toHaveBeenCalled();
    expect(engine.renderEvaluation).toHaveBeenCalledTimes(5);
    for (const [evaluation] of vi.mocked(engine.renderEvaluation).mock.calls) expect(evaluation).toBe(a.evaluation);
  });

  it('draws nothing from a document with errors, and does not try to', () => {
    const doc = JSON.parse(new TextDecoder().decode(template('ranch'))) as { walls: Record<string, { start: string }> };
    doc.walls[Object.keys(doc.walls).sort()[0]!]!.start = 'NO-SUCH-JUNCTION';
    const a = analyse({ name: 'broken.floorspec.json', bytes: bytesOf(doc) });
    expect('reason' in drawPlan(a, a.levels[0]!.id, 'light')).toBe(true);
    expect(engine.evaluate).toHaveBeenCalledTimes(1);
    expect(engine.renderEvaluation).not.toHaveBeenCalled();
    expect(engine.renderPlan).not.toHaveBeenCalled();
  });
});

describe('a document that requires an official extension (DI-T-10.8)', () => {
  it('is one a Core-only reader refuses', () => {
    const ev = engine.evaluate(requiringAnExtension());
    expect(ev.valid).toBe(false);
    expect(ev.diagnostics.map((d) => d.code)).toContain('FS-DOC-002');
  });

  it('is valid to the playground’s reader, and draws in 2D and meshes', () => {
    const a = analyse({ name: 'ranch-requires-electrical.floorspec.json', bytes: requiringAnExtension() });
    expect(a.evaluation?.valid).toBe(true);
    expect(a.errors).toBe(0);
    const plan = drawPlan(a, undefined, 'light');
    expect('svg' in plan && plan.svg.startsWith('<svg')).toBe(true);
    expect(derivedOf(a)).not.toBeNull();
    expect(engine.evaluate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(engine.renderEvaluation).mock.calls[0]![0]).toBe(a.evaluation);
  });
});
