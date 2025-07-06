export const render = (
  code: string,
  canvas?: HTMLCanvasElement
): Promise<ArrayBuffer> => {

  const localCanvas = canvas || document.createElement('canvas');

  return new Promise((resolve, reject) => {
    const ctx: CanvasRenderingContext2D | null = localCanvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const img = new Image();

    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`;

    img.onload = () => {
      localCanvas.width = img.width;
      localCanvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      localCanvas.toBlob(async (blob) => {
        if(!blob) {
          reject(new Error('Failed to convert canvas to Blob!'));
          return;
        }

        resolve(await blob.arrayBuffer());
      });
    };

    img.onerror = (error) => {
      reject(error);
    }
  });
}