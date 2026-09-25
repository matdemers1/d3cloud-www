import type { ReactNode } from 'react';

/**
 * A drawing for a workshop project that has nothing public to screenshot yet,
 * keyed by its slug. Empty while nothing is on the bench — Shipyard's deploy
 * sequence left with it when it launched and got real screenshots instead.
 */
export const WORKSHOP_ART: Record<string, () => ReactNode> = {};
