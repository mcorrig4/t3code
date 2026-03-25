import { create } from "zustand";

const USER_INPUT_DEBUG_QUERY_PARAM = "debugUserInput";
const USER_INPUT_DEBUG_STORAGE_KEY = "t3code:debug-user-input";
const MAX_DEBUG_ENTRIES = 200;

type UserInputDebugLevel = "info" | "success" | "warning" | "error";

export interface UserInputDebugEntry {
  id: string;
  timestamp: string;
  level: UserInputDebugLevel;
  stage: string;
  message: string;
  threadId?: string | null;
  requestId?: string | null;
  detail?: string;
}

interface UserInputDebugState {
  enabled: boolean;
  collapsed: boolean;
  position: { x: number; y: number } | null;
  entries: UserInputDebugEntry[];
  setEnabled: (enabled: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  setPosition: (position: { x: number; y: number } | null) => void;
  pushEntry: (entry: Omit<UserInputDebugEntry, "id" | "timestamp">) => void;
  clear: () => void;
}

function readSearchParamEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const value = new URLSearchParams(window.location.search).get(USER_INPUT_DEBUG_QUERY_PARAM);
  return value === "1" || value === "true" || value === "on";
}

function canPersistDebugState(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === "t3-dev.claude.do" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function readPersistedEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(USER_INPUT_DEBUG_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    if (raw === "1") {
      return true;
    }
    const parsed = JSON.parse(raw) as { enabled?: boolean };
    return parsed.enabled === true;
  } catch {
    return false;
  }
}

function readPersistedLayout(): {
  collapsed: boolean;
  position: { x: number; y: number } | null;
} {
  if (typeof window === "undefined") {
    return { collapsed: false, position: null };
  }
  try {
    const raw = window.localStorage.getItem(USER_INPUT_DEBUG_STORAGE_KEY);
    if (!raw || raw === "1") {
      return { collapsed: false, position: null };
    }
    const parsed = JSON.parse(raw) as {
      collapsed?: boolean;
      position?: { x?: number; y?: number } | null;
    };
    return {
      collapsed: parsed.collapsed === true,
      position:
        parsed.position &&
        typeof parsed.position.x === "number" &&
        typeof parsed.position.y === "number"
          ? { x: parsed.position.x, y: parsed.position.y }
          : null,
    };
  } catch {
    return { collapsed: false, position: null };
  }
}

function persistDebugState(input: {
  enabled: boolean;
  collapsed: boolean;
  position: { x: number; y: number } | null;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!canPersistDebugState()) {
      window.localStorage.removeItem(USER_INPUT_DEBUG_STORAGE_KEY);
      return;
    }
    if (input.enabled) {
      window.localStorage.setItem(
        USER_INPUT_DEBUG_STORAGE_KEY,
        JSON.stringify({
          enabled: true,
          collapsed: input.collapsed,
          position: input.position,
        }),
      );
      return;
    }
    window.localStorage.removeItem(USER_INPUT_DEBUG_STORAGE_KEY);
  } catch {
    // Ignore storage write failures in debug mode.
  }
}

function resolveInitialEnabled(): boolean {
  const enabled = readSearchParamEnabled() || (canPersistDebugState() && readPersistedEnabled());
  if (enabled) {
    const layout = readPersistedLayout();
    persistDebugState({
      enabled: true,
      collapsed: layout.collapsed,
      position: layout.position,
    });
  }
  return enabled;
}

function nextDebugId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `user-input-debug-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialEnabled = resolveInitialEnabled();
const initialLayout = readPersistedLayout();

export const useUserInputDebugStore = create<UserInputDebugState>((set) => ({
  enabled: initialEnabled,
  collapsed: initialLayout.collapsed,
  position: initialLayout.position,
  entries: [],
  setEnabled: (enabled) => {
    set((state) => {
      persistDebugState({
        enabled,
        collapsed: enabled ? state.collapsed : false,
        position: enabled ? state.position : null,
      });
      return {
        enabled,
        collapsed: enabled ? state.collapsed : false,
        position: enabled ? state.position : null,
      };
    });
  },
  setCollapsed: (collapsed) => {
    set((state) => {
      persistDebugState({
        enabled: state.enabled,
        collapsed,
        position: state.position,
      });
      return { collapsed };
    });
  },
  setPosition: (position) => {
    set((state) => {
      persistDebugState({
        enabled: state.enabled,
        collapsed: state.collapsed,
        position,
      });
      return { position };
    });
  },
  pushEntry: (entry) =>
    set((state) => {
      if (!state.enabled) {
        return state;
      }
      const nextEntry: UserInputDebugEntry = {
        ...entry,
        id: nextDebugId(),
        timestamp: new Date().toISOString(),
      };
      const nextEntries = [...state.entries, nextEntry];
      return {
        entries:
          nextEntries.length > MAX_DEBUG_ENTRIES
            ? nextEntries.slice(nextEntries.length - MAX_DEBUG_ENTRIES)
            : nextEntries,
      };
    }),
  clear: () => set({ entries: [] }),
}));

export function logUserInputDebug(entry: Omit<UserInputDebugEntry, "id" | "timestamp">): void {
  const store = useUserInputDebugStore.getState();
  if (!store.enabled) {
    return;
  }
  store.pushEntry(entry);
  console.debug("[user-input-debug]", entry);
}

export function setUserInputDebugEnabled(enabled: boolean): void {
  useUserInputDebugStore.getState().setEnabled(enabled);
}

export function setUserInputDebugCollapsed(collapsed: boolean): void {
  useUserInputDebugStore.getState().setCollapsed(collapsed);
}

export function setUserInputDebugPosition(position: { x: number; y: number } | null): void {
  useUserInputDebugStore.getState().setPosition(position);
}

export function clearUserInputDebugEntries(): void {
  useUserInputDebugStore.getState().clear();
}

export function isUserInputDebugEnabled(): boolean {
  return useUserInputDebugStore.getState().enabled;
}
