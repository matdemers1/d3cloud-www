import type { Screenshot } from '../content/projects';

/**
 * A row of screenshots at one shared height, scrolling sideways when they
 * overflow. Mixed shapes (a phone, a watch, a desktop window) sit side by side
 * without any being cropped; explicit dimensions reserve the space so nothing
 * shifts as the images load.
 */
export function Screenshots({ shots }: { shots: Screenshot[] }) {
  return (
    <ul
      className="-mx-6 flex snap-x snap-mandatory items-end gap-4 overflow-x-auto px-6 pb-3"
      tabIndex={0}
      aria-label="Screenshots, scrolls sideways"
    >
      {shots.map((shot) => (
        <li key={shot.src} className="shrink-0 snap-start">
          <img
            src={shot.src}
            alt={shot.alt}
            width={shot.width}
            height={shot.height}
            loading="lazy"
            decoding="async"
            className={`w-auto rounded-lg border border-border bg-surface ${
              shot.compact ? 'h-52 sm:h-62' : 'h-90 sm:h-105'
            }`}
          />
        </li>
      ))}
    </ul>
  );
}
