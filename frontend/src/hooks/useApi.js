// hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from "react";

const BASE = "/api";

export function useApi(path) {
  const [data,    setData]    = useState(null);
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
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time path changes (search string, filters, etc.)
  useEffect(() => {
    pathRef.current = path;
    fetchData(path);
  }, [path, fetchData]);

  const refetch = useCallback(() => {
    fetchData(pathRef.current);
  }, [fetchData]);

  return { data, loading, error, refetch };
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