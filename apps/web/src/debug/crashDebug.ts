import { create } from "zustand";

const CRASH_DEBUG_STORAGE_KEY = "t3code:debug-crash-breadcrumbs";
const MAX_CRASH_SESSIONS = 3;
const MAX_CRASH_BREADCRUMBS = 120;
const MAX_MESSAGE_CHARS = 240;
const MAX_DETAIL_CHARS = 1_500;
const MAX_COPY_BREADCRUMBS = 40;

type CrashBreadcrumbLevel = "info" | "warning" | "error";
export type CrashSessionDisposition =
  | "active"
  | "clean-exit"
  | "root-error"
  | "possible-renderer-crash";

export interface CrashBreadcrumbEntry {
  id: string;
  timestamp: string;
  level: CrashBreadcrumbLevel;
  stage: string;
  message: string;
  route?: string;
  detail?: string;
}

export interface CrashBreadcrumbSession {
  id: string;
  startedAt: string;
  updatedAt: string;
  disposition: CrashSessionDisposition;
  breadcrumbs: CrashBreadcrumbEntry[];
}

interface CrashDebugEnvelope {
  currentSessionId: string | null;
  sessions: CrashBreadcrumbSession[];
}

interface CrashDebugState {
  sessions: CrashBreadcrumbSession[];
  selectedSessionId: string | null;
  setSessions: (sessions: CrashBreadcrumbSession[]) => void;
  setSelectedSessionId: (sessionId: string | null) => void;
}

interface PersistedCrashBreadcrumbInput {
  readonly level: CrashBreadcrumbLevel;
  readonly stage: string;
  readonly message: string;
  readonly route?: string | undefined;
  readonly detail?: string | undefined;
}

interface SnapshotSummaryInput {
  readonly snapshotSequence: number;
  readonly projectCount: number;
  readonly threadCount: number;
  readonly totalMessageCount: number;
  readonly totalCheckpointCount: number;
  readonly totalActivityCount: number;
  readonly currentRoute?: string | undefined;
}

const initialCrashEnvelope = readCrashDebugEnvelope();

export const useCrashDebugStore = create<CrashDebugState>((set) => ({
  sessions: initialCrashEnvelope.sessions,
  selectedSessionId: initialCrashEnvelope.currentSessionId,
  setSessions: (sessions) => set({ sessions }),
  setSelectedSessionId: (selectedSessionId) => set({ selectedSessionId }),
}));

function nextDebugId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `crash-debug-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function truncateText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars - 16)}...[truncated]`;
}

function resolveCurrentRoute(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function currentHeapSummary(): string | undefined {
  if (typeof performance === "undefined") {
    return undefined;
  }
  const candidate = performance as Performance & {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  };
  if (!candidate.memory) {
    return undefined;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = candidate.memory;
  const values = [
    typeof usedJSHeapSize === "number" ? `used=${usedJSHeapSize}` : null,
    typeof totalJSHeapSize === "number" ? `total=${totalJSHeapSize}` : null,
    typeof jsHeapSizeLimit === "number" ? `limit=${jsHeapSizeLimit}` : null,
  ].filter(Boolean);

  return values.length > 0 ? values.join(" ") : undefined;
}

function readCrashDebugEnvelope(): CrashDebugEnvelope {
  if (typeof window === "undefined") {
    return {
      currentSessionId: null,
      sessions: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(CRASH_DEBUG_STORAGE_KEY);
    if (!raw) {
      return {
        currentSessionId: null,
        sessions: [],
      };
    }
    const parsed = JSON.parse(raw) as {
      currentSessionId?: unknown;
      sessions?: Array<{
        id?: unknown;
        startedAt?: unknown;
        updatedAt?: unknown;
        disposition?: unknown;
        breadcrumbs?: Array<{
          id?: unknown;
          timestamp?: unknown;
          level?: unknown;
          stage?: unknown;
          message?: unknown;
          route?: unknown;
          detail?: unknown;
        }>;
      }>;
    };
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions
          .map((session): CrashBreadcrumbSession | null => {
            if (
              typeof session?.id !== "string" ||
              typeof session.startedAt !== "string" ||
              typeof session.updatedAt !== "string"
            ) {
              return null;
            }
            const disposition =
              session.disposition === "active" ||
              session.disposition === "clean-exit" ||
              session.disposition === "root-error" ||
              session.disposition === "possible-renderer-crash"
                ? session.disposition
                : "active";
            const breadcrumbs = Array.isArray(session.breadcrumbs)
              ? session.breadcrumbs
                  .map((entry): CrashBreadcrumbEntry | null => {
                    if (
                      typeof entry?.id !== "string" ||
                      typeof entry.timestamp !== "string" ||
                      typeof entry.level !== "string" ||
                      typeof entry.stage !== "string" ||
                      typeof entry.message !== "string"
                    ) {
                      return null;
                    }
                    return {
                      id: entry.id,
                      timestamp: entry.timestamp,
                      level:
                        entry.level === "warning" || entry.level === "error" ? entry.level : "info",
                      stage: entry.stage,
                      message: entry.message,
                      ...(typeof entry.route === "string" ? { route: entry.route } : {}),
                      ...(typeof entry.detail === "string" ? { detail: entry.detail } : {}),
                    };
                  })
                  .filter((entry): entry is CrashBreadcrumbEntry => entry !== null)
              : [];
            return {
              id: session.id,
              startedAt: session.startedAt,
              updatedAt: session.updatedAt,
              disposition,
              breadcrumbs,
            };
          })
          .filter((session): session is CrashBreadcrumbSession => session !== null)
      : [];

    return {
      currentSessionId:
        typeof parsed.currentSessionId === "string" ? parsed.currentSessionId : null,
      sessions,
    };
  } catch {
    return {
      currentSessionId: null,
      sessions: [],
    };
  }
}

function persistCrashDebugEnvelope(envelope: CrashDebugEnvelope): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CRASH_DEBUG_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore storage failures to avoid destabilizing the app during OOM pressure.
  }
}

function syncCrashDebugStore(envelope: CrashDebugEnvelope): void {
  const state = useCrashDebugStore.getState();
  state.setSessions(envelope.sessions);
  const selectedSessionStillExists =
    state.selectedSessionId !== null &&
    envelope.sessions.some((session) => session.id === state.selectedSessionId);

  if (selectedSessionStillExists) {
    return;
  }

  state.setSelectedSessionId(envelope.currentSessionId ?? envelope.sessions[0]?.id ?? null);
}

function updateCrashDebugEnvelope(
  updater: (envelope: CrashDebugEnvelope) => CrashDebugEnvelope,
): CrashDebugEnvelope {
  const nextEnvelope = updater(readCrashDebugEnvelope());
  persistCrashDebugEnvelope(nextEnvelope);
  syncCrashDebugStore(nextEnvelope);
  return nextEnvelope;
}

function withCurrentSession(envelope: CrashDebugEnvelope): {
  envelope: CrashDebugEnvelope;
  session: CrashBreadcrumbSession | null;
} {
  const session = envelope.currentSessionId
    ? (envelope.sessions.find((candidate) => candidate.id === envelope.currentSessionId) ?? null)
    : null;
  return { envelope, session };
}

function appendBreadcrumb(
  session: CrashBreadcrumbSession,
  input: PersistedCrashBreadcrumbInput,
): CrashBreadcrumbSession {
  const timestamp = new Date().toISOString();
  const entry: CrashBreadcrumbEntry = {
    id: nextDebugId(),
    timestamp,
    level: input.level,
    stage: truncateText(input.stage, 80),
    message: truncateText(input.message, MAX_MESSAGE_CHARS),
    route: truncateText(input.route ?? resolveCurrentRoute(), 200),
    ...(input.detail ? { detail: truncateText(input.detail, MAX_DETAIL_CHARS) } : {}),
  };
  const nextBreadcrumbs = [...session.breadcrumbs, entry];

  return {
    ...session,
    updatedAt: timestamp,
    breadcrumbs:
      nextBreadcrumbs.length > MAX_CRASH_BREADCRUMBS
        ? nextBreadcrumbs.slice(nextBreadcrumbs.length - MAX_CRASH_BREADCRUMBS)
        : nextBreadcrumbs,
  };
}

function inferCrashBreadcrumb(): PersistedCrashBreadcrumbInput {
  const detail = currentHeapSummary();
  return {
    level: "warning",
    stage: "session-inferred-crash",
    message: "Previous crash debug session ended without a clean exit marker.",
    ...(detail ? { detail } : {}),
  };
}

export function initializeCrashDebugSession(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextSessionId = nextDebugId();
  const timestamp = new Date().toISOString();
  const initialHeapSummary = currentHeapSummary();

  const nextEnvelope = updateCrashDebugEnvelope((envelope) => {
    const sessions = envelope.sessions.map((session) => {
      if (session.id !== envelope.currentSessionId || session.disposition !== "active") {
        return session;
      }

      return appendBreadcrumb(
        {
          ...session,
          disposition: "possible-renderer-crash",
          updatedAt: timestamp,
        },
        inferCrashBreadcrumb(),
      );
    });

    const nextSession: CrashBreadcrumbSession = {
      id: nextSessionId,
      startedAt: timestamp,
      updatedAt: timestamp,
      disposition: "active",
      breadcrumbs: [
        {
          id: nextDebugId(),
          timestamp,
          level: "info",
          stage: "session-start",
          message: "Crash debug session started.",
          route: resolveCurrentRoute(),
          ...(initialHeapSummary ? { detail: initialHeapSummary } : {}),
        },
      ],
    };

    return {
      currentSessionId: nextSessionId,
      sessions: [nextSession, ...sessions].slice(0, MAX_CRASH_SESSIONS),
    };
  });

  return nextEnvelope.currentSessionId;
}

export function logCrashBreadcrumb(entry: PersistedCrashBreadcrumbInput): void {
  if (typeof window === "undefined") {
    return;
  }

  updateCrashDebugEnvelope((envelope) => {
    const { session } = withCurrentSession(envelope);
    if (!session) {
      return envelope;
    }

    return {
      ...envelope,
      sessions: envelope.sessions.map((candidate) =>
        candidate.id === session.id ? appendBreadcrumb(candidate, entry) : candidate,
      ),
    };
  });
}

export function logCrashBreadcrumbLazy(factory: () => PersistedCrashBreadcrumbInput): void {
  logCrashBreadcrumb(factory());
}

export function setCrashSessionDisposition(
  disposition: Exclude<CrashSessionDisposition, "active">,
): void {
  if (typeof window === "undefined") {
    return;
  }

  updateCrashDebugEnvelope((envelope) => {
    const { session } = withCurrentSession(envelope);
    if (!session || session.disposition === disposition) {
      return envelope;
    }

    return {
      ...envelope,
      sessions: envelope.sessions.map((candidate) =>
        candidate.id === session.id
          ? {
              ...candidate,
              disposition,
              updatedAt: new Date().toISOString(),
            }
          : candidate,
      ),
    };
  });
}

export function clearCrashBreadcrumbs(): void {
  updateCrashDebugEnvelope((envelope) => {
    const { session } = withCurrentSession(envelope);
    if (!session) {
      return envelope;
    }

    const clearedSession: CrashBreadcrumbSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      breadcrumbs: [],
    };

    return {
      ...envelope,
      sessions: envelope.sessions.map((candidate) =>
        candidate.id === clearedSession.id ? clearedSession : candidate,
      ),
    };
  });
}

export function loadCrashBreadcrumbSessions(): CrashBreadcrumbSession[] {
  return readCrashDebugEnvelope().sessions;
}

export function setSelectedCrashSession(sessionId: string | null): void {
  useCrashDebugStore.getState().setSelectedSessionId(sessionId);
}

export function formatCrashSnapshotSummary(input: SnapshotSummaryInput): string {
  const values = {
    snapshotSequence: input.snapshotSequence,
    projectCount: input.projectCount,
    threadCount: input.threadCount,
    totalMessageCount: input.totalMessageCount,
    totalCheckpointCount: input.totalCheckpointCount,
    totalActivityCount: input.totalActivityCount,
    ...(input.currentRoute ? { currentRoute: input.currentRoute } : {}),
    ...(currentHeapSummary() ? { heap: currentHeapSummary() } : {}),
  };
  return JSON.stringify(values, null, 2);
}

export function buildCrashBreadcrumbReport(sessionId?: string | null): string {
  const envelope = readCrashDebugEnvelope();
  const targetSession =
    (sessionId ? envelope.sessions.find((session) => session.id === sessionId) : null) ??
    (envelope.currentSessionId
      ? envelope.sessions.find((session) => session.id === envelope.currentSessionId)
      : null) ??
    envelope.sessions[0] ??
    null;

  if (!targetSession) {
    return "No crash breadcrumbs captured yet.";
  }

  const latestSnapshotBreadcrumb =
    targetSession.breadcrumbs
      .toReversed()
      .find(
        (entry) =>
          entry.stage === "snapshot-sync-complete" || entry.stage === "snapshot-sync-failed",
      ) ?? null;
  const latestDomainEvent =
    targetSession.breadcrumbs.toReversed().find((entry) => entry.stage === "domain-event") ?? null;

  const lines = [
    `Generated: ${new Date().toISOString()}`,
    `Selected session: ${targetSession.id}`,
    `Selected session disposition: ${targetSession.disposition}`,
    `Selected session started: ${targetSession.startedAt}`,
    `Selected session updated: ${targetSession.updatedAt}`,
    `Current session id: ${envelope.currentSessionId ?? "none"}`,
    `Current route: ${resolveCurrentRoute()}`,
    currentHeapSummary() ? `Heap: ${currentHeapSummary()}` : null,
    "",
    "Latest snapshot summary:",
    latestSnapshotBreadcrumb?.detail ?? "No snapshot summary captured.",
    "",
    "Latest domain event:",
    latestDomainEvent
      ? `${latestDomainEvent.timestamp} | ${latestDomainEvent.message}${latestDomainEvent.detail ? ` | ${latestDomainEvent.detail}` : ""}`
      : "No domain event breadcrumb captured.",
    "",
    "Recent crash breadcrumbs:",
    ...targetSession.breadcrumbs
      .slice(-MAX_COPY_BREADCRUMBS)
      .map((entry) =>
        [
          entry.timestamp,
          entry.level.toUpperCase(),
          entry.stage,
          entry.message,
          entry.route ? `route=${entry.route}` : null,
          entry.detail ? `detail=${entry.detail}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      ),
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
