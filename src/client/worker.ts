import { WorkerRenderJob } from "../types/types.js";
import { render } from "../utility/render.js";

self.onmessage = async (e: MessageEvent<WorkerRenderJob>) => {
  const data = e.data;

  const canvas = document.createElement('canvas');

  for(let entry of data) {
    const picture: ArrayBuffer = await render(entry.code, canvas);

    saveToDb(picture, entry.key);
  }

  self.postMessage('done!');
};

const saveToDb = (
  image: ArrayBuffer,
  key: string
): void => {
  const dbName = 'ImageDatabase';
  const storeName = 'Images';

  // Open the IndexedDB database
  const openRequest = indexedDB.open(dbName, 1);

  openRequest.onsuccess = () => {
    const db = openRequest.result;

    // Check if the image data is already in IndexedDB
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = function (event) {
      console.error(event);
    };
  };
};