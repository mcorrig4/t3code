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
  const { supported, canPlay, isPlaying, title, toggle } = useMessageTts(messageId, text);

  if (!supported || !canPlay) {
    return null;
  }

  return (
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
  );
});
