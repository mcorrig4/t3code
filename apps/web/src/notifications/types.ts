export interface WebPushConfigDisabledResponse {
  readonly enabled: false;
}

export interface WebPushConfigEnabledResponse {
  readonly enabled: true;
  readonly publicKey: string;
  readonly serviceWorkerPath: string;
  readonly manifestPath: string;
}

export type WebPushConfigResponse = WebPushConfigDisabledResponse | WebPushConfigEnabledResponse;
