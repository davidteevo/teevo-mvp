export type CropAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RenderCroppedAvatarOptions = {
  imageSrc: string;
  cropAreaPixels: CropAreaPixels;
  outputSize?: number;
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
  quality?: number;
};

function loadImage(imageSrc: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load selected image"));
    image.src = imageSrc;
  });
}

export async function renderCroppedAvatar({
  imageSrc,
  cropAreaPixels,
  outputSize = 512,
  mimeType = "image/jpeg",
  quality = 0.9,
}: RenderCroppedAvatarOptions): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not initialize image editor");
  }

  context.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) {
    throw new Error("Could not prepare cropped image");
  }

  return blob;
}
