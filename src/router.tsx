import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link as UiLink, type LinkVariant } from '@d3cloud/ui';

/**
 * The smallest router that does the job: History API + popstate, no dependency.
 *
 * We need real URLs (not anchors) because App Review wants a privacy policy at a
 * stable, linkable address per app — `/daypart/privacy`, not `/#privacy`.
 */

interface RouterValue {
  path: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterValue>({
  path: '/',
  navigate: () => {},
});

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => normalize(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPath(normalize(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = normalize(to);
    if (next === normalize(window.location.pathname)) return;
    window.history.pushState({}, '', next);
    setPath(next);
    // A new page starts at its top, at once. `instant` overrides the smooth
    // scrolling index.css gives in-page anchors — left smooth, the jump became a
    // glide the next render or a stray wheel tick could strand halfway down.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterValue {
  return useContext(RouterContext);
}

/**
 * Click handler for any anchor that should navigate in-app — the library's
 * `Link` and `Card` both render a real `<a href>`, so they only need this.
 */
export function useNavigateOnClick(
  to: string,
): (event: MouseEvent<HTMLElement>) => void {
  const { navigate } = useRouter();
  return (event) => {
    // Let modified clicks (new tab, download) behave natively.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };
}

interface LinkProps {
  to: string;
  children: ReactNode;
  variant?: LinkVariant;
  className?: string;
}

export function Link({ to, children, variant, className }: LinkProps) {
  return (
    <UiLink
      href={to}
      variant={variant}
      className={className}
      onClick={useNavigateOnClick(to)}
    >
      {children}
    </UiLink>
  );
}
