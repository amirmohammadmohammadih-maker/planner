"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Params = Record<string, string | number | boolean | null | undefined>;

/** Mobile build: the app has no server — `/api/*` is served inside the browser by the on-device database. */
export const IS_LOCAL_APP = process.env.NEXT_PUBLIC_PLANNER_TARGET === "mobile";

export function qs(params?: Params): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  if (IS_LOCAL_APP) {
    const { localFetch } = await import("@/local/transport");
    try {
      const res = await localFetch(url, init);
      return res.body as T;
    } catch (e) {
      throw new Error((e as Error).message || "خطا در دیتابیس داخلی");
    }
  }

  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message || "خطا در ارتباط با سرور");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const list = <T>(resource: string, params?: Params) => api<T[]>(`/api/${resource}${qs(params)}`);
export const create = <T>(resource: string, body: unknown) => api<T>(`/api/${resource}`, { method: "POST", json: body });
export const update = <T>(resource: string, id: number, body: unknown) =>
  api<T>(`/api/${resource}/${id}`, { method: "PATCH", json: body });
export const remove = (resource: string, id: number) => api<void>(`/api/${resource}/${id}`, { method: "DELETE" });

/** Small loader hook: re-runs when `deps` change, exposes reload(). */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const key = JSON.stringify(deps);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, key]);

  return { data, loading, error, reload, setData };
}
