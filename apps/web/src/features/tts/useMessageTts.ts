import { useSyncExternalStore } from "react";
import { sanitizeAssistantMessageForTts } from "./sanitizeTtsText";
import {
  getPlaybackRateOptions,
  getSnapshot,
  isSupported,
  setPlaybackRate,
  subscribe,
  toggleMessagePlayback,
} from "./tts";

export function useMessageTts(messageId: string, text: string) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const sanitizedText = sanitizeAssistantMessageForTts(text);
  const supported = isSupported();
  const isPlaying = snapshot.status === "playing" && snapshot.activeMessageId === messageId;
  const canPlay = supported && sanitizedText.length > 0;

  return {
    supported,
    isPlaying,
    canPlay,
    playbackRate: snapshot.playbackRate,
    playbackRateOptions: getPlaybackRateOptions(),
    title: isPlaying ? "Stop playback" : "Play message",
    setPlaybackRate,
    toggle() {
      if (!canPlay) {
        return;
      }

      toggleMessagePlayback({
        messageId,
        text: sanitizedText,
      });
    },
  } as const;
}
