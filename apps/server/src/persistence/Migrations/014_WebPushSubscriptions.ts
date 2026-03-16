import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      subscription_id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      subscription_json TEXT NOT NULL,
      user_agent TEXT,
      app_version TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_delivered_at TEXT,
      last_failure_at TEXT,
      last_error TEXT,
      failure_count INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1
    )
  `;

  yield* sql`
    CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_enabled_updated
    ON web_push_subscriptions(enabled, updated_at)
  `;
});
