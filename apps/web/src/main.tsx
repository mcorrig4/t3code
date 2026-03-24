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

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);

applyRuntimeBranding(document, window.location.hostname);
document.title = APP_DISPLAY_NAME;
scheduleBootShellFailSafe();
void registerServiceWorker();

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
