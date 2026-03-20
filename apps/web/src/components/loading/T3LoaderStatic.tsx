import { APP_BOOT_SHELL_EXIT_MS } from "../../bootConstants";
import { T3LoaderMarkup } from "./T3LoaderMarkup";

export const APP_BOOT_SHELL_ID = "app-boot-shell";
export const APP_BOOT_SHELL_EXIT_CLASS = "app-boot-shell--exit";

export function T3LoaderStatic() {
  return (
    <>
      <style>{`
        #${APP_BOOT_SHELL_ID} {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
          z-index: 2147483647;
          opacity: 1;
          user-select: none;
          -webkit-user-select: none;
          filter: blur(0) brightness(1);
          transform: scale(1);
          transform-origin: center;
          will-change: opacity, transform, filter;
          transition:
            opacity ${APP_BOOT_SHELL_EXIT_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
            transform ${APP_BOOT_SHELL_EXIT_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
            filter ${APP_BOOT_SHELL_EXIT_MS}ms cubic-bezier(0.16, 1, 0.3, 1),
            visibility ${APP_BOOT_SHELL_EXIT_MS}ms ease;
        }

        #${APP_BOOT_SHELL_ID}.${APP_BOOT_SHELL_EXIT_CLASS} {
          opacity: 0;
          filter: blur(12px) brightness(1.18);
          transform: scale(1.02);
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>
      <T3LoaderMarkup id={APP_BOOT_SHELL_ID} decorative />
    </>
  );
}
