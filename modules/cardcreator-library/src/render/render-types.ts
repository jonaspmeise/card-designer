import { CardCreatorDependencies } from '..';

/**
 * The data associated with a render job.
 */
export type RenderJob = {
  name: string;
};

/**
 * The potential data associated with a single card rendering.
 */
// The parent job where this render was issued from.
export type RenderContext = Partial<RenderJob> & {
  // The index of the card in the job
  index: number;
  // The settings used for executing this render.
  settings: RenderSettings;
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

export type RenderSize = {
  width: number;
  height: number;
};

export type RenderSettings = {
  format: OutputFormat;
  size: RenderSize;
};

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
    settings: RenderSettings,
  ): Promise<Uint8Array>;

  /**
   * Checks if this renderer supports the given output format.
   * Called before attempting to render.
   *
   * @param format - The desired output format
   * @returns True if supported, false otherwise
   */
  supports(format: OutputFormat): boolean;

  /**
   * Gets the parallelity level of the renderer.
   * This indicates how many render operations can be performed in parallel.
   * @returns The number of parallel render operations supported.
   */
  parallelity(): number;
}
