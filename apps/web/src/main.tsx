import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@xterm/xterm/css/xterm.css";
import "./index.css";
import "./overrides.css";

import { APP_DISPLAY_NAME } from "./branding";
import { isElectron } from "./env";
import { installForkWebShell } from "./fork/bootstrap";
import { getRouter } from "./router";

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);

const forkWebShell = installForkWebShell({
  doc: document,
  hostname: window.location.hostname,
});
document.title = APP_DISPLAY_NAME;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

forkWebShell.bootReady.catch((err) => {
  console.error("[fork-bootstrap] boot ready failed:", err);
});
