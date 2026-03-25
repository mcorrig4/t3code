import { memo } from "react";
import { PlayIcon, SquareIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMessageTts } from "./useMessageTts";

export const AssistantMessageTtsButton = memo(function AssistantMessageTtsButton({
  messageId,
  text,
}: {
  messageId: string;
  text: string;
}) {
  const {
    supported,
    canPlay,
    isPlaying,
    playbackRate,
    playbackRateOptions,
    setPlaybackRate,
    title,
    toggle,
  } = useMessageTts(messageId, text);

  if (!supported || !canPlay) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        size="xs"
        variant="outline"
        title={title}
        aria-label={title}
        aria-pressed={isPlaying}
        onClick={toggle}
      >
        {isPlaying ? <SquareIcon className="size-3" /> : <PlayIcon className="size-3" />}
      </Button>
      {isPlaying ? (
        <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <span className="sr-only">Playback speed</span>
          <select
            aria-label="Playback speed"
            className="h-7 rounded-md border border-border bg-background px-2 text-[10px] text-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
            value={playbackRate.toFixed(1)}
            onChange={(event) => {
              setPlaybackRate(Number(event.target.value));
            }}
          >
            {playbackRateOptions.map((rate) => (
              <option key={rate} value={rate.toFixed(1)}>
                {rate.toFixed(1)}x
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
});
