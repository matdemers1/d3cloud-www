import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Project } from '../../content/projects';

/**
 * Products whose page explains itself in depth (DI-REQ-039). Each deep dive
 * owns its own sections and their order; the product page supplies the hero
 * and the shared closing sections around it. A product without one keeps the
 * standard page.
 *
 * Each is its own chunk, loaded only on its page: seven of them in the main
 * bundle would break the 150kb budget on their own.
 */
type DeepDive = LazyExoticComponent<ComponentType<{ project: Project }>>;

export const DEEP_DIVES: Partial<Record<string, DeepDive>> = {
  auth: lazy(() => import('./Auth').then((m) => ({ default: m.AuthDeepDive }))),
  bindery: lazy(() => import('./Bindery').then((m) => ({ default: m.BinderyDeepDive }))),
  clearwhen: lazy(() => import('./Clearwhen').then((m) => ({ default: m.ClearwhenDeepDive }))),
  foreman: lazy(() => import('./Foreman').then((m) => ({ default: m.ForemanDeepDive }))),
  qr: lazy(() => import('./Qr').then((m) => ({ default: m.QrDeepDive }))),
  shipyard: lazy(() => import('./Shipyard').then((m) => ({ default: m.ShipyardDeepDive }))),
  ui: lazy(() => import('./Ui').then((m) => ({ default: m.UiDeepDive }))),
};
