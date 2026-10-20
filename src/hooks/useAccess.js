import { useContext } from 'react';
import { AccessContext } from '../context/access-context';

export default function useAccess() {
  return useContext(AccessContext);
}
