import { createContext } from 'react';

export const SessionContext = createContext({ session: null, profile: null, loading: true });
