"use client";

import { useEffect, useState } from "react";
import type { ProviderHealth } from "@/lib/ai/types";

let cachedHealth: ProviderHealth[] | null = null;
let cachedConnected = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
let listeners: Array<() => void> = [];

function notifyListeners() {
  for (const listener of listeners) listener();
}

async function fetchHealth() {
  try {
    const res = await fetch("/api/ai/health");
    if (!res.ok) return;
    const data = await res.json();
    const providers: ProviderHealth[] = data.providers ?? [];
    cachedHealth = providers;
    cachedConnected = providers.some(
      (p) => p.status === "connected" || p.providerId === "mock"
    );
    notifyListeners();
  } catch {
    cachedConnected = false;
    notifyListeners();
  }
}

function startPolling() {
  if (intervalId) return;
  fetchHealth();
  intervalId = setInterval(fetchHealth, 30_000);
}

function stopPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Shared provider health hook — polls /api/ai/health once globally
 * and shares the result across all subscribers.
 * Replaces duplicate polling in WorkspaceHeader and StatusBar.
 */
export function useProviderHealth() {
  const [, setTick] = useState(0);

  useEffect(() => {
    subscriberCount++;
    if (subscriberCount === 1) startPolling();

    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
      subscriberCount--;
      if (subscriberCount === 0) stopPolling();
    };
  }, []);

  return {
    health: cachedHealth ?? [],
    connected: cachedConnected,
  };
}
