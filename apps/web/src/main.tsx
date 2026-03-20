import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@xterm/xterm/css/xterm.css";
import "./index.css";
import "./overrides.css";

import { APP_BOOT_MIN_DURATION_MS } from "./bootConstants";
import { dismissBootShell, scheduleBootShellFailSafe } from "./bootShell";
import { waitForBootReady } from "./bootState";
import { isElectron } from "./env";
import { registerServiceWorker } from "./pwa";
import { getRouter } from "./router";
import { APP_DISPLAY_NAME } from "./branding";
import { applyRuntimeBranding } from "./runtimeBranding";

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);

applyRuntimeBranding(document, window.location.hostname);
document.title = APP_DISPLAY_NAME;
// Boot-shell updates ship with the app shell. Manifest and icon metadata may
// refresh lazily, especially on iOS, so they are not the boot upgrade signal.
void registerServiceWorker();
scheduleBootShellFailSafe();

const minimumBootDelay = delay(APP_BOOT_MIN_DURATION_MS);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

void Promise.all([waitForBootReady(), minimumBootDelay]).then(() => {
  window.requestAnimationFrame(() => {
    dismissBootShell();
  });
});
