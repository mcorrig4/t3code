import { Effect, Option, Schema } from "effect";

const withDefaults =
  <
    S extends Schema.Top & Schema.WithoutConstructorDefault,
    D extends S["~type.make.in"] & S["Encoded"],
  >(
    fallback: () => D,
  ) =>
  (schema: S) =>
    schema.pipe(
      Schema.withConstructorDefault(() => Option.some(fallback())),
      Schema.withDecodingDefault(Effect.succeed(fallback())),
    );

export const FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1";
export const LEGACY_APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1";
export const LEGACY_CLIENT_SETTINGS_STORAGE_KEY = "t3code:client-settings:v1";

export const ForkSettingsSchema = Schema.Struct({
  pushNotificationsEnabled: Schema.Boolean.pipe(withDefaults(() => false)),
  suppressCodexAppServerNotifications: Schema.Boolean.pipe(withDefaults(() => false)),
});

export type ForkSettings = typeof ForkSettingsSchema.Type;

export const DEFAULT_FORK_SETTINGS: ForkSettings = Schema.decodeSync(ForkSettingsSchema)({});
