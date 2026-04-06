// hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from "react";

const BASE = "/api";

/**
 * useApi(path)
 * Returns { data, total, loading, error, refetch }
 * - data   → the `data` field from the API envelope  (or null)
 * - total  → the `total` field if present            (or null)
 * - loading, error as usual
 */
export function useApi(path) {
  const [data,    setData]    = useState(null);
  const [total,   setTotal]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const pathRef = useRef(path);

  const fetchData = useCallback(async (fetchPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}${fetchPath}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // All our API routes return { success, data, total? }
      // Unwrap here so every consumer gets clean data directly
      setData(json.data  ?? json);
      setTotal(json.total ?? null);
    } catch (e) {
      setError(e.message);
      setData(null);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pathRef.current = path;
    fetchData(path);
  }, [path, fetchData]);

  const refetch = useCallback(() => {
    fetchData(pathRef.current);
  }, [fetchData]);

  return { data, total, loading, error, refetch };
}

export async function apiPatch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}