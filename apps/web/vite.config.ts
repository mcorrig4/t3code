import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import type { HmrOptions } from "vite";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };
import { renderT3LoaderMarkup } from "./src/components/loading/renderT3LoaderMarkup";

const port = Number(process.env.PORT ?? 5733);
const devHost = process.env.VITE_DEV_HOST ?? "127.0.0.1";
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const hmrProtocol = process.env.VITE_HMR_PROTOCOL ?? "ws";
const hmrHost = process.env.VITE_HMR_HOST ?? "localhost";
const hmrPath = process.env.VITE_HMR_PATH;
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT
  ? Number(process.env.VITE_HMR_CLIENT_PORT)
  : undefined;
const hmrPort = process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : undefined;
const sourcemapEnv = process.env.T3CODE_WEB_SOURCEMAP?.trim().toLowerCase();
const webPushProxyTarget = (() => {
  const wsUrl = process.env.VITE_WS_URL?.trim();
  if (!wsUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(wsUrl);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return undefined;
  }
})();

const buildSourcemap =
  sourcemapEnv === "0" || sourcemapEnv === "false"
    ? false
    : sourcemapEnv === "hidden"
      ? "hidden"
      : true;

const hmrConfig: HmrOptions = {
  protocol: hmrProtocol,
  host: hmrHost,
  ...(hmrPath ? { path: hmrPath } : {}),
  ...(hmrClientPort !== undefined ? { clientPort: hmrClientPort } : {}),
  ...(hmrPort !== undefined ? { port: hmrPort } : {}),
};

function t3BootShellPlugin() {
  return {
    name: "t3-boot-shell",
    transformIndexHtml(html: string) {
      return html.replace("<!-- app-boot-shell -->", renderT3LoaderMarkup());
    },
  };
}

export default defineConfig({
  plugins: [
    t3BootShellPlugin(),
    tanstackRouter(),
    react(),
    babel({
      parserOpts: { plugins: ["typescript", "jsx"] },
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ["@pierre/diffs", "@pierre/diffs/react", "@pierre/diffs/worker/worker.js"],
  },
  define: {
    "import.meta.env.VITE_WS_URL": JSON.stringify(process.env.VITE_WS_URL ?? ""),
    "import.meta.env.APP_VERSION": JSON.stringify(pkg.version),
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: devHost,
    port,
    strictPort: true,
    ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
    hmr: hmrConfig,
    ...(webPushProxyTarget
      ? {
          proxy: {
            "/api/web-push": {
              target: webPushProxyTarget,
              changeOrigin: true,
              xfwd: true,
            },
          },
        }
      : {}),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: buildSourcemap,
  },
});
