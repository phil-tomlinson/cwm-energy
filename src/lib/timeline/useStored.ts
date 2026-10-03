"use client";
// React bindings for the local-first store. useSyncExternalStore keeps server
// and first client render identical (nothing stored on the server), then reads
// the browser's copy, and follows changes made in other tabs.

import { useSyncExternalStore } from "react";
import type { Timeline } from "./types";
import type { LastVisit } from "./storage";

const TIMELINE_KEY = "cwm_timeline_v1";
const VISIT_KEY = "cwm_last_visit_v1";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("cwm-storage", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("cwm-storage", onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useIsClient(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function useStoredRaw(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readRaw(key), () => null);
}

export function parseTimeline(raw: string | null): Timeline | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Timeline;
    return t?.version === 1 ? t : null;
  } catch {
    return null;
  }
}

export function parseLastVisit(raw: string | null): LastVisit | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastVisit;
  } catch {
    return null;
  }
}

export const STORAGE_KEYS = { timeline: TIMELINE_KEY, visit: VISIT_KEY };
