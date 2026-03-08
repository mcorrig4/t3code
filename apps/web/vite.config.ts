import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

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

export default defineConfig({
  plugins: [
    tanstackRouter(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ["@pierre/diffs", "@pierre/diffs/react", "@pierre/diffs/worker/worker.js"],
  },
  define: {
    // In dev mode, tell the web app where the WebSocket server lives.
    "import.meta.env.VITE_WS_URL": JSON.stringify(process.env.VITE_WS_URL ?? ""),
  },
  experimental: {
    enableNativePlugin: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: devHost,
    port,
    strictPort: true,
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
    hmr: {
      // Keep defaults friendly for localhost, but allow a real public host when
      // the dev UI is reverse-proxied through Caddy/Cloudflare.
      protocol: hmrProtocol,
      host: hmrHost,
      path: hmrPath,
      clientPort: hmrClientPort,
      port: hmrPort,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
