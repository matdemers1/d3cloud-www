export interface Project {
  /** URL segment: /daypart, /qr */
  slug: string;
  name: string;
  tagline: string;
  /** Longer pitch for the project page. */
  blurb: string;
  status: 'Coming soon' | 'Live';
  /** Where people actually get it. */
  cta?: { label: string; href: string };
  platforms: string[];
  highlights: string[];
  /** One-line summary of what the app collects, echoed on the home card. */
  privacyLine: string;
  accent: string;
}

export const PROJECTS: Project[] = [
  {
    slug: 'clearwhen',
    name: 'Clearwhen',
    tagline: 'Weather for the parts of your day that matter.',
    blurb:
      '"Rain today" isn\'t an answer. Clearwhen breaks the forecast into the windows you actually live in — the commute, the workday, the dog walk — and gives you a straight verdict for each one, plus exactly when the weather turns.',
    status: 'Coming soon',
    platforms: ['iPhone', 'Apple Watch', 'Widgets'],
    highlights: [
      'Up to five custom time windows, with per-weekday scheduling',
      'Worst-case-wins verdicts — if it rains at all in your window, it says rain',
      'Plain-language timing: "Storms 6–10 PM · 4 hrs", not just "storms today"',
      'Optional morning briefing covering only the weather that hits your windows',
      'Apple Watch app, Home Screen widgets, and Lock Screen complications',
      'Severe weather alerts from Apple Weather and the National Weather Service',
    ],
    privacyLine:
      'Location is used only to request a forecast. No accounts, no analytics, no tracking.',
    accent: '#7EB6FF',
  },
  {
    slug: 'qr',
    name: 'D3 QR',
    tagline: 'Bulk QR codes, generated entirely in your browser.',
    blurb:
      'A static QR code generator that runs fully client-side. Paste a list, get a batch of codes, export them as a print-ready PDF or individual images. Nothing is uploaded, because there is no server to upload it to.',
    status: 'Live',
    cta: { label: 'Open D3 QR', href: 'https://qr.d3cloud.io' },
    platforms: ['Web'],
    highlights: [
      'Bulk generation from a pasted list',
      'Print-ready PDF and image export',
      'Fully client-side — your data never leaves the page',
      'No account, no sign-up, no limits',
    ],
    privacyLine: 'Collects nothing. There is no backend.',
    accent: '#A8E6CF',
  },
];

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}

export const CONTACT_EMAIL = 'matthew@demers.dev';
export const STUDIO = 'Demers Design and Development';
