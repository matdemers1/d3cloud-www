import type { ReactNode } from 'react';
import { Link } from '../router';
import { ProductMark } from '../components/ProductMark';
import { FLOORSPEC } from './spec';

/** The small crumb above a Floorspec page's title: the mark, "Floorspec /", then the page's own. */
export function Crumb({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-2 font-mono text-12 tracking-label text-fg-muted uppercase">
      <ProductMark slug={FLOORSPEC.slug} accent={FLOORSPEC.accent} size={18} className="text-fg" />
      <Link to="/floorspec" variant="muted" className="no-underline hover:underline">
        Floorspec
      </Link>
      <span aria-hidden="true">/</span>
      {children}
    </p>
  );
}
