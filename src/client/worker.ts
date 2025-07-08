import { WorkerRenderJob } from "../types/types.js";
import { render } from "../utility/render.js";

self.onmessage = async (e: MessageEvent<WorkerRenderJob>) => {
  const { canvas, data } = e.data;

  for (let entry of data) {
    const picture: ArrayBuffer = await render(entry.code, canvas);

    await saveToSessionDb(picture, entry.key);

    // Notify main thread about finished rendering process of single card.
    self.postMessage({
      index: entry.index
    });
  }
};

const saveToSessionDb = async (
  buffer: ArrayBuffer,
  key: string
): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("Images", "readwrite");
  const store = tx.objectStore("Images");

  const blob = new Blob([buffer], { type: "image/svg+xml" });
  store.put(blob, key);

  tx.commit();
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("SessionImageDB", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("Images");
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });