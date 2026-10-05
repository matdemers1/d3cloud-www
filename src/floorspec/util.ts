import { useCallback, useEffect, useRef, useState } from 'react';

/** Helpers the Floorspec pages share (DI-T-10.6): plain functions and hooks, no components. */

/** "Core, Ops and Rules". */
export const listOf = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export const shortSha = (commit: string) => commit.slice(0, 7);

/**
 * A chapter's summary from its README table, as a sentence: "Merging junctions, …". One that
 * opens with an operation's name keeps it as written — "addElement and its shorthands, …".
 */
export const asSentence = (summary: string) =>
  `${/^[a-z]+\b/.test(summary) ? summary.charAt(0).toUpperCase() + summary.slice(1) : summary}.`;

/** Says, briefly, that a statement's link was copied. */
export function useCopiedNote(): [string, (id: string) => void] {
  const [note, setNote] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const copy = useCallback((id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setNote(`Link to ${id} copied`);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setNote(''), 2400);
      })
      .catch(() => {});
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [note, copy];
}

/**
 * A deep link — /floorspec/core/walls#FS-CORE-5.3.1 — arrives before the text does, so the
 * browser had nothing to scroll to or to mark as the :target. Once the text is there, navigating
 * to the same fragment again (replacing, not adding, a history entry) does both.
 */
export function useLateFragment(loaded: unknown) {
  useEffect(() => {
    const { hash } = window.location;
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) window.location.replace(hash);
  }, [loaded]);
}

/**
 * Whether an in-site link is a page the router renders, rather than a published file — a schema or
 * a library file (`/floorspec/schema/…`, `/floorspec/library/<name>/<version>/<file>`), which the
 * browser must load itself.
 */
export const isPage = (href: string) => {
  const path = href.split('#')[0]!;
  return href.startsWith('/') && !path.startsWith('/floorspec/schema/') && !/\.[a-z0-9]+$/i.test(path) && path.split('/').length < 6;
};
