export const render = async (
  code: string,
  canvas: OffscreenCanvas
): Promise<ArrayBuffer> => {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  const svgBlob = new Blob([code], { type: "image/svg+xml" });
  const bitmap = await createImageBitmap(svgBlob);

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);

  const blob = await canvas.convertToBlob();
  return await blob.arrayBuffer();
};