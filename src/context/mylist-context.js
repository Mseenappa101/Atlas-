import { createContext } from 'react';

export const MyListContext = createContext({ ids: new Set(), rows: [], toggle: async () => {}, setStage: async () => {} });
