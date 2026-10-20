import { createContext } from 'react';

// { level: 'public' | 'unlocked' | 'member', token, unlock(token), canSeeDetails }
export const AccessContext = createContext({ level: 'public', token: null, unlock: () => {}, canSeeDetails: false });
