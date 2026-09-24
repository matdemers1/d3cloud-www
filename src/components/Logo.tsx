interface LogoProps {
  size?: number;
  className?: string;
  /**
   * The lit star's colour. Defaults to the system accent; a product page
   * passes the product's own colour, so the family reads at a glance.
   */
  star?: string;
  /** A decorative use beside a visible name passes false. */
  label?: string | false;
}

/**
 * The planisphere (DI-ADR-006): a ring of sky holding a three-star asterism,
 * one star lit. Ring and lines take the text colour.
 */
export function Logo({ size = 32, className, star, label = 'D3 Cloud' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="3.5" />
      <path
        d="M21 20 L40 25 L28 43"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="21" cy="20" r="3.4" fill="currentColor" />
      <circle cx="28" cy="43" r="3.4" fill="currentColor" />
      <circle
        cx="40"
        cy="25"
        r="5.5"
        className={star ? undefined : 'fill-accent'}
        style={star ? { fill: star } : undefined}
      />
    </svg>
  );
}
