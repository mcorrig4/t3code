const BOOT_SHELL_ID = "app-boot-shell";
const BOOT_SHELL_EXIT_DURATION_MS = 320;
const BOOT_SHELL_FAIL_SAFE_MS = 6000;

let bootShellRemovalScheduled = false;

function removeBootShellElement(shell: HTMLElement): void {
  shell.remove();
}

export function hideBootShell(options?: { readonly immediate?: boolean }): void {
  if (typeof document === "undefined") {
    return;
  }

  const shell = document.getElementById(BOOT_SHELL_ID);
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
  shell.style.opacity = "0";
  shell.style.transform = "scale(1.01)";
  shell.style.pointerEvents = "none";

  window.setTimeout(() => {
    if (shell.isConnected) {
      shell.dataset.state = "hidden";
      removeBootShellElement(shell);
    }
  }, BOOT_SHELL_EXIT_DURATION_MS);
}

export function scheduleBootShellFailSafe(): void {
  if (typeof window === "undefined" || bootShellRemovalScheduled) {
    return;
  }

  bootShellRemovalScheduled = true;
  window.setTimeout(() => {
    hideBootShell({ immediate: true });
  }, BOOT_SHELL_FAIL_SAFE_MS);
}
