import { WorkerRenderJob } from "../types/types.js";
import { render } from "../utility/render.js";
import { openDb } from "../utility/utility.js";

self.onmessage = async (e: MessageEvent<WorkerRenderJob>) => {
  const { canvas, data } = e.data;

  const picture: ArrayBuffer = await render(data.image, canvas);

  // await saveToSessionDb(picture, data.key);

  // Notify main thread about finished rendering process of single card.
  self.postMessage({
    index: data.index
  });
};