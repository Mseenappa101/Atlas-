import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import useSession from '../hooks/useSession';
import { MyListContext } from './mylist-context';

// Saved firms live in user_firms (row-level security: each student sees only their own).
export function MyListProvider({ children }) {
  const { session } = useSession();
  const userId = session?.user.id;
  // Rows are tagged with their owner so a sign-out (or a different student) never shows stale rows.
  const [owned, setOwned] = useState({ userId: null, rows: [] });
  const rows = useMemo(() => (owned.userId === userId ? owned.rows : []), [owned, userId]);
  const setRows = useCallback((fn) => setOwned((o) => ({ userId: o.userId, rows: fn(o.rows) })), []);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    supabase
      .from('user_firms')
      .select('id,firm_id,status,notes,applied_at,created_at,updated_at')
      .eq('user_id', userId)
      .then(({ data }) => live && setOwned({ userId, rows: data ?? [] }));
    return () => {
      live = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (firmId) => {
      if (!userId) return;
      const existing = rows.find((r) => r.firm_id === firmId);
      if (existing) {
        setRows((r) => r.filter((x) => x.id !== existing.id));
        const { error } = await supabase.from('user_firms').delete().eq('id', existing.id);
        if (error) setRows((r) => [...r, existing]);
        return;
      }
      const temp = { id: `tmp-${firmId}`, firm_id: firmId, status: 'saved', notes: null, applied_at: null, created_at: new Date().toISOString() };
      setRows((r) => [...r, temp]);
      const { data, error } = await supabase
        .from('user_firms')
        .insert({ user_id: userId, firm_id: firmId, status: 'saved' })
        .select('id,firm_id,status,notes,applied_at,created_at,updated_at')
        .single();
      setRows((r) => (error ? r.filter((x) => x.id !== temp.id) : r.map((x) => (x.id === temp.id ? data : x))));
    },
    [rows, userId, setRows]
  );

  const update = useCallback(
    async (rowId, patch) => {
      setRows((r) => r.map((x) => (x.id === rowId ? { ...x, ...patch } : x)));
      await supabase.from('user_firms').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', rowId);
    },
    [setRows]
  );

  const value = useMemo(() => ({ rows, ids: new Set(rows.map((r) => r.firm_id)), toggle, update }), [rows, toggle, update]);
  return <MyListContext.Provider value={value}>{children}</MyListContext.Provider>;
}
