import JSZip from "jszip";
import { AppState, Card, RenderJob, TemplateFunction } from "../types/types.js";
import { applyCardToSvg, divideArray, download, openDb, saveToSessionDb, simpleHash } from "../utility/utility.js";

type CardsGroup = {
  // Name of the group, by which is ordered.
  name: string,
  cards: Card[]
};

export const renderJob = async (
  job: RenderJob,
  cards: Card[],
  source: string,
  templates: TemplateFunction[],
  idColumn: string,
  app: AppState
) => {
  app.actions.showToast({
    body: `Starting render job "${job.name}"...`,
    severity: "primary"
  });
  app.cache.jobs.rendering.job = job;
  app.cache.jobs.rendering.finished = 0;

  const sourceHash = simpleHash(source);
  const db: IDBDatabase = await openDb();
  const hashes: Map<unknown, string> = new Map();

  await Promise.all(
    cards.map(async (card, index) => {
      const svg = applyCardToSvg(
        source,
        templates,
        card,
        app
      );

      // This is ineffective, because we would like to offload the image-creation to worker threads.
      // This feature is not implemented in any Browser - createImageBitmap(svgBlob) is not supported: https://issues.chromium.org/issues/41250699
      // In that case, we have to create the Image here.
      // TODO: Check that the hashes of the source diverge - if they don't, don't re-render!

      const img = await new Promise<HTMLImageElement | undefined>(async (resolve, reject) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

          console.debug(img.src);
          img.onload = () => {
            console.log(`Image for card "${card[idColumn]}" created!`);
            resolve(img);
          }

          await img.decode();
        } catch (e) {
          console.error(`Could not render card #${index}:`, e);
          resolve(undefined);
        }
      });
      if(img === undefined) {
        return;
      }

      const canvas = new OffscreenCanvas(img.width, img.height);
      canvas.getContext("2d")!.drawImage(img, 0, 0);

      const hash = simpleHash(JSON.stringify(card));

      const name = `card-${sourceHash}-${hash}`;
      
      const blob = await canvas.convertToBlob();
      await saveToSessionDb(
        await blob.arrayBuffer(),
        name,
        db
      );

      console.debug(`Finished rendering card #${index}...`);
      hashes.set(card[idColumn], name);
      
      app.cache.jobs.rendering.finished += 1;
    })
  );

  app.actions.showToast({
    body: `Finished rendering job "${job.name}"!`,
    severity: "success"
  });

  console.log('Creating zip archive...');

  if(job.group !== undefined) {
    // Collect all Card data again to include into a "big canvas" and download that.
    const possibleGroups: string[] = job.group?.by === undefined
    ? []
    : cards.reduce((prev, curr) => {
      const currentGroup = curr[job.group!.by] as string;

      if(!prev.includes(currentGroup)) {
        prev.push(currentGroup);
      }

      return prev;
    }, [] as string[])

    console.debug(`Grouping all cards by "${job.group?.by}": ${possibleGroups.join(', ')}`);

    const groups: CardsGroup[] = possibleGroups.map(groupBy => ({
      cards: cards.filter(card => card[job.group!.by] === groupBy),
      name: groupBy
    }));

    const tx = db.transaction("Images", "readonly");
    
    const allCanvases: Map<unknown, {name: string, canvas: OffscreenCanvas}[]> = new Map();

    // Render each Group into possible multiple canvases.
    await Promise.all(
      groups.flatMap(group => {
        // Find target canvas, so that we don't exceed the limit!
        allCanvases.set(group.name, []);

        return group.cards.map(async (card, index) => {
          const canvases = allCanvases.get(group.name)!;

          const targetCanvasIndex = Math.floor(index / job.group!.maxElementsPerSheet);

          if(targetCanvasIndex >= canvases.length) {
            // Create new canvas.
            canvases.push({
              name: `${job.name}-${group.name}-${targetCanvasIndex}`,
              canvas: new OffscreenCanvas(
                job.targetSize.width * job.group!.columnsPerSheet,
                job.targetSize.height * job.group!.rowsPerSheet
              )
            });
          }

          const targetCanvas: OffscreenCanvas = canvases[targetCanvasIndex].canvas;
          const countInCanvas = (index % job.group!.maxElementsPerSheet);
          const x = countInCanvas % job.group!.rowsPerSheet;
          const y = Math.floor(countInCanvas / job.group!.rowsPerSheet);

          // Render single card into that canvas!
          const hash = hashes.get(card[idColumn]);
          if(hash !== undefined) {
            const imageBlob = await new Promise<Blob>((resolve, reject) => {
              const request = tx.objectStore("Images").get(hash);

              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });

            const bitmap = await createImageBitmap(imageBlob);
            const ctx = targetCanvas.getContext("2d")!;

            console.debug(`Drawing card "${card[idColumn]}" into Canvas #${targetCanvasIndex} (${canvases[targetCanvasIndex].name})`);
            ctx.drawImage(bitmap, x * job.targetSize.width, y * job.targetSize.height);
          } else {
            console.error(`Tried and load image file for card "${card[idColumn]}", but couldn't find it...`);
          }
        });
      })
    );

    allCanvases.forEach((value, key) => {
      console.info(`Drew a total of ${value.length} canvases for Group "${key}"...`);
    });

    const zip = new JSZip();
    await Promise.all(
      [...allCanvases.values()].flatMap((value) => {
        return value.map(async v => {
          v.canvas.getContext('2d');

          const blob = await v.canvas.convertToBlob();
          zip.file(v.name + '.png', blob);
        });
      })
    );

    const archive = await zip.generateAsync({
      type: 'blob'
    });

    download(archive, job.name);
  }
}