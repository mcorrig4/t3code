import { installBootShellBootstrap } from "./bootShellBootstrap";
import type { ForkWebBootstrapInput } from "./brandingBootstrap";
import { installBrandingBootstrap } from "./brandingBootstrap";
import { installDebugBootstrap } from "./debugBootstrap";
import { installPwaBootstrap } from "./pwaBootstrap";

export interface ForkWebShellHandle {
  readonly bootReady: Promise<void>;
}

export interface ForkWebBootstrapPlugin {
  readonly name: string;
  readonly install: (input: ForkWebBootstrapInput) => void | { readonly whenReady?: Promise<void> };
}

const forkWebBootstrapPlugins: readonly ForkWebBootstrapPlugin[] = [
  {
    name: "branding",
    install: installBrandingBootstrap,
  },
  {
    name: "boot-shell",
    install: () => installBootShellBootstrap(),
  },
  {
    name: "pwa",
    install: installPwaBootstrap,
  },
  {
    name: "debug",
    install: installDebugBootstrap,
  },
];

export function installForkWebShell(input: ForkWebBootstrapInput): ForkWebShellHandle {
  const waiters: Promise<void>[] = [];

  for (const plugin of forkWebBootstrapPlugins) {
    const result = plugin.install(input);
    if (result?.whenReady) {
      waiters.push(result.whenReady);
    }
  }

  return {
    bootReady: Promise.all(waiters).then(() => undefined),
  };
}
