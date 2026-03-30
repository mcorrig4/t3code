import { EllipsisVerticalIcon } from "lucide-react";
import { type MouseEvent, type PointerEvent, useCallback } from "react";

import { cn } from "~/lib/utils";

export interface ForkThreadContextMenuButtonProps {
  threadTitle: string;
  isHighlighted: boolean;
  onOpenFromAnchor: (position: { x: number; y: number }) => void;
}

export function stopThreadContextMenuButtonPointerDown(event: {
  stopPropagation: () => void;
}): void {
  event.stopPropagation();
}

export function openThreadContextMenuFromButton(
  event: {
    preventDefault: () => void;
    stopPropagation: () => void;
    currentTarget: {
      getBoundingClientRect: () => Pick<DOMRect, "right" | "bottom">;
    };
  },
  onOpenFromAnchor: (position: { x: number; y: number }) => void,
): void {
  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();
  onOpenFromAnchor({
    x: Math.round(rect.right),
    y: Math.round(rect.bottom + 4),
  });
}

export default function ForkThreadContextMenuButton({
  threadTitle,
  isHighlighted,
  onOpenFromAnchor,
}: ForkThreadContextMenuButtonProps) {
  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    stopThreadContextMenuButtonPointerDown(event);
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      openThreadContextMenuFromButton(event, onOpenFromAnchor);
    },
    [onOpenFromAnchor],
  );

  return (
    <button
      type="button"
      aria-label={`Open thread actions for ${threadTitle}`}
      className={cn(
        "pointer-coarse:opacity-100 inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] text-muted-foreground/40 transition-[opacity,color,background-color] hover:bg-accent/70 focus-visible:bg-accent/70 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:bg-accent/80 sm:size-4.5 sm:opacity-0 sm:group-hover/thread-row:opacity-100 sm:group-focus-within/thread-row:opacity-100",
        isHighlighted && "opacity-100 text-foreground/72 dark:text-foreground/82",
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      data-thread-selection-safe
      data-slot="fork-thread-context-menu-button"
    >
      <EllipsisVerticalIcon className="size-3.5" />
    </button>
  );
}
