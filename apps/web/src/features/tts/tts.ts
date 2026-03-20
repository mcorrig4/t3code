import { createNativeSpeechController } from "./nativeSpeechSynthesis";

export type TtsProviderKind = "native" | "openai" | "elevenlabs";
export type TtsPlaybackStatus = "idle" | "playing" | "unsupported" | "error";

export interface TtsSnapshot {
  readonly status: TtsPlaybackStatus;
  readonly activeMessageId: string | null;
  readonly provider: TtsProviderKind;
  readonly playbackRate: number;
  readonly errorMessage?: string;
}

export interface SpeakMessageInput {
  readonly messageId: string;
  readonly text: string;
  readonly lang?: string;
}

const listeners = new Set<() => void>();
const DEFAULT_PLAYBACK_RATE = 1.0;
const MIN_PLAYBACK_RATE = 0.8;
const MAX_PLAYBACK_RATE = 2.0;
const PLAYBACK_RATE_STEP = 0.1;

let playbackGeneration = 0;
let playbackRate = DEFAULT_PLAYBACK_RATE;
let activeSpeakInput: SpeakMessageInput | null = null;
let snapshot: TtsSnapshot = {
  status: "idle",
  activeMessageId: null,
  provider: "native",
  playbackRate,
};

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(nextSnapshot: TtsSnapshot): void {
  snapshot = nextSnapshot;
  emitChange();
}

function buildIdleSnapshot(): TtsSnapshot {
  return {
    status: "idle",
    activeMessageId: null,
    provider: "native",
    playbackRate,
  };
}

function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Speech synthesis failed.");
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSupported(): boolean {
  return createNativeSpeechController().isSupported();
}

export function getPlaybackRateOptions(): ReadonlyArray<number> {
  const rates: number[] = [];
  for (
    let rate = MIN_PLAYBACK_RATE;
    rate <= MAX_PLAYBACK_RATE + 0.0001;
    rate += PLAYBACK_RATE_STEP
  ) {
    rates.push(Number(rate.toFixed(1)));
  }
  return rates;
}

function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return playbackRate;
  }

  const clamped = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, rate));
  return Number((Math.round(clamped / PLAYBACK_RATE_STEP) * PLAYBACK_RATE_STEP).toFixed(1));
}

export function getSnapshot(): TtsSnapshot {
  if (!isSupported() && snapshot.status === "idle") {
    return {
      ...snapshot,
      status: "unsupported",
    };
  }

  return snapshot;
}

export function stopPlayback(): void {
  playbackGeneration += 1;
  activeSpeakInput = null;
  createNativeSpeechController().stop();
  setSnapshot(buildIdleSnapshot());
}

function startPlayback(input: SpeakMessageInput): void {
  const trimmedText = input.text.trim();
  if (trimmedText.length === 0) {
    return;
  }

  const controller = createNativeSpeechController();
  if (!controller.isSupported()) {
    setSnapshot({
      status: "unsupported",
      activeMessageId: null,
      provider: "native",
      playbackRate,
    });
    return;
  }

  const nextGeneration = playbackGeneration + 1;
  playbackGeneration = nextGeneration;
  controller.stop();
  activeSpeakInput = {
    ...input,
    text: trimmedText,
  };
  setSnapshot({
    status: "playing",
    activeMessageId: input.messageId,
    provider: "native",
    playbackRate,
  });

  try {
    controller.speak({
      text: trimmedText,
      ...(input.lang ? { lang: input.lang } : {}),
      rate: playbackRate,
      onEnd: () => {
        if (playbackGeneration !== nextGeneration) {
          return;
        }
        activeSpeakInput = null;
        setSnapshot(buildIdleSnapshot());
      },
      onError: (error) => {
        if (playbackGeneration !== nextGeneration) {
          return;
        }
        activeSpeakInput = null;
        setSnapshot({
          status: "error",
          activeMessageId: null,
          provider: "native",
          playbackRate,
          errorMessage: error.message,
        });
      },
    });
  } catch (error) {
    if (playbackGeneration !== nextGeneration) {
      return;
    }
    const resolvedError = asError(error);
    setSnapshot({
      status: "error",
      activeMessageId: null,
      provider: "native",
      playbackRate,
      errorMessage: resolvedError.message,
    });
  }
}

export function setPlaybackRate(rate: number): void {
  const nextRate = clampPlaybackRate(rate);
  if (nextRate === playbackRate) {
    return;
  }

  playbackRate = nextRate;
  if (activeSpeakInput && snapshot.status === "playing") {
    startPlayback(activeSpeakInput);
    return;
  }

  setSnapshot({
    ...snapshot,
    playbackRate,
  });
}

export function toggleMessagePlayback(input: SpeakMessageInput): void {
  if (snapshot.status === "playing" && snapshot.activeMessageId === input.messageId) {
    stopPlayback();
    return;
  }

  startPlayback(input);
}
