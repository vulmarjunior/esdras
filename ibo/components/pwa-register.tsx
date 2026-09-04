"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA) apenas em produção. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const t = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}