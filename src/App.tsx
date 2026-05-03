import { Logo } from './components/Logo';

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo size={56} className="mb-6 text-text-primary" />
      <h1 className="mb-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Demers Design and Development
      </h1>
      <p className="mb-8 max-w-xl text-base text-text-muted sm:text-lg">
        Independent software studio building privacy-first everyday tools.
      </p>
      <p className="text-sm text-text-muted">
        Currently shipping{' '}
        <a
          href="https://qr.d3cloud.io"
          className="text-accent underline-offset-4 hover:underline"
        >
          D3 QR
        </a>
        . The full site is being built — check back soon.
      </p>
    </main>
  );
}
