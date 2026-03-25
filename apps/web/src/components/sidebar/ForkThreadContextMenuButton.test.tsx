import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ForkThreadContextMenuButton, {
  openThreadContextMenuFromButton,
  stopThreadContextMenuButtonPointerDown,
} from "./ForkThreadContextMenuButton";

describe("ForkThreadContextMenuButton", () => {
  it("renders a button with the expected aria-label", () => {
    const html = renderToStaticMarkup(
      <ForkThreadContextMenuButton
        threadTitle="Debug flaky sync"
        isHighlighted={false}
        onOpenFromAnchor={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Open thread actions for Debug flaky sync"');
    expect(html).toContain('data-slot="fork-thread-context-menu-button"');
  });

  it("calls onOpenFromAnchor on click with a lower-right button anchor", () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const onOpenFromAnchor = vi.fn();

    openThreadContextMenuFromButton(
      {
        preventDefault,
        stopPropagation,
        currentTarget: {
          getBoundingClientRect: () => ({
            right: 36,
            bottom: 44,
          }),
        },
      },
      onOpenFromAnchor,
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onOpenFromAnchor).toHaveBeenCalledWith({ x: 36, y: 48 });
  });

  it("stops propagation on pointer down so parent row handlers do not run", () => {
    const stopPropagation = vi.fn();

    stopThreadContextMenuButtonPointerDown({ stopPropagation });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});
