import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminApi } from "./admin-api";
import { useAuth } from "./auth-context";

const AdminCtx = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const me = await adminApi.me();
      setAdmin(me);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const has = useCallback(
    (perm) => Boolean(admin?.permissions?.includes(perm)),
    [admin]
  );

  const hasAny = useCallback(
    (perms) => Boolean(admin?.permissions?.some((p) => perms.includes(p))),
    [admin]
  );

  return (
    <AdminCtx.Provider value={{ admin, loading, refresh, has, hasAny }}>
      {children}
    </AdminCtx.Provider>
  );
}

export const useAdmin = () => useContext(AdminCtx);
