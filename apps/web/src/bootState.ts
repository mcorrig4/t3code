let bootReady = false;
let resolveBootReady: (() => void) | null = null;

const bootReadyPromise = new Promise<void>((resolve) => {
  resolveBootReady = resolve;
});

export function markBootReady(): void {
  if (bootReady) {
    return;
  }

  bootReady = true;
  resolveBootReady?.();
  resolveBootReady = null;
}

export function waitForBootReady(): Promise<void> {
  return bootReady ? Promise.resolve() : bootReadyPromise;
}

export function resetBootReadyForTests(): void {
  bootReady = false;
}
