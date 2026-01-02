import { CardCreatorDependencies } from '..';

/**
 * The data associated with a render job.
 */
export type RenderJob = {
  name: string;
};

export type Card = Record<string, unknown>;

/**
 * The dependencies required by the render service.
 */
export type RenderServiceDependencies = Pick<
  CardCreatorDependencies,
  | 'historyService'
  | 'eventService'
  | 'logger'
  | 'renderer'
  | 'templateService'
>;

export type OutputFormat =
  | 'png'
  | 'jpg'
  | 'pdf'
  | 'xlsx'
  | 'json'
  | 'csv'
  | 'yml'
  | 'yaml';

/**
 * Card renderer interface for converting SVG content to rendered output.
 * Implementations might use Puppeteer, Skia, or other rendering engines.
 */
export interface CardRenderer {
  /**
   * Renders an SVG string to a byte array in the specified format.
   *
   * @param svg - The SVG content as a string
   * @param format - Output format (e.g., 'png', 'jpg', 'pdf')
   * @returns Promise resolving to the rendered bytes
   * @throws Error if rendering fails
   */
  render(
    svg: string,
    format: OutputFormat,
  ): Promise<Uint8Array>;

  /**
   * Checks if this renderer supports the given output format.
   * Called before attempting to render.
   *
   * @param format - The desired output format
   * @returns True if supported, false otherwise
   */
  supports(format: OutputFormat): boolean;
}
