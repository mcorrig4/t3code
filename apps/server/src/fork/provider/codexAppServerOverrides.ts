import type { CodexSessionOverrides } from "@t3tools/contracts";

export function resolveCodexAppServerConfigOverrides(
  overrides: CodexSessionOverrides | undefined,
): ReadonlyArray<string> {
  return overrides?.suppressNativeNotifications === true ? ["notify=[]"] : [];
}
