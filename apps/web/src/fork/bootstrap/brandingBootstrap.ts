import { APP_DISPLAY_NAME } from "../../branding";
import { applyRuntimeBranding } from "../../runtimeBranding";

export interface ForkWebBootstrapInput {
  readonly doc: Document;
  readonly hostname: string;
}

export function installBrandingBootstrap(input: ForkWebBootstrapInput): void {
  applyRuntimeBranding(input.doc, input.hostname);
  input.doc.title = APP_DISPLAY_NAME;
}
