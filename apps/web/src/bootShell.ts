import { APP_BOOT_FAIL_SAFE_MS, APP_BOOT_SHELL_EXIT_MS } from "./bootConstants";
import { APP_BOOT_SHELL_EXIT_CLASS, APP_BOOT_SHELL_ID } from "./components/loading/T3LoaderStatic";

let bootShellRemovalScheduled = false;

function removeBootShellElement(shell: HTMLElement): void {
  shell.remove();
}

export function dismissBootShell(options?: { readonly immediate?: boolean }): void {
  if (typeof document === "undefined") {
    return;
  }

  const shell = document.getElementById(APP_BOOT_SHELL_ID);
  if (!(shell instanceof HTMLElement)) {
    return;
  }

  if (shell.dataset.state === "hidden" || shell.dataset.state === "exiting") {
    return;
  }

  if (options?.immediate) {
    shell.dataset.state = "hidden";
    removeBootShellElement(shell);
    return;
  }

  shell.dataset.state = "exiting";
  shell.classList.add(APP_BOOT_SHELL_EXIT_CLASS);

  const removeSplash = () => {
    if (shell.isConnected) {
      shell.dataset.state = "hidden";
      removeBootShellElement(shell);
    }
  };

  shell.addEventListener("transitionend", removeSplash, { once: true });
  window.setTimeout(removeSplash, APP_BOOT_SHELL_EXIT_MS + 100);
}

export function scheduleBootShellFailSafe(): void {
  if (typeof window === "undefined" || bootShellRemovalScheduled) {
    return;
  }

  bootShellRemovalScheduled = true;
  window.setTimeout(() => {
    dismissBootShell({ immediate: true });
  }, APP_BOOT_FAIL_SAFE_MS);
}
