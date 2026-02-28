/**
 * Browser Renderer - implements CardRenderer for browser.
 */
import type {
  CardRenderer,
  RenderSettings,
  OutputFormat,
} from 'cardcreator-library/render/render-types';

export class BrowserRenderer implements CardRenderer {
  // TODO: Don't reinstantiate Canvas and Image for every render, reuse them.
  async render(
    svg: string,
    settings: RenderSettings,
  ): Promise<Uint8Array> {
    const { size, format } = settings;
    const canvas = new OffscreenCanvas(
      size.width,
      size.height,
    );
    const ctx = canvas.getContext('2d')!;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = await this.loadImage(url);
    URL.revokeObjectURL(url);

    ctx.drawImage(img, 0, 0, size.width, size.height);
    const outBlob = await canvas.convertToBlob({
      type: format === 'jpg' ? 'image/jpeg' : 'image/png',
    });
    return new Uint8Array(await outBlob.arrayBuffer());
  }

  supports(format: OutputFormat): boolean {
    return ['png', 'jpg'].includes(format);
  }

  parallelity(): number {
    return navigator.hardwareConcurrency || 4;
  }

  private loadImage(
    url: string,
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}
