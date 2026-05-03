interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="D3 Cloud"
    >
      <path d="M22 18 L10 32 L22 46" />
      <path d="M42 18 L54 32 L42 46" />
      <path d="M36 14 L28 50" />
    </svg>
  );
}
