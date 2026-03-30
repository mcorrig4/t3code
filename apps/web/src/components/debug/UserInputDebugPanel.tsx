import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { BrushCleaningIcon, CheckIcon, ChevronsUpDownIcon, CopyIcon, XIcon } from "lucide-react";

import {
  buildCrashBreadcrumbReport,
  clearCrashBreadcrumbs,
  loadCrashBreadcrumbSessions,
  setSelectedCrashSession,
  useCrashDebugStore,
} from "~/debug/crashDebug";
import {
  clearUserInputDebugEntries,
  setUserInputDebugCollapsed,
  setUserInputDebugEnabled,
  setUserInputDebugPosition,
  useUserInputDebugStore,
} from "~/debug/userInputDebug";
import { Button } from "../ui/button";
import { cn } from "~/lib/utils";

function toneClass(level: "info" | "success" | "warning" | "error"): string {
  switch (level) {
    case "success":
      return "bg-emerald-500/10 text-emerald-100";
    case "warning":
      return "bg-amber-500/10 text-amber-100";
    case "error":
      return "bg-rose-500/10 text-rose-100";
    default:
      return "bg-white/6 text-white/90";
  }
}

function formatDetail(detail: string | undefined): string | null {
  if (!detail) {
    return null;
  }
  const trimmed = detail.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type DebugPanelTab = "userInput" | "crash";

function formatSessionDisposition(disposition: string): string {
  switch (disposition) {
    case "clean-exit":
      return "Clean exit";
    case "root-error":
      return "Root error";
    case "possible-renderer-crash":
      return "Possible renderer crash";
    default:
      return "Active";
  }
}

export function UserInputDebugPanel() {
  const enabled = useUserInputDebugStore((store) => store.enabled);
  const collapsed = useUserInputDebugStore((store) => store.collapsed);
  const position = useUserInputDebugStore((store) => store.position);
  const entries = useUserInputDebugStore((store) => store.entries);
  const crashSessions = useCrashDebugStore((store) => store.sessions);
  const selectedCrashSessionId = useCrashDebugStore((store) => store.selectedSessionId);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<DebugPanelTab>("userInput");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const selectedCrashSession =
    crashSessions.find((session) => session.id === selectedCrashSessionId) ??
    crashSessions[0] ??
    null;
  const previousCrashSession = crashSessions[1] ?? null;

  const copyUserInputEntries = useCallback(async () => {
    const text = entries
      .map((entry) =>
        [
          entry.timestamp,
          entry.level.toUpperCase(),
          entry.stage,
          entry.message,
          entry.threadId ? `thread=${entry.threadId}` : null,
          entry.requestId ? `request=${entry.requestId}` : null,
          entry.detail ? `detail=${entry.detail}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [entries]);

  const copyCrashEntries = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        buildCrashBreadcrumbReport(selectedCrashSession?.id ?? null),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [selectedCrashSession?.id]);

  const copyLatestForTab = useCallback(async () => {
    if (activeTab === "crash") {
      await copyCrashEntries();
      return;
    }
    await copyUserInputEntries();
  }, [activeTab, copyCrashEntries, copyUserInputEntries]);

  const renderedEntries = useMemo(() => entries.toReversed(), [entries]);
  const renderedCrashEntries = useMemo(
    () => selectedCrashSession?.breadcrumbs.toReversed() ?? [],
    [selectedCrashSession],
  );

  const updatePosition = useCallback(
    (nextX: number, nextY: number, width: number, height: number) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 8;
      const clampedX = Math.min(
        Math.max(margin, nextX),
        Math.max(margin, viewportWidth - width - margin),
      );
      const clampedY = Math.min(
        Math.max(margin, nextY),
        Math.max(margin, viewportHeight - height - margin),
      );
      setUserInputDebugPosition({ x: clampedX, y: clampedY });
    },
    [],
  );

  const beginDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onDragMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && Math.abs(deltaX) + Math.abs(deltaY) > 6) {
        dragState.moved = true;
      }
      updatePosition(
        dragState.originX + deltaX,
        dragState.originY + deltaY,
        dragState.width,
        dragState.height,
      );
      event.preventDefault();
    },
    [updatePosition],
  );

  const endDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragStateRef.current = null;
    suppressClickRef.current = dragState.moved;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  // Re-clamp position when expanding from collapsed state so the wider
  // panel doesn't overflow the viewport.
  useEffect(() => {
    if (!enabled || collapsed || !position) {
      return;
    }
    // Wait one frame so the expanded panel has rendered and has its real size.
    const raf = requestAnimationFrame(() => {
      const element = containerRef.current;
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      updatePosition(position.x, position.y, rect.width, rect.height);
    });
    return () => cancelAnimationFrame(raf);
    // Only run when collapsed changes – not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collapsed]);

  useEffect(() => {
    if (!enabled || !position) {
      return;
    }
    const onResize = () => {
      const element = containerRef.current;
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      updatePosition(position.x, position.y, rect.width, rect.height);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, position, updatePosition]);

  if (!enabled) {
    return null;
  }

  const floatingStyle =
    position === null
      ? undefined
      : {
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
        };

  const actionButtonClass =
    "h-5 rounded px-1.5 text-[10px] font-medium border-white/20 bg-white/12 text-white hover:bg-white/22 hover:text-white";
  const iconButtonClass =
    "size-5 rounded-md border-white/20 bg-white/12 text-white hover:bg-white/22 hover:text-white";
  const tabButtonClass = "rounded px-1.5 py-0.5 text-[10px] leading-none font-medium";

  if (collapsed) {
    return (
      <div ref={containerRef} className="fixed bottom-3 right-3 z-50" style={floatingStyle}>
        <button
          type="button"
          className="rounded-full border border-white/15 bg-neutral-950/92 px-2.5 py-1 text-[10px] font-medium text-white shadow-2xl backdrop-blur-md"
          onPointerDown={beginDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => {
            if (suppressClickRef.current) {
              return;
            }
            setUserInputDebugCollapsed(false);
          }}
        >
          Open Debug
        </button>
      </div>
    );
  }

  return (
    <aside
      ref={containerRef}
      className="fixed inset-x-2 bottom-2 z-50 max-h-[42vh] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-white/12 bg-neutral-950/92 text-[11px] leading-tight text-white shadow-2xl backdrop-blur-md sm:right-4 sm:w-[24rem] sm:inset-x-auto"
      style={floatingStyle}
    >
      <div className="flex items-start justify-between gap-1 border-b border-white/10 px-1.5 py-1">
        <div
          className="min-w-0 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={beginDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase">
            User Input Debug
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <div className="flex items-center rounded-md border border-white/10 bg-white/6 p-0.5">
            <button
              type="button"
              className={cn(
                tabButtonClass,
                activeTab === "userInput"
                  ? "bg-white/16 text-white"
                  : "text-white/60 hover:text-white",
              )}
              onClick={() => setActiveTab("userInput")}
            >
              User Input
            </button>
            <button
              type="button"
              className={cn(
                tabButtonClass,
                activeTab === "crash" ? "bg-white/16 text-white" : "text-white/60 hover:text-white",
              )}
              onClick={() => setActiveTab("crash")}
            >
              Crash / OOM
            </button>
          </div>
          <Button
            size="icon-xs"
            variant="outline"
            className={iconButtonClass}
            onClick={() => {
              if (activeTab === "crash") {
                clearCrashBreadcrumbs();
                setSelectedCrashSession(null);
                return;
              }
              clearUserInputDebugEntries();
            }}
            title={
              activeTab === "crash" ? "Clear crash breadcrumbs" : "Clear user input breadcrumbs"
            }
            aria-label={
              activeTab === "crash" ? "Clear crash breadcrumbs" : "Clear user input breadcrumbs"
            }
          >
            <BrushCleaningIcon className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            className={iconButtonClass}
            onClick={() => void copyLatestForTab()}
            title={activeTab === "crash" ? "Copy latest crash breadcrumbs" : "Copy latest entries"}
            aria-label={
              activeTab === "crash" ? "Copy latest crash breadcrumbs" : "Copy latest entries"
            }
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          </Button>
          {activeTab === "crash" ? (
            <>
              <Button
                size="xs"
                variant="outline"
                className={actionButtonClass}
                disabled={!previousCrashSession}
                onClick={() => {
                  const sessions = loadCrashBreadcrumbSessions();
                  const previous = sessions[1] ?? null;
                  setSelectedCrashSession(previous?.id ?? null);
                }}
              >
                Prev Session
              </Button>
            </>
          ) : null}
          <Button
            size="icon-xs"
            variant="outline"
            className={iconButtonClass}
            onClick={() => setUserInputDebugCollapsed(true)}
            title="Collapse debug panel"
            aria-label="Collapse debug panel"
          >
            <ChevronsUpDownIcon className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            className={iconButtonClass}
            onClick={() => setUserInputDebugEnabled(false)}
            title="Close debug panel"
            aria-label="Close debug panel"
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>
      <div className="max-h-[calc(42vh-2rem)] divide-y divide-white/8 overflow-y-auto">
        {activeTab === "crash" ? (
          renderedCrashEntries.length === 0 ? (
            <div className="px-1.5 py-2 text-[10px] text-white/55">
              No crash breadcrumbs captured yet.
            </div>
          ) : (
            <>
              {selectedCrashSession ? (
                <section className="border-b border-white/8 bg-white/5 px-1.5 py-1.5 text-[10px] text-white/70">
                  <p className="font-semibold text-white/85">
                    Viewing session {selectedCrashSession.id}
                  </p>
                  <p className="mt-0.5">
                    {formatSessionDisposition(selectedCrashSession.disposition)} · started{" "}
                    {new Date(selectedCrashSession.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </section>
              ) : null}
              {renderedCrashEntries.map((entry) => {
                const detail = formatDetail(entry.detail);
                return (
                  <section key={entry.id} className={cn("px-1.5 py-1", toneClass(entry.level))}>
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                          {entry.stage}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug">{entry.message}</p>
                      </div>
                      <time className="shrink-0 text-[9px] text-white/45">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </time>
                    </div>
                    {entry.route ? (
                      <p className="mt-0.5 text-[10px] text-white/55">route={entry.route}</p>
                    ) : null}
                    {detail ? (
                      <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/20 px-1 py-0.5 text-[9px] leading-snug text-white/72">
                        {detail}
                      </pre>
                    ) : null}
                  </section>
                );
              })}
            </>
          )
        ) : renderedEntries.length === 0 ? (
          <div className="px-1.5 py-2 text-[10px] text-white/55">Waiting for breadcrumbs...</div>
        ) : (
          renderedEntries.map((entry) => {
            const detail = formatDetail(entry.detail);
            return (
              <section key={entry.id} className={cn("px-1.5 py-1", toneClass(entry.level))}>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                      {entry.stage}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug">{entry.message}</p>
                  </div>
                  <time className="shrink-0 text-[9px] text-white/45">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </div>
                {entry.threadId || entry.requestId ? (
                  <p className="mt-0.5 text-[10px] text-white/55">
                    {entry.threadId ? `thread=${entry.threadId}` : null}
                    {entry.threadId && entry.requestId ? " " : null}
                    {entry.requestId ? `request=${entry.requestId}` : null}
                  </p>
                ) : null}
                {detail ? (
                  <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/20 px-1 py-0.5 text-[9px] leading-snug text-white/72">
                    {detail}
                  </pre>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
