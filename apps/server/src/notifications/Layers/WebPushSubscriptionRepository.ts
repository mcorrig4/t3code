import { createHash } from "node:crypto";

import { Effect, Layer, Schema } from "effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";

import { toPersistenceSqlError } from "../../persistence/Errors.ts";
import {
  WebPushSubscriptionRepository,
  type WebPushSubscriptionRepositoryShape,
} from "../Services/WebPushSubscriptionRepository.ts";

const WebPushSubscriptionDbRow = Schema.Struct({
  subscriptionId: Schema.String,
  endpoint: Schema.String,
  subscriptionJson: Schema.String,
  userAgent: Schema.NullOr(Schema.String),
  appVersion: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  lastSeenAt: Schema.String,
  lastDeliveredAt: Schema.NullOr(Schema.String),
  lastFailureAt: Schema.NullOr(Schema.String),
  lastError: Schema.NullOr(Schema.String),
  failureCount: Schema.Number,
  enabledFlag: Schema.Number,
});

const UpsertWebPushSubscriptionInput = Schema.Struct({
  endpoint: Schema.String,
  subscriptionJson: Schema.String,
  userAgent: Schema.NullOr(Schema.String),
  appVersion: Schema.NullOr(Schema.String),
  nowIso: Schema.String,
});

const UpdateWebPushSubscriptionStatusInput = Schema.Struct({
  endpoint: Schema.String,
  nowIso: Schema.String,
});

const MarkWebPushSubscriptionFailureInput = Schema.Struct({
  endpoint: Schema.String,
  nowIso: Schema.String,
  error: Schema.String,
});

const DeleteWebPushSubscriptionInput = Schema.Struct({
  endpoint: Schema.String,
});

const makeRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const upsertRow = SqlSchema.void({
    Request: UpsertWebPushSubscriptionInput,
    execute: ({ endpoint, subscriptionJson, userAgent, appVersion, nowIso }) => {
      const subscriptionId = createHash("sha256").update(endpoint).digest("hex");
      return sql`
        INSERT INTO web_push_subscriptions (
          subscription_id,
          endpoint,
          subscription_json,
          user_agent,
          app_version,
          created_at,
          updated_at,
          last_seen_at,
          last_delivered_at,
          last_failure_at,
          last_error,
          failure_count,
          enabled
        )
        VALUES (
          ${subscriptionId},
          ${endpoint},
          ${subscriptionJson},
          ${userAgent},
          ${appVersion},
          ${nowIso},
          ${nowIso},
          ${nowIso},
          NULL,
          NULL,
          NULL,
          0,
          1
        )
        ON CONFLICT (endpoint)
        DO UPDATE SET
          subscription_json = excluded.subscription_json,
          user_agent = excluded.user_agent,
          app_version = excluded.app_version,
          updated_at = excluded.updated_at,
          last_seen_at = excluded.last_seen_at,
          last_error = NULL,
          last_failure_at = NULL,
          failure_count = 0,
          enabled = 1
      `;
    },
  });

  const deleteRow = SqlSchema.void({
    Request: DeleteWebPushSubscriptionInput,
    execute: ({ endpoint }) =>
      sql`
        DELETE FROM web_push_subscriptions
        WHERE endpoint = ${endpoint}
      `,
  });

  const listRows = SqlSchema.findAll({
    Request: Schema.Void,
    Result: WebPushSubscriptionDbRow,
    execute: () =>
      sql`
        SELECT
          subscription_id AS "subscriptionId",
          endpoint,
          subscription_json AS "subscriptionJson",
          user_agent AS "userAgent",
          app_version AS "appVersion",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          last_seen_at AS "lastSeenAt",
          last_delivered_at AS "lastDeliveredAt",
          last_failure_at AS "lastFailureAt",
          last_error AS "lastError",
          failure_count AS "failureCount",
          enabled AS "enabledFlag"
        FROM web_push_subscriptions
        WHERE enabled = 1
        ORDER BY updated_at ASC, endpoint ASC
      `,
  });

  const markDeliveredRow = SqlSchema.void({
    Request: UpdateWebPushSubscriptionStatusInput,
    execute: ({ endpoint, nowIso }) =>
      sql`
        UPDATE web_push_subscriptions
        SET
          last_delivered_at = ${nowIso},
          updated_at = ${nowIso},
          last_seen_at = ${nowIso},
          last_failure_at = NULL,
          last_error = NULL,
          failure_count = 0,
          enabled = 1
        WHERE endpoint = ${endpoint}
      `,
  });

  const markFailureRow = SqlSchema.void({
    Request: MarkWebPushSubscriptionFailureInput,
    execute: ({ endpoint, nowIso, error }) =>
      sql`
        UPDATE web_push_subscriptions
        SET
          updated_at = ${nowIso},
          last_failure_at = ${nowIso},
          last_error = ${error},
          failure_count = failure_count + 1
        WHERE endpoint = ${endpoint}
      `,
  });

  const upsert: WebPushSubscriptionRepositoryShape["upsert"] = (input) =>
    upsertRow({
      endpoint: input.endpoint,
      subscriptionJson: input.subscriptionJson,
      userAgent: input.userAgent,
      appVersion: input.appVersion,
      nowIso: input.nowIso,
    }).pipe(Effect.mapError(toPersistenceSqlError("WebPushSubscriptionRepository.upsert:query")));

  const deleteByEndpoint: WebPushSubscriptionRepositoryShape["deleteByEndpoint"] = (input) =>
    deleteRow(input).pipe(
      Effect.mapError(
        toPersistenceSqlError("WebPushSubscriptionRepository.deleteByEndpoint:query"),
      ),
    );

  const listEnabled: WebPushSubscriptionRepositoryShape["listEnabled"] = () =>
    listRows(undefined).pipe(
      Effect.mapError(toPersistenceSqlError("WebPushSubscriptionRepository.listEnabled:query")),
      Effect.map((rows) =>
        rows.map((row) => ({
          subscriptionId: row.subscriptionId,
          endpoint: row.endpoint,
          subscriptionJson: row.subscriptionJson,
          userAgent: row.userAgent,
          appVersion: row.appVersion,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          lastSeenAt: row.lastSeenAt,
          lastDeliveredAt: row.lastDeliveredAt,
          lastFailureAt: row.lastFailureAt,
          lastError: row.lastError,
          failureCount: row.failureCount,
          enabled: row.enabledFlag === 1,
        })),
      ),
    );

  const markDelivered: WebPushSubscriptionRepositoryShape["markDelivered"] = (input) =>
    markDeliveredRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("WebPushSubscriptionRepository.markDelivered:query")),
    );

  const markFailure: WebPushSubscriptionRepositoryShape["markFailure"] = (input) =>
    markFailureRow(input).pipe(
      Effect.mapError(toPersistenceSqlError("WebPushSubscriptionRepository.markFailure:query")),
    );

  return {
    upsert,
    deleteByEndpoint,
    listEnabled,
    markDelivered,
    markFailure,
  } satisfies WebPushSubscriptionRepositoryShape;
});

export const WebPushSubscriptionRepositoryLive = Layer.effect(
  WebPushSubscriptionRepository,
  makeRepository,
);
