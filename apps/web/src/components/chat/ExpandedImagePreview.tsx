export type ExpandedMediaKind = "image" | "video";

export interface ExpandedMediaItem {
  kind: ExpandedMediaKind;
  src: string;
  name: string;
  sourcePath?: string;
}

export interface ExpandedImagePreview {
  items: ExpandedMediaItem[];
  index: number;
}

export function buildExpandedImagePreview(
  images: ReadonlyArray<{ id: string; name: string; previewUrl?: string }>,
  selectedImageId: string,
): ExpandedImagePreview | null {
  const previewableImages = images.flatMap((image) =>
    image.previewUrl ? [{ id: image.id, src: image.previewUrl, name: image.name }] : [],
  );
  if (previewableImages.length === 0) {
    return null;
  }
  const selectedIndex = previewableImages.findIndex((image) => image.id === selectedImageId);
  if (selectedIndex < 0) {
    return null;
  }
  return {
    items: previewableImages.map((image) => ({
      kind: "image",
      src: image.src,
      name: image.name,
    })),
    index: selectedIndex,
  };
}

export function buildSingleExpandedMediaPreview(item: ExpandedMediaItem): ExpandedImagePreview {
  return {
    items: [item],
    index: 0,
  };
}
