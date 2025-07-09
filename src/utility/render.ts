export const render = async (
  image: ImageBitmap,
  canvas: OffscreenCanvas
): Promise<ArrayBuffer> => {
  const ctx = canvas.getContext("2d");

  if(ctx == null) {
    throw new Error(`Could not get 2D context of canvas!`);
  }

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  const blob = await canvas.convertToBlob();
  return await blob.arrayBuffer();
};