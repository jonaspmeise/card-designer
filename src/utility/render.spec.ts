import { test, expect, describe, mock, beforeEach, afterEach, jest } from "bun:test";
import { render } from "./render.js";

describe('Render', () => {

  // Mocks for Browser-APIs
  const mockImage = {
    onload: mock(() => {}),
    decode: mock(function(this: any) {this.onload()})
  };

  const mockOffscreenCanvas = {
    // Fake property that doesn't exist on a normal OffscreenCanvas, but we use it here to be able to identicate the mock
    _drawImage: mock(() => {}),
    // Call mocked function!
    getContext: mock(function(this: any){return {drawImage: this._drawImage}}),
    convertToBlob: mock(() => new Blob(['this is a blob']))
  };

  const mockFileReader = {
    result: 'this is a base64 image',
    onload: mock(() => {}),
    onerror: mock((error: Error) => {}),
    readAsDataURL: mock(function(this: any){this.onload()})
  }

  const mockFetch = mock(fetch);

  beforeEach(() => {
    // Propagate all mock properties to global Browser-APIs.
    global.Image = (function(this: any) {
      Object.entries(mockImage).forEach(([k, v]) => this[k] = v);
    }) as unknown as new (width?: number, height?: number) => HTMLImageElement;
    global.OffscreenCanvas = (function(this: any) {
      Object.entries(mockOffscreenCanvas).forEach(([k, v]) => this[k] = v);
    }) as unknown as new (width?: number, height?: number) => OffscreenCanvas;
    global.FileReader = (function(this: any) {
      Object.entries(mockFileReader).forEach(([k, v]) => this[k] = v);
    }) as any; // FileReader isn't a nice type...
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper method for "drawing was done"-assertions using native Browser APIs
  const drawingWasExecuted = () => {
    expect(mockImage.decode).toBeCalledTimes(1);
    expect(mockOffscreenCanvas.getContext).toHaveBeenCalledTimes(1);
    expect(mockOffscreenCanvas._drawImage).toHaveBeenCalledTimes(1);
    expect(mockOffscreenCanvas.convertToBlob).toBeCalledTimes(1);
  };

  test('returns a warning if an external resource could not be found.', async () => {
    // GIVEN / WHEN
    const result = await render(`
      <svg xmlns="http://www.w3.org/2000/svg">
      <image href="http://this-does-not-exist/image.png"/>
      </svg>`
    );

    // THEN
    expect(result.errors).toBeEmpty();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/unable to connect/i);

    // Drawing was still triggered, because warnings shouldn't stop our rendering.
    drawingWasExecuted();
  });

  test('returns an undefined blob and an error if the image could not be decoded (e.g. because of an SVG syntax error).', async () => {
    // GIVEN / WHEN
    // Overwrite default mock behavior, because we don't have access to Image() - we need to trigger the error-callback manually.
    mockImage.decode.mockImplementationOnce(
      function(this: any) { this.onerror(new Error('not a valid svg!')) }
    );

    // (this very obviously is _not_ a valid SVG!)
    const result = await render('<<');

    // THEN
    expect(result.image).toBeUndefined();
    expect(result.warnings).toBeEmpty();
    expect(result.errors).toHaveLength(1);
    // This is the usual error we get.
    // TODO: Could we find out, _what_ exactly went wrong with the SVG? That would be valuable input.
    expect(result.errors[0]).toEqual('Error: not a valid svg!');
  });

  test('returns a dummy blob after calling Image().decode(), OffscreenCanvas().getContext().drawImage(), OffscreenCanvas().convertToBlob().', async () => {
    const result = await render('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    drawingWasExecuted();
    expect(result.image).not.toBeUndefined();
    expect(await (result.image as Blob).text()).toEqual('this is a blob');
  });

  test('returns no errors or warnings on a successful render.', async () => {
    // GIVEN / WHEN
    const result = await render('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    // THEN
    expect(result.errors).toBeEmpty();
    expect(result.warnings).toBeEmpty();
    drawingWasExecuted();
  });

  test('An external resources is cached after referencing and loading it a 2nd time.', async () => {
    // GIVEN
    const resources = new Map<string, string | null>();
    const call = async () => await render(`
      <svg xmlns="http://www.w3.org/2000/svg">
      <image href="https://images.photowall.com/products/65869/bunny-rabbit.jpg"/>
      </svg>`,
      resources
    );

    // WHEN
    const result1 = await call();

    // THEN
    expect(fetch, 'image was not fetched!').toHaveBeenCalledTimes(1);
    expect(result1.image).not.toBeUndefined();
    expect(resources).toHaveLength(1);
    // The first time this image is loaded - a placeholder "null" is used to mark this resource as potential candidate for caching.
    expect(resources.get('https://images.photowall.com/products/65869/bunny-rabbit.jpg')).toBeNull();

    const result2 = await call();

    expect(fetch, 'image was not fetched a 2nd time!').toHaveBeenCalledTimes(2);
    expect(result2.image).not.toBeUndefined();
    // The image's content is not cached as a base64 reference!
    expect(resources.get('https://images.photowall.com/products/65869/bunny-rabbit.jpg')).toEqual('this is a base64 image');

    await call();
    expect(fetch, 'image was fetched a 3rd time, even though the result is still cached!').toHaveBeenCalledTimes(2);
  });

  test.todo('Cards that have an undefined/empty string ID will be filtered out.');
});