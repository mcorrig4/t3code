import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

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

export function UserInputDebugPanel() {
  const enabled = useUserInputDebugStore((store) => store.enabled);
  const collapsed = useUserInputDebugStore((store) => store.collapsed);
  const position = useUserInputDebugStore((store) => store.position);
  const entries = useUserInputDebugStore((store) => store.entries);
  const [copied, setCopied] = useState(false);
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

  const copyEntries = useCallback(async () => {
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

  const renderedEntries = useMemo(() => entries.toReversed(), [entries]);

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
    "border-white/20 bg-white/12 text-white hover:bg-white/22 hover:text-white";

  if (collapsed) {
    return (
      <div ref={containerRef} className="fixed bottom-3 right-3 z-50" style={floatingStyle}>
        <button
          type="button"
          className="rounded-full border border-white/15 bg-neutral-950/92 px-4 py-2 text-sm font-medium text-white shadow-2xl backdrop-blur-md"
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
      className="fixed inset-x-2 bottom-2 z-50 max-h-[45vh] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-white/12 bg-neutral-950/92 text-white shadow-2xl backdrop-blur-md sm:right-4 sm:w-[28rem] sm:inset-x-auto"
      style={floatingStyle}
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-white/10 px-2 py-1.5">
        <div
          className="min-w-0 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={beginDrag}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
            User Input Debug
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className={actionButtonClass}
            onClick={() => clearUserInputDebugEntries()}
          >
            Clear
          </Button>
          <Button
            size="xs"
            variant="outline"
            className={actionButtonClass}
            onClick={() => void copyEntries()}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className={actionButtonClass}
            onClick={() => setUserInputDebugCollapsed(true)}
          >
            Collapse
          </Button>
          <Button
            size="xs"
            variant="outline"
            className={actionButtonClass}
            onClick={() => setUserInputDebugEnabled(false)}
          >
            Off
          </Button>
        </div>
      </div>
      <div className="max-h-[calc(45vh-2.5rem)] divide-y divide-white/8 overflow-y-auto">
        {renderedEntries.length === 0 ? (
          <div className="px-2 py-3 text-xs text-white/55">
            Waiting for breadcrumbs...
          </div>
        ) : (
          renderedEntries.map((entry) => {
            const detail = formatDetail(entry.detail);
            return (
              <section
                key={entry.id}
                className={cn("px-2 py-1.5", toneClass(entry.level))}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                      {entry.stage}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug">{entry.message}</p>
                  </div>
                  <time className="shrink-0 text-[10px] text-white/45">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </div>
                {entry.threadId || entry.requestId ? (
                  <p className="mt-1 text-[11px] text-white/55">
                    {entry.threadId ? `thread=${entry.threadId}` : null}
                    {entry.threadId && entry.requestId ? " " : null}
                    {entry.requestId ? `request=${entry.requestId}` : null}
                  </p>
                ) : null}
                {detail ? (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/20 px-1.5 py-1 text-[10px] leading-relaxed text-white/72">
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
