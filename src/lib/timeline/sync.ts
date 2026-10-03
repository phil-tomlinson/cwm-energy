"use client";
// Account sync for the timeline. Signed out, the timeline lives only in this
// browser. Signed in, every save is copied to the person's row in Supabase, and
// signing in on another device brings the newest copy down. "Newest" is the
// timeline's own updatedAt, so whichever device saved last wins.

import { useSyncExternalStore } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { clearTimeline, loadTimeline, replaceTimeline } from "./storage";
import type { Timeline } from "./types";

export type SyncStatus = "unavailable" | "signed-out" | "syncing" | "saved" | "error";

interface SyncState { status: SyncStatus; email: string | null }

let state: SyncState = { status: "signed-out", email: null };
const listeners = new Set<() => void>();
function set(next: Partial<SyncState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => ({ status: "signed-out", email: null }) as SyncState,
  );
}

let client: SupabaseClient | null = null;
let user: User | null = null;
let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pull(): Promise<Timeline | null> {
  if (!client || !user) return null;
  const { data, error } = await client.from("timelines").select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return (data?.data as Timeline | undefined) ?? null;
}

async function push(t: Timeline): Promise<void> {
  if (!client || !user) return;
  const { error } = await client
    .from("timelines")
    .upsert({ user_id: user.id, data: t, updated_at: t.updatedAt || new Date().toISOString() });
  if (error) throw error;
}

/** On sign-in: keep whichever copy is newer, in both places. */
async function reconcile() {
  if (!user) return;
  set({ status: "syncing" });
  try {
    const remote = await pull();
    const local = loadTimeline();
    const newer = (a: Timeline | null, b: Timeline | null) =>
      (a?.updatedAt ?? "") > (b?.updatedAt ?? "");
    if (remote && (!local || newer(remote, local))) {
      replaceTimeline(remote);
    } else if (local && (!remote || newer(local, remote))) {
      await push(local);
    }
    set({ status: "saved" });
  } catch {
    set({ status: "error" });
  }
}

function onLocalChange() {
  if (!user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const local = loadTimeline();
    if (!local) return;
    set({ status: "syncing" });
    try {
      await push(local);
      set({ status: "saved" });
    } catch {
      set({ status: "error" });
    }
  }, 600);
}

/** Start listening for sign-in and local saves. Safe to call more than once. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  client = createClient();
  if (!client) { set({ status: "unavailable" }); return; }

  client.auth.getUser().then(({ data }) => {
    user = data.user;
    set({ email: user?.email ?? null, status: user ? "syncing" : "signed-out" });
    if (user) reconcile();
  });
  client.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    const changed = next?.id !== user?.id;
    user = next;
    set({ email: user?.email ?? null, status: user ? state.status : "signed-out" });
    if (user && changed) reconcile();
  });
  window.addEventListener("cwm-storage", onLocalChange);
}

/** Remove the timeline from this browser and, if signed in, from the account. */
export async function deleteTimelineEverywhere(): Promise<void> {
  clearTimeline();
  if (client && user) {
    const { error } = await client.from("timelines").delete().eq("user_id", user.id);
    if (error) set({ status: "error" });
  }
}

export async function signOut() {
  if (!client) return;
  await client.auth.signOut();
  set({ status: "signed-out", email: null });
}
