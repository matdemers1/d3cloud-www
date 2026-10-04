import { createContext } from 'react';

/** Called when a statement's badge is used, so the chapter page can say its link was copied. */
export const CopyContext = createContext<(id: string) => void>(() => {});
