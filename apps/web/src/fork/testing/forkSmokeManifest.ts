export interface ForkSmokeTarget {
  readonly capsule: string;
  readonly acceptanceCapsules: readonly string[];
  readonly phaseCommand: string;
  readonly smokeScript: string;
  readonly playwrightSpecs: readonly string[];
}

export const forkSmokeManifest: readonly ForkSmokeTarget[] = [
  {
    // Intentionally defaults to remote URL (t3-dev.claude.do) for production baseline checks.
    capsule: "baseline-platform",
    acceptanceCapsules: ["Sync and smoke infrastructure"],
    phaseCommand: "sync:phase0:smoke",
    smokeScript: "apps/web/e2e/sync-phase-0-baseline.mjs",
    playwrightSpecs: [],
  },
  {
    capsule: "web-bootstrap-branding-pwa",
    acceptanceCapsules: ["Web bootstrap and branding/PWA"],
    phaseCommand: "sync:phase2:smoke",
    smokeScript: "apps/web/e2e/sync-phase-2-mobile-pwa.mjs",
    playwrightSpecs: [],
  },
  {
    capsule: "fork-settings-legacy",
    acceptanceCapsules: ["Fork settings"],
    phaseCommand: "sync:phase4:smoke",
    smokeScript: "apps/web/e2e/sync-phase-4-settings.mjs",
    playwrightSpecs: [],
  },
  {
    capsule: "fork-settings",
    acceptanceCapsules: ["Fork settings"],
    phaseCommand: "sync:phase9:smoke",
    smokeScript: "apps/web/e2e/sync-phase-9-settings-sidecar.mjs",
    playwrightSpecs: [],
  },
  {
    capsule: "ui-hooks-debug",
    acceptanceCapsules: ["UI hooks and debug"],
    phaseCommand: "sync:phase6:smoke",
    smokeScript: "apps/web/e2e/sync-phase-6-debug-sidecar.mjs",
    playwrightSpecs: [],
  },
  {
    capsule: "server-http-notifications",
    acceptanceCapsules: ["Server HTTP", "Notification delivery"],
    phaseCommand: "sync:phase7:smoke",
    smokeScript: "apps/web/e2e/sync-phase-7-web-push.mjs",
    playwrightSpecs: [],
  },
];
