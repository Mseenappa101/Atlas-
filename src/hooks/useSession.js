import { useContext } from 'react';
import { SessionContext } from '../context/session-context';

export default function useSession() {
  return useContext(SessionContext);
}
