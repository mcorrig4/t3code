export interface CodexAppServerOverrideOptions {
  readonly configOverrides?: ReadonlyArray<string>;
}

export function buildCodexAppServerArgs(options: CodexAppServerOverrideOptions): string[] {
  const args = ["app-server"];

  for (const override of options.configOverrides ?? []) {
    args.push("-c", override);
  }

  return args;
}
