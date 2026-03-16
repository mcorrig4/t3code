import { createNativeSpeechController } from "./nativeSpeechSynthesis";

export type TtsProviderKind = "native" | "openai" | "elevenlabs";
export type TtsPlaybackStatus = "idle" | "playing" | "unsupported" | "error";

export interface TtsSnapshot {
  readonly status: TtsPlaybackStatus;
  readonly activeMessageId: string | null;
  readonly provider: TtsProviderKind;
  readonly errorMessage?: string;
}

export interface SpeakMessageInput {
  readonly messageId: string;
  readonly text: string;
  readonly lang?: string;
}

const listeners = new Set<() => void>();

let playbackGeneration = 0;
let snapshot: TtsSnapshot = {
  status: "idle",
  activeMessageId: null,
  provider: "native",
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
  createNativeSpeechController().stop();
  setSnapshot(buildIdleSnapshot());
}

export function toggleMessagePlayback(input: SpeakMessageInput): void {
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
    });
    return;
  }

  if (snapshot.status === "playing" && snapshot.activeMessageId === input.messageId) {
    stopPlayback();
    return;
  }

  const nextGeneration = playbackGeneration + 1;
  playbackGeneration = nextGeneration;
  controller.stop();
  setSnapshot({
    status: "playing",
    activeMessageId: input.messageId,
    provider: "native",
  });

  try {
    controller.speak({
      text: trimmedText,
      ...(input.lang ? { lang: input.lang } : {}),
      onEnd: () => {
        if (playbackGeneration !== nextGeneration) {
          return;
        }
        setSnapshot(buildIdleSnapshot());
      },
      onError: (error) => {
        if (playbackGeneration !== nextGeneration) {
          return;
        }
        setSnapshot({
          status: "error",
          activeMessageId: null,
          provider: "native",
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
      errorMessage: resolvedError.message,
    });
  }
}
