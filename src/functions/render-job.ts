import { AppState, Card, RenderJob, TemplateFunction } from "../types/types.js";
import { applyCardToSvg, divideArray, openDb, saveToSessionDb, simpleHash } from "../utility/utility.js";

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
  const hashes: Map<string, Card> = new Map();

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
      try {
        // TODO: Check that the hashes of the source diverge - if they don't, don't re-render!

        const img = new Image();
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

        console.debug(img.src);
        await img.decode();

        const canvas = new OffscreenCanvas(img.width, img.height);
        canvas.getContext("2d")!.drawImage(img, 0, 0);

        const hash = simpleHash(JSON.stringify(card));
        hashes.set(hash, card);

        const blob = await canvas.convertToBlob();
        await saveToSessionDb(
          await blob.arrayBuffer(),
          `card-${sourceHash}-${hash}`,
          db
        );

        console.debug(`Finished rendering card #${index}...`);
      } catch (e) {
        console.error(`Could not render card #${index}:`, e);
      }
      
      app.cache.jobs.rendering.finished += 1;
    })
  );

  app.actions.showToast({
    body: `Finished rendering job "${job.name}"!`,
    severity: "success"
  });

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

    // Render each Group into possible multiple canvases.
    groups.reduce((prev, curr) => {
      // Find target canvas, so that we don't exceed the limit!
      curr.cards.forEach((card, index) => {
        const targetCanvasIndex = Math.floor(index / job.group!.maxElementsPerSheet);

        if(targetCanvasIndex >= prev.length) {
          // Create new canvas.
          prev.push({
            name: `${job.name}-${curr.name}-${targetCanvasIndex}`,
            canvasContext: new OffscreenCanvas(
              job.targetSize.width * job.group!.columnsPerSheet,
              job.targetSize.height * job.group!.rowsPerSheet
            ).getContext('2d')!
          });
        }

        const targetContext: OffscreenCanvasRenderingContext2D = prev[targetCanvasIndex].canvasContext;
        const x = 0;
        const y = 0;

        targetContext.drawImage(
          
          x,
          y,
          0
        );

        // Render single card into that canvas!

      });

      return prev;
    }, ([] as {name: string, canvasContext: OffscreenCanvasRenderingContext2D}[]));
  }
}