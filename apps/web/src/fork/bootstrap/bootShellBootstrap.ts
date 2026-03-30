import { APP_BOOT_FAIL_SAFE_MS, APP_BOOT_MIN_DURATION_MS } from "../../bootConstants";
import { dismissBootShell, scheduleBootShellFailSafe } from "../../bootShell";
import { waitForBootReady } from "../../bootState";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function installBootShellBootstrap(): { readonly whenReady: Promise<void> } {
  scheduleBootShellFailSafe();

  // Race boot-ready against the failsafe timeout so whenReady never hangs.
  const bootOrTimeout = Promise.race([waitForBootReady(), delay(APP_BOOT_FAIL_SAFE_MS)]);

  const whenReady = Promise.all([bootOrTimeout, delay(APP_BOOT_MIN_DURATION_MS)]).then(() => {
    window.requestAnimationFrame(() => {
      dismissBootShell();
    });
  });

  return { whenReady };
}
