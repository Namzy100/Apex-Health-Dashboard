"use client";

import { useEffect } from "react";
import { useApex } from "@/lib/store";

/**
 * Reads Apple Health data from URL params (iOS Shortcuts bridge).
 * URL format: /?steps=8500&cal=420&date=2026-05-18
 */
export default function HealthBridge() {
  const { dispatch } = useApex();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const steps = params.get("steps");
    const cal = params.get("cal");

    if (steps || cal) {
      if (steps) dispatch({ type: "SET_STEPS", steps: parseInt(steps) });
      // Remove params from URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch]);

  return null;
}
