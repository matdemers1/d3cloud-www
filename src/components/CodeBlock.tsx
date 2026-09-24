import { useEffect, useRef, useState } from 'react';

/**
 * A block of commands that scrolls sideways when a line is too long.
 *
 * A region that scrolls must be reachable by keyboard, or the end of a long
 * command can only be read with a mouse (WCAG 2.1.1; axe's
 * scrollable-region-focusable). Whether it scrolls is measured, not assumed —
 * the same answer @d3cloud/ui 1.2.2 gave Table — so a block that fits adds no
 * tab stop that does nothing.
 */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [code]);

  return (
    <pre
      ref={ref}
      tabIndex={scrolls ? 0 : undefined}
      role={scrolls ? 'region' : undefined}
      aria-label={scrolls ? label : undefined}
      className="overflow-x-auto rounded-md bg-surface p-4 font-mono text-12 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <code>{code}</code>
    </pre>
  );
}
