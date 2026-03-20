import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@xterm/xterm/css/xterm.css";
import "./index.css";
import "./overrides.css";

import { isElectron } from "./env";
import { scheduleBootShellFailSafe } from "./bootShell";
import { registerServiceWorker } from "./pwa";
import { getRouter } from "./router";
import { APP_DISPLAY_NAME } from "./branding";
import { applyRuntimeBranding } from "./runtimeBranding";

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);

applyRuntimeBranding(document, window.location.hostname);
document.title = APP_DISPLAY_NAME;
void registerServiceWorker();
scheduleBootShellFailSafe();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
