import type { ReactNode } from 'react';
import type { Project } from '../../content/projects';
import { DeepIndex, DeepSection, Figure, FlowDown, type DeepEntry } from '../../components/Deep';
import { Accent, Quiet } from '../../components/Marketing';

/**
 * Clearwhen, explained — built around the thing it is about: a 24-hour day.
 * Each section's code is a time on that day, and most drawings are the same
 * ribbon of hours with your windows laid over it.
 *
 * Product facts come from the Clearwhen repository: the five-window cap and
 * the three starter windows (TimeWindow.swift), the severity ladder
 * (WeatherKind.swift), worst-case-wins and the overlap rule
 * (WindowSummarizer.swift), the timing phrases (PrecipTiming.swift — ported
 * below so every phrase on this page is the app's own wording), the source
 * chain and its seven days (ForecastChain.swift), the briefing
 * (BriefingScheduler.swift, SettingsView.swift), calendar handling
 * (CalendarService.swift, CalendarEvent.swift), widget families
 * (ClearwhenWidget.swift), the watch payload (WatchPayload.swift), and what
 * else leaves the phone: naming your place with Apple's geocoder
 * (LocationService.placeName) and city search (LocationsListView.swift).
 * Every forecast drawn is an illustration and is captioned as one.
 */

const ENTRIES: DeepEntry[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'walkthrough', label: 'How you use it' },
  { id: 'how', label: 'How it works' },
  { id: 'worst', label: 'Worst case wins' },
  { id: 'timing', label: 'When it turns' },
  { id: 'week', label: 'Your week' },
  { id: 'glance', label: 'Where it shows' },
  { id: 'private', label: 'What stays put' },
  { id: 'why', label: 'Why this way' },
];

/* ---------------------------------------------------------------- The model, in miniature */

/** WeatherKind, in ladder order: worst-case-wins is just "the highest rung". */
const KINDS = [
  'clear',
  'partly',
  'cloudy',
  'fog',
  'wind',
  'drizzle',
  'rain',
  'heavyRain',
  'snow',
  'sleet',
  'thunder',
  'severe',
] as const;
type Kind = (typeof KINDS)[number];

const LABEL: Record<Kind, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Foggy',
  wind: 'Windy',
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavyRain: 'Heavy rain',
  snow: 'Snow',
  sleet: 'Sleet',
  thunder: 'Thunderstorms',
  severe: 'Severe weather',
};

const NOUN: Partial<Record<Kind, string>> = {
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavyRain: 'Heavy rain',
  snow: 'Snow',
  sleet: 'Icy mix',
  thunder: 'Storms',
  severe: 'Severe weather',
};

const rank = (kind: Kind) => KINDS.indexOf(kind);
const worstOf = (kinds: Kind[]) => kinds.reduce<Kind>((a, b) => (rank(b) > rank(a) ? b : a), 'clear');
const isWet = (kind: Kind) => rank(kind) >= rank('drizzle');

interface Hour {
  hour: number;
  kind: Kind;
}

/** Hours `from`..`to`, clear unless named. An illustration's forecast. */
function day(from: number, to: number, named: Record<number, Kind> = {}): Hour[] {
  return Array.from({ length: to - from }, (_, i) => ({ hour: from + i, kind: named[from + i] ?? 'clear' }));
}

/** Every hour that touches the half-open span [start, end) counts — the app's overlap rule. */
function within(hours: Hour[], start: number, end: number) {
  return hours.filter((h) => h.hour < end && h.hour + 1 > start);
}

const verdict = (hours: Hour[], start: number, end: number) => worstOf(within(hours, start, end).map((h) => h.kind));

const meridiem = (hour: number) => (hour % 24 < 12 ? 'AM' : 'PM');
const twelve = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);
const clock = (hour: number) => `${twelve(hour)} ${meridiem(hour)}`;

/** Clock time for a fractional hour: 7.5 → "7:30". */
function clockShort(hour: number) {
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  return minutes ? `${twelve(whole)}:${String(minutes).padStart(2, '0')}` : `${twelve(whole)}`;
}

/** An event's hours: "9–9:30 AM", or "11 AM–3 PM" across noon. */
function span(start: number, end: number) {
  const [a, b] = [meridiem(Math.floor(start)), meridiem(Math.floor(end))];
  return a === b ? `${clockShort(start)}–${clockShort(end)} ${b}` : `${clockShort(start)} ${a}–${clockShort(end)} ${b}`;
}

interface Spell {
  start: number;
  end: number;
  kind: Kind;
}

/** PrecipTiming.spells: contiguous runs of wet hours. */
function spells(hours: Hour[]): Spell[] {
  const out: Spell[] = [];
  let run: Hour[] = [];
  const close = () => {
    if (run.length) out.push({ start: run[0].hour, end: run[run.length - 1].hour + 1, kind: worstOf(run.map((h) => h.kind)) });
    run = [];
  };
  for (const hour of hours) {
    if (isWet(hour.kind)) {
      if (run.length && hour.hour !== run[run.length - 1].hour + 1) close();
      run.push(hour);
    } else close();
  }
  close();
  return out;
}

/** PrecipTiming.range: "2–5 PM" when both ends share a meridiem, "11 AM–2 PM" when not. */
function range(spell: Spell) {
  const [a, b] = [spell.start % 24, spell.end % 24];
  return meridiem(a) === meridiem(b)
    ? `${twelve(a)}–${twelve(b)} ${meridiem(a)}`
    : `${twelve(a)} ${meridiem(a)}–${twelve(b)} ${meridiem(b)}`;
}

/** PrecipTiming.phrase: the line a day card shows, or null when the range is dry. */
function phrase(hours: Hour[]): string | null {
  const found = spells(hours);
  if (!found.length) return null;
  const noun = NOUN[worstOf(found.map((s) => s.kind))] ?? 'Rain';
  const total = found.reduce((sum, s) => sum + (s.end - s.start), 0);
  if (total >= 8) return `${noun} most of the day`;
  if (found.length === 1) {
    const [only] = found;
    return only.end - only.start === 1
      ? `${noun} for an hour, ${range(only)}`
      : `${noun} ${range(only)} · ${only.end - only.start} hrs`;
  }
  if (found.length === 2) return `${noun} ${range(found[0])} and ${range(found[1])}`;
  return `${noun} on and off, ${range({ start: found[0].start, end: found[found.length - 1].end, kind: 'rain' })}`;
}

/* ---------------------------------------------------------------- Shared drawing parts */

interface Band {
  key: string;
  start: number;
  end: number;
  mark?: string;
}

/** Hour labels under a ribbon, placed in HTML so they stay readable on a phone. */
function Axis({ from, to, ticks }: { from: number; to: number; ticks: number[] }) {
  return (
    <div aria-hidden="true" className="relative h-4 font-mono text-11 text-fg-faint">
      {ticks.map((t, i) => (
        <span
          key={t}
          className={`absolute top-0 ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
          style={{ left: `${((t - from) / (to - from)) * 100}%` }}
        >
          {clock(t).replace(' AM', 'a').replace(' PM', 'p')}
        </span>
      ))}
    </div>
  );
}

/**
 * A stretch of the day: one bar per hour (its chance of rain), wet hours lit,
 * your windows as shaded bands behind. The label says it all for a reader.
 */
function Ribbon({
  hours,
  chance,
  bands,
  accent,
  from,
  to,
  ticks,
  label,
  tall = false,
}: {
  hours: Hour[];
  chance?: number[];
  bands: Band[];
  accent: string;
  from: number;
  to: number;
  ticks: number[];
  label: string;
  tall?: boolean;
}) {
  const pct = (h: number) => ((h - from) / (to - from)) * 100;
  return (
    <div role="img" aria-label={label} className="flex flex-col gap-2">
      <div aria-hidden="true" className={`relative ${tall ? 'h-44 sm:h-56' : 'h-16'}`}>
        {bands.map((b) => (
          <span
            key={b.key}
            className="absolute inset-y-0 rounded-sm border border-border-field bg-surface-raised"
            style={{ left: `${pct(b.start)}%`, width: `${pct(b.end) - pct(b.start)}%` }}
          >
            {b.mark && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 font-mono text-11 text-fg">{b.mark}</span>
            )}
          </span>
        ))}
        <div className={`absolute inset-x-0 bottom-0 flex items-end gap-px ${tall ? 'top-7' : 'top-2'}`}>
          {hours.map((h, i) => {
            const wet = isWet(h.kind);
            const height = chance ? Math.max(chance[i], 3) : wet ? 100 : 12;
            return (
              <span
                key={h.hour}
                className={`relative flex-1 rounded-t-xs ${wet ? '' : 'bg-border-field'}`}
                style={{ height: `${height}%`, ...(wet ? { backgroundColor: accent } : {}) }}
              />
            );
          })}
        </div>
      </div>
      <span aria-hidden="true" className="h-px bg-border-field" />
      <Axis from={from} to={to} ticks={ticks} />
    </div>
  );
}

/** A verdict line: the window, its hours, and what it gets. */
function VerdictRow({
  mark,
  name,
  when,
  kind,
  accent,
  detail,
}: {
  mark?: string;
  name: string;
  when: string;
  kind: Kind;
  accent: string;
  detail?: string | null;
}) {
  const wet = isWet(kind);
  return (
    <li className="flex items-center gap-4 py-3">
      {mark && (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border-field bg-surface-raised font-mono text-11 text-fg"
        >
          {mark}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-14 font-semibold text-fg">{name}</span>
        <span className="font-mono text-12 text-fg-muted">{when}</span>
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        <span className="flex items-center gap-2 text-14 text-fg">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${wet ? '' : 'border border-fg-faint'}`}
            style={wet ? { backgroundColor: accent } : undefined}
          />
          {LABEL[kind]}
        </span>
        {detail && <span className="text-12 text-fg-muted">{detail}</span>}
      </span>
    </li>
  );
}

/* ---------------------------------------------------------------- 00:00 · The problem */

const STARTER = [
  { name: 'Commute', start: 7, end: 9, days: 'Mon–Fri', mask: [0, 1, 1, 1, 1, 1, 0] },
  { name: 'Workday', start: 9, end: 17, days: 'Mon–Fri', mask: [0, 1, 1, 1, 1, 1, 0] },
  { name: 'Dog Walk', start: 18, end: 19, days: 'Every day', mask: [1, 1, 1, 1, 1, 1, 1] },
];

/** An illustrative day: rain overnight, and again just before midnight. */
const NIGHT_RAIN = [
  75, 80, 70, 30, 15, 10, 5, 0, 0, 0, 0, 5, 5, 5, 10, 10, 5, 0, 0, 5, 15, 25, 40, 80,
];
const NIGHT_DAY: Hour[] = NIGHT_RAIN.map((c, hour) => ({
  hour,
  kind: c >= 60 ? 'rain' : c >= 25 ? 'cloudy' : c >= 10 ? 'partly' : 'clear',
}));

function Problem({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="problem"
      code="00:00"
      label="The problem"
      title={
        <>
          “Rain today” — <Accent>while you’re asleep.</Accent>
        </>
      }
      lede="A daily forecast squeezes all 24 hours into one word, including the hours you sleep through. You don’t live in a whole day. You live in pieces of it: the drive in, the hours at your desk, the walk after dinner."
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
        <Figure caption="An illustration, not a real forecast. Each bar is one hour’s chance of rain; the lit ones are the rain. The shaded bands are the three windows a new install starts with.">
          <Ribbon
            tall
            hours={NIGHT_DAY}
            chance={NIGHT_RAIN}
            bands={STARTER.map((w, i) => ({ key: w.name, start: w.start, end: w.end, mark: String(i + 1) }))}
            accent={accent}
            from={0}
            to={24}
            ticks={[0, 6, 12, 18, 24]}
            label="An illustrative day. Rain falls from midnight to 3 AM and again from 11 PM. The commute from 7 to 9 AM, the workday from 9 to 5 and the dog walk from 6 to 7 PM all fall in dry hours."
          />
        </Figure>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border-field p-5">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">A daily forecast says</span>
            <span className="text-20 font-semibold text-fg line-through decoration-danger decoration-2">Rain · 80%</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Your windows say</span>
            <ul className="flex flex-col divide-y divide-border">
              {STARTER.map((w, i) => (
                <VerdictRow
                  key={w.name}
                  mark={String(i + 1)}
                  name={w.name}
                  when={`${clock(w.start)} – ${clock(w.end)}`}
                  kind={verdict(NIGHT_DAY, w.start, w.end)}
                  accent={accent}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 07:00 · How you use it */

function MiniCard({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="mt-auto flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      {children}
    </div>
  );
}

function StepWindows({ accent }: { accent: string }) {
  return (
    <MiniCard>
      {STARTER.map((w) => (
        <div key={w.name} className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-13 text-fg">{w.name}</span>
            <span className="font-mono text-11 text-fg-muted">
              {clock(w.start)}–{clock(w.end)}
            </span>
          </span>
          <span className="flex gap-0.5">
            {w.mask.map((on, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full ${on ? '' : 'bg-border-field'}`}
                style={on ? { backgroundColor: accent } : undefined}
              />
            ))}
          </span>
        </div>
      ))}
      <span className="text-12 text-fg-faint">+ Add window</span>
    </MiniCard>
  );
}

const STORM_EVENING = day(0, 24, { 18: 'thunder', 19: 'thunder', 20: 'thunder', 21: 'thunder', 12: 'cloudy', 13: 'cloudy' });

function Chip({ name, kind, accent }: { name: string; kind: Kind; accent: string }) {
  const wet = isWet(kind);
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-12 text-fg">
      <span
        className={`size-1.5 rounded-full ${wet ? '' : 'border border-fg-faint'}`}
        style={wet ? { backgroundColor: accent } : undefined}
      />
      {name} · {LABEL[kind]}
    </span>
  );
}

function StepVerdicts({ accent }: { accent: string }) {
  return (
    <MiniCard>
      <span className="text-13 text-fg-muted">Today</span>
      <span className="text-14 font-semibold text-fg">{phrase(within(STORM_EVENING, 7, 22))}</span>
      <span className="flex flex-wrap gap-1.5">
        {STARTER.map((w) => (
          <Chip key={w.name} name={w.name} kind={verdict(STORM_EVENING, w.start, w.end)} accent={accent} />
        ))}
      </span>
    </MiniCard>
  );
}

function StepGlance({ accent }: { accent: string }) {
  return (
    <MiniCard>
      <div className="flex items-center gap-4">
        <span className="flex h-20 w-16 shrink-0 flex-col justify-center gap-1 rounded-lg border-2 border-border-field bg-bg px-2">
          <span className="font-mono text-11 text-fg-muted">Up next</span>
          <span className="text-12 font-semibold text-fg">Dog Walk</span>
          <span className="h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-12 text-fg-muted">Lock Screen</span>
          <span className="text-13 text-fg">Dog Walk · Storms</span>
        </span>
      </div>
    </MiniCard>
  );
}

function StepBriefing({ accent }: { accent: string }) {
  return (
    <MiniCard>
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-xs" style={{ backgroundColor: accent }} />
        <span className="text-12 text-fg-muted">Clearwhen · 7:00 AM</span>
      </span>
      <span className="text-13 font-semibold text-fg">Today in your city</span>
      <span className="text-13 text-fg-muted">Thunderstorms during Dog Walk — starting around 6 PM</span>
    </MiniCard>
  );
}

const STEPS: { title: string; body: string; Mock: (p: { accent: string }) => ReactNode }[] = [
  {
    title: 'Set your windows',
    body: 'Name each one, pick its hours and the days it happens. You start with a commute, a workday and a dog walk to change or delete, and can keep up to five.',
    Mock: StepWindows,
  },
  {
    title: 'Read the verdicts',
    body: 'Each day of the week ahead shows a straight answer per window, and one line saying when the weather turns.',
    Mock: StepVerdicts,
  },
  {
    title: 'Glance, don’t open',
    body: 'Your watch and your widgets show the window you are in, or the next one, with its verdict.',
    Mock: StepGlance,
  },
  {
    title: 'Get a morning briefing',
    body: 'Optional. Pick a time, and each morning a notification covers only the weather that hits your windows.',
    Mock: StepBriefing,
  },
];

function Walkthrough({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="walkthrough"
      code="07:00"
      label="How you use it"
      title={
        <>
          Set it up once. <Accent>Then just glance.</Accent>
        </>
      }
      lede="Most of the work is the first minute: telling Clearwhen when you are actually outside. After that the answers come to you."
      sunken
    >
      <div className="relative">
        <span aria-hidden="true" className="absolute top-5 right-10 left-10 hidden h-px bg-border-field lg:block">
          <span className="flow-x absolute -top-0.75 size-2 rounded-full" style={{ backgroundColor: accent }} />
        </span>
        <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(({ title, body, Mock }, index) => (
            <li key={title} className="flex flex-col gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full border border-border-field bg-bg font-mono text-14 text-fg"
              >
                {index + 1}
              </span>
              <h3 className="text-16 font-semibold text-fg">
                <span className="sr-only">Step {index + 1}: </span>
                {title}
              </h3>
              <p className="text-14 text-fg-muted">{body}</p>
              <Mock accent={accent} />
            </li>
          ))}
        </ol>
        <p className="mt-10 text-13 text-fg-muted">
          The small cards are drawings of each step, not screenshots, and the weather in them is an example.
        </p>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 09:00 · How it works */

function Node({ kicker, title, children, accent }: { kicker?: string; title: string; children?: ReactNode; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-5"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      {kicker && <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{kicker}</span>}
      <span className="text-16 font-semibold text-fg">{title}</span>
      {children && <span className="text-13 text-fg-muted">{children}</span>}
    </div>
  );
}

const SURFACES = ['iPhone', 'Apple Watch', 'Home Screen widgets', 'Lock Screen', 'Morning briefing', 'Mac', 'Apple Vision Pro'];

function HowItWorks({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="how"
      code="09:00"
      label="How it works"
      title={
        <>
          From the forecast <Accent>to your wrist.</Accent>
        </>
      }
      lede="Where the forecast comes from, what Clearwhen does with it, and where the answer turns up. The weather is fetched on your phone and worked out on your phone."
    >
      <div
        role="img"
        aria-label="How Clearwhen works. Your phone asks Apple Weather for an hourly forecast; in the US, the National Weather Service answers if Apple Weather cannot; with no connection, the last forecast you loaded is used. That gives seven days, hour by hour. Clearwhen keeps only the hours that touch each of your windows, gives each window the worst weather in it, and writes when the weather turns. The result shows on iPhone, Apple Watch, widgets, the Lock Screen, the morning briefing, Mac and Apple Vision Pro."
        className="mx-auto flex w-full max-w-4xl flex-col"
      >
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
          <Node kicker="First choice" title="Apple Weather">
            An hourly forecast, and severe weather alerts.
          </Node>
          <Node kicker="Backup, in the US" title="National Weather Service">
            Asked only if Apple Weather can’t answer.
          </Node>
          <Node kicker="No signal" title="Your last forecast">
            Saved on your phone, so there is always an answer.
          </Node>
        </div>
        <FlowDown accent={accent} />
        <div
          aria-hidden="true"
          className="rounded-full border border-dashed border-border-field px-5 py-2.5 text-center text-13 text-fg-muted"
        >
          Seven days, <span className="text-fg">hour by hour</span>
        </div>
        <FlowDown accent={accent} />
        <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2">
          <Node title="Your windows" accent={accent}>
            Only the hours that touch a window count for it. Hours outside every window are left out.
          </Node>
          <Node title="Worst case wins" accent={accent}>
            Each window gets the worst weather in it, plus a line saying when it starts and how long it lasts.
          </Node>
        </div>
        <FlowDown accent={accent} />
        <ul aria-hidden="true" className="flex flex-wrap justify-center gap-2">
          {SURFACES.map((s) => (
            <li key={s} className="rounded-full border border-border bg-bg px-3 py-1.5 text-13 text-fg">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 12:00 · Worst case wins */

const WORKDAY: Hour[] = day(9, 17, { 10: 'partly', 11: 'partly', 12: 'cloudy', 14: 'thunder', 15: 'partly' });

/** Each hour of the workday as a bar the height of its rung on the ladder. */
function SeverityBars({ accent }: { accent: string }) {
  const top = rank('severe');
  const worst = verdict(WORKDAY, 9, 17);
  return (
    <div
      role="img"
      aria-label={`An illustrative workday, 9 AM to 5 PM. Seven hours are clear to cloudy; the 2 PM hour has thunderstorms. The verdict is ${LABEL[worst]}.`}
      className="flex flex-col gap-2"
    >
      <div aria-hidden="true" className="relative flex h-44 items-end gap-2 sm:gap-3">
        <span
          className="absolute inset-x-0 border-t border-dashed border-fg-faint"
          style={{ bottom: `${((rank(worst) + 1) / (top + 1)) * 100}%` }}
        />
        {WORKDAY.map((h) => {
          const wet = isWet(h.kind);
          return (
            <span
              key={h.hour}
              className={`flex-1 rounded-t-sm ${wet ? '' : 'bg-border-field'}`}
              style={{ height: `${((rank(h.kind) + 1) / (top + 1)) * 100}%`, ...(wet ? { backgroundColor: accent } : {}) }}
            />
          );
        })}
      </div>
      <span aria-hidden="true" className="h-px bg-border-field" />
      <div aria-hidden="true" className="flex gap-2 font-mono text-11 text-fg-faint sm:gap-3">
        {WORKDAY.map((h) => (
          <span key={h.hour} className="flex-1 text-center">
            {twelve(h.hour)}
          </span>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-14">
        <span className="text-fg-muted">Workday verdict</span>
        <span className="font-semibold text-fg">{LABEL[worst]}</span>
        <span className="text-fg-muted">· {phrase(WORKDAY)}</span>
      </p>
    </div>
  );
}

/** The ladder: twelve rungs, clear at the bottom, severe at the top. */
function Ladder({ accent }: { accent: string }) {
  const lit = verdict(WORKDAY, 9, 17);
  return (
    <ol aria-label="The severity ladder, worst first" className="flex flex-col gap-1.5">
      {[...KINDS].reverse().map((kind) => (
        <li key={kind} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
          <span className={`text-13 ${kind === lit ? 'font-semibold text-fg' : 'text-fg-muted'}`}>{LABEL[kind]}</span>
          <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-raised">
            <span
              className={`bar block h-full rounded-full ${kind === lit ? '' : 'bg-border-field'}`}
              style={{ width: `${((rank(kind) + 1) / KINDS.length) * 100}%`, ...(kind === lit ? { backgroundColor: accent } : {}) }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The overlap rule: a 7:30 commute still reads the 7 o'clock hour. */
function Overlap({ accent }: { accent: string }) {
  const from = 6;
  const to = 10;
  const start = 7.5;
  const end = 9;
  const pct = (h: number) => ((h - from) / (to - from)) * 100;
  return (
    <div
      role="img"
      aria-label="A commute from 7:30 to 9:00 AM. The 7 o'clock hour and the 8 o'clock hour both count, because each touches the window. The 6 and 9 o'clock hours do not."
      className="flex flex-col gap-2"
    >
      <div aria-hidden="true" className="relative h-14">
        <div className="absolute inset-x-0 top-5 bottom-0 flex gap-1">
          {[6, 7, 8, 9].map((h) => {
            const counts = h < end && h + 1 > start;
            return (
              <span
                key={h}
                className={`flex flex-1 items-center justify-center rounded-sm font-mono text-11 ${counts ? 'border-2 text-fg' : 'border border-border text-fg-faint'}`}
                style={counts ? { borderColor: accent } : undefined}
              >
                {counts ? 'counts' : '—'}
              </span>
            );
          })}
        </div>
        <span
          className="absolute top-0 h-3 rounded-full"
          style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%`, backgroundColor: accent }}
        />
      </div>
      <Axis from={from} to={to} ticks={[6, 7, 8, 9, 10]} />
    </div>
  );
}

function WorstCase({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="worst"
      code="12:00"
      label="Worst case wins"
      title={
        <>
          One stormy hour <Accent>is a stormy workday.</Accent>
        </>
      }
      lede="If it rains at all in your window, Clearwhen says rain. An average would smooth the one bad hour below into a mild afternoon — and you would be the one walking back from lunch in a thunderstorm."
      sunken
    >
      <div className="grid gap-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="An illustration. Each bar is one hour of a 9-to-5, as tall as its rung on the ladder. The dashed line is the verdict: the tallest bar.">
          <SeverityBars accent={accent} />
        </Figure>
        <Figure caption="Every hour is sorted onto this twelve-rung ladder, whatever source the forecast came from. A window’s verdict is its highest rung.">
          <Ladder accent={accent} />
        </Figure>
      </div>
      <Figure
        className="lg:max-w-2xl"
        caption={
          <>
            Any hour that touches your window counts. A commute from 7:30 still hears about rain in the 7 o’clock hour.
          </>
        }
      >
        <Overlap accent={accent} />
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 15:00 · When it turns */

const TIMING_FROM = 7;
const TIMING_TO = 22;

const TIMING: { rule: string; hours: Hour[] }[] = [
  { rule: 'One wet hour', hours: day(TIMING_FROM, TIMING_TO, { 18: 'thunder' }) },
  { rule: 'One stretch', hours: day(TIMING_FROM, TIMING_TO, { 18: 'thunder', 19: 'thunder', 20: 'rain', 21: 'rain' }) },
  { rule: 'Two stretches', hours: day(TIMING_FROM, TIMING_TO, { 7: 'rain', 8: 'rain', 16: 'rain', 17: 'rain' }) },
  { rule: 'Three or more', hours: day(TIMING_FROM, TIMING_TO, { 7: 'drizzle', 11: 'rain', 12: 'rain', 15: 'rain' }) },
  {
    rule: 'Eight hours or more',
    hours: day(TIMING_FROM, TIMING_TO, Object.fromEntries(Array.from({ length: 9 }, (_, i) => [8 + i, 'rain' as Kind]))),
  },
];

function Timing({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="timing"
      code="15:00"
      label="When it turns"
      title={
        <>
          Not just “storms”. <Accent>Storms from six to ten.</Accent>
        </>
      }
      lede="The verdict tells you what. The line under it tells you when, and for how long, in words you would use yourself. It is built from the hours, so it changes shape with the day."
    >
      <Figure caption="Illustrations of each rule, from 7 AM to 10 PM — the stretch that headlines each day, which you can change in Settings. Lit hours are wet. Every line is the app’s own wording for that pattern.">
        <ol className="flex flex-col divide-y divide-border">
          {TIMING.map((t) => {
            const line = phrase(t.hours) ?? '';
            return (
              <li key={t.rule} className="grid gap-3 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:gap-8">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-11 tracking-label text-fg-faint uppercase">{t.rule}</span>
                  <span className="text-16 font-semibold text-fg">{line}</span>
                </div>
                <Ribbon
                  hours={t.hours}
                  bands={[]}
                  accent={accent}
                  from={TIMING_FROM}
                  to={TIMING_TO}
                  ticks={[7, 12, 17, 22]}
                  label={`Wet hours drawn between 7 AM and 10 PM. The day reads: ${line}.`}
                />
              </li>
            );
          })}
        </ol>
      </Figure>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 17:00 · Your week */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEK_WINDOWS = [
  ...STARTER,
  { name: 'Long run', start: 7, end: 9, days: 'Saturday', mask: [0, 0, 0, 0, 0, 0, 1] },
];
const SHADES = [1, 0.5, 0.8, 0.3];

const EVENTS = [
  { name: 'Team standup', start: 9, end: 9.5 },
  { name: 'Client workshop', start: 11, end: 15 },
  { name: 'Soccer practice', start: 18, end: 19.5 },
];
const EVENT_DAY = day(7, 22, { 13: 'rain', 14: 'rain' });

function Week({ accent }: { accent: string }) {
  const pct = (h: number) => (h / 24) * 100;
  return (
    <DeepSection
      id="week"
      code="17:00"
      label="Your week"
      title={
        <>
          Weekdays aren’t weekends. <Accent>Your windows know.</Accent>
        </>
      }
      lede="Each window runs on the days you choose, so Saturday doesn’t get a commute verdict. With your calendar switched on, the day’s events get the same treatment as windows."
      sunken
    >
      <div className="grid gap-16 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Figure caption="The three starter windows, plus one example you might add: a Saturday-morning run. Up to five windows, each within a single day.">
          <div
            role="img"
            aria-label="A week, Sunday to Saturday, each day a 24-hour line. Commute, 7 to 9 AM, and Workday, 9 to 5, appear Monday to Friday. Dog Walk, 6 to 7 PM, appears every day. Long run, 7 to 9 AM, appears only on Saturday."
            className="flex flex-col gap-2"
          >
            {DAYS.map((d, di) => (
              <div key={d} aria-hidden="true" className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="font-mono text-12 text-fg-muted">{d}</span>
                <span className="relative h-6 rounded-sm bg-surface-raised">
                  {WEEK_WINDOWS.filter((w) => w.mask[di]).map((w) => (
                    <span
                      key={w.name}
                      className="absolute inset-y-0 rounded-xs"
                      style={{
                        left: `${pct(w.start)}%`,
                        width: `${pct(w.end) - pct(w.start)}%`,
                        backgroundColor: accent,
                        opacity: SHADES[WEEK_WINDOWS.indexOf(w)],
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
              <span />
              <Axis from={0} to={24} ticks={[0, 6, 12, 18, 24]} />
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
            {WEEK_WINDOWS.map((w, i) => (
              <li key={w.name} className="flex items-center gap-2 text-13 text-fg">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: accent, opacity: SHADES[i] }} />
                {w.name} <Quiet>· {w.days}</Quiet>
              </li>
            ))}
          </ul>
        </Figure>

        <Figure caption="An illustration: three timed events on a day with rain from 1 to 3 PM. All-day events are left out — they have no hours of their own to judge.">
          <div className="flex flex-col gap-4">
            <Ribbon
              hours={EVENT_DAY}
              bands={EVENTS.map((e, i) => ({ key: e.name, start: e.start, end: e.end, mark: String(i + 1) }))}
              accent={accent}
              from={7}
              to={22}
              ticks={[7, 12, 17, 22]}
              label="Today's calendar between 7 AM and 10 PM, with rain from 1 to 3 PM. The client workshop, 11 to 3, overlaps the rain; the standup and soccer practice do not."
              tall
            />
            <ul className="flex flex-col divide-y divide-border">
              {EVENTS.map((e, i) => (
                <VerdictRow
                  key={e.name}
                  mark={String(i + 1)}
                  name={e.name}
                  when={span(e.start, e.end)}
                  kind={verdict(EVENT_DAY, e.start, e.end)}
                  detail={phrase(within(EVENT_DAY, e.start, e.end))}
                  accent={accent}
                />
              ))}
            </ul>
          </div>
        </Figure>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 19:00 · Where it shows */

function Surface({ name, what, children }: { name: string; what: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <div aria-hidden="true" className="flex h-24 items-center justify-center">
        {children}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-14 font-semibold text-fg">{name}</span>
        <span className="text-13 text-fg-muted">{what}</span>
      </div>
    </li>
  );
}

/** Three short rows standing in for a list of windows. */
function Lines({ accent, n = 3 }: { accent: string; n?: number }) {
  return (
    <span className="flex w-full flex-col gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="h-1 flex-1 rounded-full bg-border-field" />
          <span
            className={`size-1.5 rounded-full ${i === n - 1 ? '' : 'border border-fg-faint'}`}
            style={i === n - 1 ? { backgroundColor: accent } : undefined}
          />
        </span>
      ))}
    </span>
  );
}

function Glance({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="glance"
      code="19:00"
      label="Where it shows"
      title={
        <>
          The answer is <Accent>wherever you look first.</Accent>
        </>
      }
      lede="Most days you shouldn’t need to open the app. The same verdicts reach your wrist, your Home Screen and your Lock Screen, and a severe weather warning goes to the top of the page."
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Surface name="iPhone" what="The week ahead, a card per day, and each day in detail hour by hour.">
          <span className="flex h-24 w-12 flex-col justify-center gap-1 rounded-lg border-2 border-border-field px-1.5">
            <Lines accent={accent} />
          </span>
        </Surface>
        <Surface name="Apple Watch" what="Today’s windows, the one you’re in marked Now. The watch gets its forecast from your phone.">
          <span className="flex h-20 w-16 flex-col justify-center gap-1 rounded-lg border-2 border-border-field px-2">
            <span className="h-1 w-6 rounded-full" style={{ backgroundColor: accent }} />
            <Lines accent={accent} n={2} />
          </span>
        </Surface>
        <Surface name="Home Screen widgets" what="Small shows the window you’re in or the next one; medium adds the rest of today’s windows and the day’s main takeaway.">
          <span className="flex items-end gap-2">
            <span className="flex size-16 flex-col justify-end gap-1 rounded-lg bg-surface-raised p-2">
              <span className="h-1 w-8 rounded-full" style={{ backgroundColor: accent }} />
              <span className="h-1 w-5 rounded-full bg-border-field" />
            </span>
            <span className="flex h-16 w-28 flex-col justify-center rounded-lg bg-surface-raised p-2">
              <Lines accent={accent} />
            </span>
          </span>
        </Surface>
        <Surface name="Lock Screen" what="Round, rectangular and single-line widgets, each saying the verdict in one breath.">
          <span className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-border-field">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: accent }} />
              </span>
              <span className="flex h-10 w-20 flex-col justify-center gap-1 rounded-md border-2 border-border-field px-2">
                <span className="h-1 w-full rounded-full bg-border-field" />
                <span className="h-1 w-2/3 rounded-full" style={{ backgroundColor: accent }} />
              </span>
            </span>
            <span className="h-1 w-24 rounded-full bg-border-field" />
          </span>
        </Surface>
        <Surface name="Morning briefing" what="Off until you turn it on. At the time you choose, only what touches your windows.">
          <span className="flex w-40 flex-col gap-1 rounded-md border border-border-field p-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs" style={{ backgroundColor: accent }} />
              <span className="h-1 w-12 rounded-full bg-border-field" />
            </span>
            <span className="h-1 w-full rounded-full bg-border-field" />
            <span className="h-1 w-3/4 rounded-full bg-border-field" />
          </span>
        </Surface>
        <Surface name="Severe weather alerts" what="From Apple Weather, and from the National Weather Service in the US. The most severe comes first.">
          <span className="flex w-40 items-center gap-2 rounded-md border-2 border-warning p-2">
            <span className="text-16 text-warning">!</span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="h-1 w-full rounded-full bg-border-field" />
              <span className="h-1 w-2/3 rounded-full bg-border-field" />
            </span>
          </span>
        </Surface>
        <Surface name="Mac" what="The same app, on a Mac with Apple silicon.">
          <span className="flex flex-col items-center">
            <span className="flex h-16 w-28 items-center rounded-t-md border-2 border-border-field px-3">
              <Lines accent={accent} />
            </span>
            <span className="h-1.5 w-36 rounded-b-md bg-border-field" />
          </span>
        </Surface>
        <Surface name="Apple Vision Pro" what="The same app, on Apple Vision Pro.">
          <span className="flex h-14 w-32 items-center justify-center rounded-full border-2 border-border-field">
            <span className="flex h-7 w-16 items-center rounded-sm bg-surface-raised px-1.5">
              <Lines accent={accent} n={2} />
            </span>
          </span>
        </Surface>
      </ul>
      <p className="text-13 text-fg-muted">Drawings, not screenshots.</p>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 21:00 · What stays on your phone */

const STAYS = [
  { what: 'Your windows', how: 'Kept on your phone and shared with your widgets and watch.' },
  { what: 'Your calendar', how: 'Optional. Read only while you’re looking at a day, never saved, never uploaded.' },
  { what: 'Every verdict', how: 'Worked out on the phone — and on the watch, from what the phone sends it.' },
  { what: 'Your briefings', how: 'Written ahead on the phone for the next few mornings. No server sends them.' },
];

function Private({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="private"
      code="21:00"
      label="What stays on your phone"
      title={
        <>
          One thing goes out. <Accent>A forecast comes back.</Accent>
        </>
      }
      lede="To get a forecast, a weather service has to know where you are. Your location is the only thing about you that Clearwhen sends anywhere — for the forecast, and to Apple Maps to put a city name on it — and only while you’re using it. There is no account to make."
      sunken
    >
      <div
        role="img"
        aria-label="Your phone holds your windows, your calendar, every verdict and your briefings. It sends a location to Apple Weather, or to the National Weather Service, and receives an hourly forecast and alerts; it asks Apple Maps for the location's city name, and for the cities you search for. Nothing else crosses."
        className="grid items-center gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)_minmax(0,2fr)]"
      >
        <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border-2 border-border-field bg-bg p-5">
          <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Stays on your phone</span>
          <ul className="grid gap-3 sm:grid-cols-2">
            {STAYS.map((s) => (
              <li key={s.what} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
                <span className="text-14 font-semibold text-fg">{s.what}</span>
                <span className="text-13 text-fg-muted">{s.how}</span>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="flex flex-col gap-4 py-2">
          {[
            { label: 'a location', dir: 'out' },
            { label: 'a forecast, alerts and a city name', dir: 'in' },
          ].map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-1 text-center">
              <span className="text-13 text-fg">{a.label}</span>
              {/* Phone: the phone is above, the services below. Wider: side by side. */}
              <svg viewBox="0 0 12 32" className="h-8 w-3 lg:hidden">
                <path
                  d={a.dir === 'out' ? 'M6 2 V29 M1 24 L6 30 L11 24' : 'M6 30 V3 M1 8 L6 2 L11 8'}
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ stroke: accent }}
                />
              </svg>
              <svg viewBox="0 0 120 12" className="hidden h-3 w-full max-w-40 lg:block" preserveAspectRatio="none">
                <path
                  d={a.dir === 'out' ? 'M2 6 H116 M110 1 L117 6 L110 11' : 'M118 6 H4 M10 1 L3 6 L10 11'}
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ stroke: accent }}
                />
              </svg>
            </div>
          ))}
        </div>

        <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-dashed border-border-field p-5">
          <span className="font-mono text-11 tracking-label text-fg-faint uppercase">Where it goes</span>
          <span className="text-16 font-semibold text-fg">Apple Weather</span>
          <span className="text-16 font-semibold text-fg">
            National Weather Service <Quiet>· US backup</Quiet>
          </span>
          <span className="text-16 font-semibold text-fg">
            Apple Maps <Quiet>· names the place, finds cities</Quiet>
          </span>
        </div>
      </div>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- 23:00 · Why this way */

const WHY: { title: string; body: string; mark: string }[] = [
  {
    title: 'It errs toward the umbrella',
    body: 'A verdict that undersells a storm gets you soaked; one that oversells costs you a glance at the timing line. So the worst hour wins, and the line beside it says how long it lasts.',
    mark: 'worst',
  },
  {
    title: 'It still answers on a bad day',
    body: 'If Apple Weather can’t answer, the National Weather Service can in the US. With no signal at all, you get the last forecast you loaded rather than a blank screen.',
    mark: 'chain',
  },
  {
    title: 'Five windows, one glance',
    body: 'The limit is deliberate. Five answers fit on a widget and a wrist; fifteen would be another forecast to read.',
    mark: 'five',
  },
  {
    title: 'Nothing to sign up for',
    body: 'No account, and nothing about your day on anyone’s server. Your windows and calendar stay where they are; only a location leaves, to ask for weather and a city name.',
    mark: 'lock',
  },
];

function WhyMark({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'worst') {
    return (
      <span className="flex h-8 items-end gap-1">
        {[2, 3, 2, 8, 3].map((h, i) => (
          <span
            key={i}
            className={`w-2 rounded-t-xs ${h === 8 ? '' : 'bg-border-field'}`}
            style={{ height: `${h * 4}px`, ...(h === 8 ? { backgroundColor: accent } : {}) }}
          />
        ))}
      </span>
    );
  }
  if (kind === 'chain') {
    return (
      <span className="flex h-8 items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`size-3 rounded-full ${i === 0 ? '' : 'border-2 border-border-field'}`} style={i === 0 ? { backgroundColor: accent } : undefined} />
            {i < 2 && <span className="h-px w-4 bg-border-field" />}
          </span>
        ))}
      </span>
    );
  }
  if (kind === 'five') {
    return (
      <span className="flex h-8 items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-5 w-2 rounded-xs" style={{ backgroundColor: accent }} />
        ))}
      </span>
    );
  }
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-fg">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.6" style={{ fill: accent }} />
    </svg>
  );
}

function Why({ accent }: { accent: string }) {
  return (
    <DeepSection
      id="why"
      code="23:00"
      label="Why it’s built this way"
      title={
        <>
          Built to be believed <Accent>at a glance.</Accent>
        </>
      }
      lede="A weather app earns a glance only if you can act on what it says without checking. Each choice below is there so you can."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {WHY.map((w) => (
          <li key={w.title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <span aria-hidden="true">
              <WhyMark kind={w.mark} accent={accent} />
            </span>
            <span className="text-16 font-semibold text-fg">{w.title}</span>
            <span className="text-14 text-fg-muted">{w.body}</span>
          </li>
        ))}
      </ul>
    </DeepSection>
  );
}

/* ---------------------------------------------------------------- Page */

export function ClearwhenDeepDive({ project }: { project: Project }) {
  const accent = project.accent;
  return (
    <>
      <DeepIndex entries={ENTRIES} accent={accent} />
      <Problem accent={accent} />
      <Walkthrough accent={accent} />
      <HowItWorks accent={accent} />
      <WorstCase accent={accent} />
      <Timing accent={accent} />
      <Week accent={accent} />
      <Glance accent={accent} />
      <Private accent={accent} />
      <Why accent={accent} />
    </>
  );
}
