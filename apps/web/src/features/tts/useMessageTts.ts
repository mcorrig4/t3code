import { useSyncExternalStore } from "react";
import { sanitizeAssistantMessageForTts } from "./sanitizeTtsText";
import { getSnapshot, isSupported, subscribe, toggleMessagePlayback } from "./tts";

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
    title: isPlaying ? "Stop playback" : "Play message",
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
