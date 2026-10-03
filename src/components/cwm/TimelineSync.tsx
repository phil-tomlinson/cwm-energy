"use client";
import { useEffect } from "react";
import { startSync } from "@/lib/timeline/sync";

/** Mounted once in the root layout: keeps a signed-in timeline saved to the account. */
export default function TimelineSync() {
  useEffect(() => { startSync(); }, []);
  return null;
}
