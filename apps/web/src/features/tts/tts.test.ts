import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSnapshot, isSupported, stopPlayback, toggleMessagePlayback } from "./tts";

class MockSpeechSynthesisUtterance {
  readonly text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

interface SpeechMockState {
  readonly speakCalls: MockSpeechSynthesisUtterance[];
  cancelCount: number;
}

const speechSynthesisDescriptor = Object.getOwnPropertyDescriptor(globalThis, "speechSynthesis");
const utteranceDescriptor = Object.getOwnPropertyDescriptor(globalThis, "SpeechSynthesisUtterance");

function restoreSpeechGlobals(): void {
  if (speechSynthesisDescriptor) {
    Object.defineProperty(globalThis, "speechSynthesis", speechSynthesisDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "speechSynthesis");
  }

  if (utteranceDescriptor) {
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", utteranceDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  }
}

function installSpeechMock(): SpeechMockState {
  const state: SpeechMockState = {
    speakCalls: [],
    cancelCount: 0,
  };

  Object.defineProperty(globalThis, "speechSynthesis", {
    configurable: true,
    value: {
      cancel: vi.fn(() => {
        state.cancelCount += 1;
      }),
      getVoices: vi.fn(() => []),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
        state.speakCalls.push(utterance as unknown as MockSpeechSynthesisUtterance);
      }),
    } satisfies Partial<SpeechSynthesis>,
  });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
  });

  return state;
}

describe("tts", () => {
  beforeEach(() => {
    restoreSpeechGlobals();
    stopPlayback();
  });

  afterEach(() => {
    restoreSpeechGlobals();
    stopPlayback();
  });

  it("reports unsupported state when native speech synthesis is unavailable", () => {
    expect(isSupported()).toBe(false);
    expect(getSnapshot().status).toBe("unsupported");
  });

  it("starts playback for a message and exposes the active snapshot", () => {
    const speech = installSpeechMock();

    toggleMessagePlayback({
      messageId: "message-1",
      text: "Read this response aloud.",
    });

    expect(speech.speakCalls).toHaveLength(1);
    expect(speech.speakCalls[0]?.text).toBe("Read this response aloud.");
    expect(getSnapshot()).toMatchObject({
      status: "playing",
      activeMessageId: "message-1",
      provider: "native",
    });
  });

  it("stops playback when toggling the active message again", () => {
    const speech = installSpeechMock();

    toggleMessagePlayback({
      messageId: "message-1",
      text: "Read this response aloud.",
    });
    toggleMessagePlayback({
      messageId: "message-1",
      text: "Read this response aloud.",
    });

    expect(speech.cancelCount).toBe(2);
    expect(getSnapshot().status).toBe("idle");
    expect(getSnapshot().activeMessageId).toBeNull();
  });

  it("switches playback to a different message and ignores stale completion callbacks", () => {
    const speech = installSpeechMock();

    toggleMessagePlayback({
      messageId: "message-1",
      text: "First message.",
    });
    const firstUtterance = speech.speakCalls[0]!;

    toggleMessagePlayback({
      messageId: "message-2",
      text: "Second message.",
    });

    firstUtterance.onend?.();

    expect(speech.cancelCount).toBe(2);
    expect(speech.speakCalls).toHaveLength(2);
    expect(getSnapshot()).toMatchObject({
      status: "playing",
      activeMessageId: "message-2",
    });
  });
});
