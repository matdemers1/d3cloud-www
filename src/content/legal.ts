import { CONTACT_EMAIL, STUDIO } from './projects';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  effective: string;
  intro: string;
  sections: LegalSection[];
}

const EFFECTIVE = 'July 24, 2026';

/**
 * App Review 5.1.1(i) requires a privacy policy to explicitly state what is
 * collected and how, confirm third-party handling, and describe retention,
 * deletion, and how consent is revoked. Each section below exists to satisfy
 * one of those clauses — don't trim them without re-reading the guideline.
 */
export const DAYPART_PRIVACY: LegalDoc = {
  title: 'Clearwhen — Privacy Policy',
  effective: EFFECTIVE,
  intro:
    'Clearwhen has no accounts, no analytics, no advertising, and no third-party tracking SDKs. There is no Clearwhen server. This policy explains the one piece of data the app handles and exactly what happens to it.',
  sections: [
    {
      heading: 'What we collect',
      paragraphs: [
        `${STUDIO} does not collect, store, or receive any personal data from Clearwhen. We operate no servers and have no database, so there is nowhere for your information to go.`,
      ],
    },
    {
      heading: 'How your location is used',
      paragraphs: [
        'With your permission, Clearwhen reads your device location for exactly one purpose: asking a weather service for a forecast at that spot. Location access is "While Using the App" only.',
        'Your coordinates are sent to Apple Weather (Apple\'s WeatherKit service) and, in the United States, to the National Weather Service at api.weather.gov. They are used to answer that single request and are never sent anywhere else.',
        'Your coordinates are never attached to an account, a user ID, an advertising identifier, or any other persistent identifier, because Clearwhen does not create any.',
      ],
    },
    {
      heading: 'Third parties',
      paragraphs: [
        'Clearwhen relies on two weather data providers. Each handles requests under its own privacy policy:',
      ],
      bullets: [
        'Apple Weather (WeatherKit) — apple.com/legal/privacy',
        'US National Weather Service (NOAA) — weather.gov/privacy',
      ],
    },
    {
      heading: 'What stays on your device',
      paragraphs: [
        'Your time windows, saved cities, unit preference, and cached forecasts are stored only on your device, and in your own encrypted device backups if you use them. If you use the Apple Watch app, that same information is sent directly from your iPhone to your Watch over Apple\'s encrypted device-to-device connection. It does not pass through us.',
      ],
    },
    {
      heading: 'Retention and deletion',
      paragraphs: [
        'Because we never receive your data, we have nothing to retain and nothing to delete on your behalf. Everything Clearwhen stores lives on your device and is removed completely when you delete the app.',
      ],
    },
    {
      heading: 'Withdrawing consent',
      paragraphs: [
        'You can revoke location access at any time in iOS Settings → Privacy & Security → Location Services → Clearwhen. Clearwhen keeps working — add any city by name instead. Notifications can be turned off in Settings → Notifications → Clearwhen, or from inside the app.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        'Clearwhen is rated 4+ and is safe for all ages. It collects no data from anyone, including children.',
      ],
    },
    {
      heading: 'Changes and contact',
      paragraphs: [
        'If this policy ever changes, the revised version will be posted at this address with a new effective date.',
        `Questions: ${CONTACT_EMAIL}`,
      ],
    },
  ],
};

export const QR_PRIVACY: LegalDoc = {
  title: 'D3 QR — Privacy Policy',
  effective: EFFECTIVE,
  intro:
    'D3 QR runs entirely in your browser. There is no backend, no account, and no analytics.',
  sections: [
    {
      heading: 'What we collect',
      paragraphs: [
        'Nothing. D3 QR collects no personal data of any kind.',
      ],
    },
    {
      heading: 'Your content',
      paragraphs: [
        'The text and URLs you turn into QR codes are processed entirely on your own device, inside the page. They are never transmitted to us or to anyone else, because the application has no server to send them to.',
      ],
    },
    {
      heading: 'Cookies, analytics and tracking',
      paragraphs: [
        'D3 QR sets no tracking cookies, loads no analytics, and includes no advertising or third-party tracking scripts. Your theme preference is stored in your browser\'s local storage and never leaves your device.',
      ],
    },
    {
      heading: 'Hosting',
      paragraphs: [
        'The site is served as static files by Cloudflare. Cloudflare may process standard request metadata (such as IP address) to deliver and protect the site, under its own privacy policy. We do not receive, store, or analyse that data.',
      ],
    },
    {
      heading: 'Changes and contact',
      paragraphs: [
        'If this policy ever changes, the revised version will be posted at this address with a new effective date.',
        `Questions: ${CONTACT_EMAIL}`,
      ],
    },
  ],
};

function termsFor(appName: string, extra: LegalSection[] = []): LegalDoc {
  return {
    title: `${appName} — Terms of Use`,
    effective: EFFECTIVE,
    intro: `These terms cover your use of ${appName}, provided by ${STUDIO}.`,
    sections: [
      {
        heading: 'The short version',
        paragraphs: [
          `${appName} is free to use. We are not going to charge you, show you ads, or sell anything about you. Use it sensibly and it is yours to use.`,
        ],
      },
      ...extra,
      {
        heading: 'No warranty',
        paragraphs: [
          `${appName} is provided "as is", without warranty of any kind, express or implied. We do our best to make it accurate and reliable, but we cannot guarantee it will always be available, error-free, or uninterrupted.`,
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          `To the fullest extent permitted by law, ${STUDIO} is not liable for any indirect, incidental, or consequential damages arising from your use of ${appName}.`,
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update these terms. Material changes will be posted at this address with a new effective date. Continuing to use the app after a change means you accept the updated terms.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions: ${CONTACT_EMAIL}`],
      },
    ],
  };
}

export const DAYPART_TERMS = termsFor('Clearwhen', [
  {
    heading: 'Weather information is not a guarantee',
    paragraphs: [
      'Forecasts shown in Clearwhen come from Apple Weather and the US National Weather Service. Forecasting is inherently uncertain, and Clearwhen summarizes it further into your chosen time windows.',
      'Do not rely on Clearwhen for decisions where weather affects safety — severe storm response, aviation, marine navigation, or any emergency. For official watches and warnings, always consult the National Weather Service directly at weather.gov.',
    ],
  },
]);

export const QR_TERMS = termsFor('D3 QR', [
  {
    heading: 'Your content is yours',
    paragraphs: [
      'You are responsible for the content you encode into QR codes and for how you use the codes you generate. Because everything runs in your browser, we never see it.',
    ],
  },
]);

export const LEGAL_DOCS: Record<string, Record<string, LegalDoc>> = {
  daypart: { privacy: DAYPART_PRIVACY, terms: DAYPART_TERMS },
  qr: { privacy: QR_PRIVACY, terms: QR_TERMS },
};
