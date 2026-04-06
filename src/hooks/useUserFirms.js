import { useState, useEffect, useCallback, useRef } from 'react';
import useAuth from './useAuth';
import {
  getUserFirms,
  addFirmToList,
  updateFirmStatus,
  updateFirmNotes,
  removeFirmFromList,
} from '../lib/db';

export default function useUserFirms() {
  const { user, loading: authLoading } = useAuth();
  const [userFirms, setUserFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (authLoading || !user || fetched.current) return;
    fetched.current = true;

    async function load() {
      const { data, error: err } = await getUserFirms(user.id);
      if (err) {
        setError(err);
      } else {
        setUserFirms(data || []);
      }
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const addFirm = useCallback(async (firmId) => {
    if (!user) return { error: 'Not logged in' };
    const { data, error: err } = await addFirmToList(user.id, firmId);
    if (err) return { error: err };
    setUserFirms((prev) => [...prev, data]);
    return { data };
  }, [user]);

  const updateStatus = useCallback(async (userFirmId, status) => {
    const prev = userFirms;
    setUserFirms((items) =>
      items.map((uf) => (uf.id === userFirmId ? { ...uf, status } : uf))
    );
    const { error: err } = await updateFirmStatus(userFirmId, status);
    if (err) {
      setUserFirms(prev);
      return { error: err };
    }
    return {};
  }, [userFirms]);

  const updateNotes = useCallback(async (userFirmId, notes) => {
    const prev = userFirms;
    setUserFirms((items) =>
      items.map((uf) => (uf.id === userFirmId ? { ...uf, firm_notes: notes } : uf))
    );
    const { error: err } = await updateFirmNotes(userFirmId, notes);
    if (err) {
      setUserFirms(prev);
      return { error: err };
    }
    return {};
  }, [userFirms]);

  const removeFirm = useCallback(async (userFirmId) => {
    const prev = userFirms;
    setUserFirms((items) => items.filter((uf) => uf.id !== userFirmId));
    const { error: err } = await removeFirmFromList(userFirmId);
    if (err) {
      setUserFirms(prev);
      return { error: err };
    }
    return {};
  }, [userFirms]);

  return { userFirms, loading, error, addFirm, updateStatus, updateNotes, removeFirm };
}
