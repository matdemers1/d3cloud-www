/**
 * The playground's samples: the standard's three starter templates (templates/README.md), byte for
 * byte from the Floorspec commit this site publishes — copied into vendor/d3-floorspec/templates/ by
 * scripts/sync-playground.ts. Each is a chunk of its own, fetched only when it is opened.
 */
const RAW = import.meta.glob<string>('../../../vendor/d3-floorspec/templates/*.floorspec.json', { query: '?raw', import: 'default' });

export interface Sample {
  name: string;
  /** Its file under templates/. */
  file: string;
  /** What it is, from templates/README.md. */
  blurb: string;
}

export const SAMPLES: Sample[] = [
  { name: 'Ranch', file: 'ranch.floorspec.json', blurb: 'One storey, 16 rooms, a hip roof' },
  { name: 'Two-storey', file: 'two-storey.floorspec.json', blurb: 'Two storeys, 19 rooms, a gable roof' },
  { name: 'Cabin', file: 'cabin.floorspec.json', blurb: 'A main floor and a loft under a shed roof' },
];

/** A sample's bytes, exactly as the standard publishes them. */
export async function loadSample(sample: Sample): Promise<Uint8Array> {
  const load = RAW[`../../../vendor/d3-floorspec/templates/${sample.file}`];
  if (!load) throw new Error(`No sample ${sample.file}`);
  return new TextEncoder().encode(await load());
}
