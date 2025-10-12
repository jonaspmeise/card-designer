import JSZip from "jszip";
import { AppState, Card, RenderJob, TemplateFunction } from "../types/types.js";
import { applyCardToSvg, download, openDb, saveToSessionDb, simpleHash } from "../utility/utility.js";
import { render, RenderResult } from "../utility/render.js";

type CardsGroup = {
  // Name of the group, by which is ordered.
  name: string,
  cards: Card[]
};

const CARD_KEY: Symbol = Symbol('CARD_KEY');

// TODO: Refactor and shrink!
export const renderJob = async (
  job: RenderJob,
  cards: Card[],
  source: string,
  templates: TemplateFunction[],
  idColumn: string,
  app: AppState
) => {
  console.debug(`Starting render job...`, job);
  app.actions.showToast({
    body: `Starting render job "${job.name}"...`,
    severity: "primary"
  });
  app.cache.jobs.rendering.job = job;

  const sourceHash = simpleHash(source);
  const db: IDBDatabase = await openDb();
  // A mapping between the identifying element per card and the name of the rendered blob object in the session db.
  const hashes: Map<Card, string> = new Map();

  for(let card of cards) {
    const svg = await applyCardToSvg(
      source,
      templates,
      card,
      app
    );

    const renderResult: RenderResult = await render(svg, app.cache.data.images);

    if(renderResult.image === undefined) {
      console.log(`Could not render card "${card[idColumn]}"!`, renderResult.errors);
      
      app.cache.jobs.rendering.elements.push({
        card: card,
        errors: renderResult.errors,
        warnings: renderResult.warnings
      });
      continue;
    }

    const hash = simpleHash(JSON.stringify(card));
    const name = `card-${sourceHash}-${hash}`;
    
    await saveToSessionDb(
      await renderResult.image.arrayBuffer(),
      name,
      db
    );

    console.debug(`Finished rendering card "${card[idColumn]}"...`);
    card.CARD_KEY = card[idColumn];
    hashes.set(card, name);

    app.cache.jobs.rendering.elements.push({
      card: card,
      errors: renderResult.errors,
      warnings: renderResult.warnings
    });
  }

  app.actions.showToast({
    body: `Finished rendering job "${job.name}"!`,
    severity: "success"
  });

  console.log('Creating zip archive...');

  if(job.jobRender) {
    // Collect all Card data again to include into a "render sheet" and download that.
    // Only group if there is an actual grouping factor given.
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

    const allCanvases: Map<unknown, {name: string, canvas: OffscreenCanvas}[]> = new Map();

    console.log(`Created a total of ${groups.length}:`, groups);

    // Render each Group into possible multiple canvases.
    await Promise.all(
      groups.map(async group => {
        // Find target canvas, so that we don't exceed the limit!
        allCanvases.set(group.name, []);
        
        for(const [index, card] of group.cards.entries()) {
          const canvases = allCanvases.get(group.name)!;

          // TODO: Why +1 here? Test!
          const targetCanvasIndex = Math.floor(index / job.group!.maxElementsPerSheet);

          if(targetCanvasIndex >= canvases.length) {
            // Create new canvas.
            const canvas = new OffscreenCanvas(
                job.targetSize.width * job.group!.columnsPerSheet
                + (job.group!.columnsPerSheet + 1) // + 1 because with N columns there are N+1 paddings around all columns.
                  * job.group!.horizontalPadding,
                job.targetSize.height * job.group!.rowsPerSheet
                + (job.group!.rowsPerSheet + 1) // + 1 because with N rows there are N+1 paddings around all rows.
                  * job.group!.verticalPadding
              );
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            canvases.push({
              name: `${job.name}-${group.name}-${targetCanvasIndex}`,
              canvas: canvas
            });
          }

          const targetCanvas: OffscreenCanvas = canvases[targetCanvasIndex].canvas;
          const countInCanvas = (index % (job.group!.maxElementsPerSheet)); // TODO: -1 here correct?
          const x = countInCanvas % job.group!.columnsPerSheet;
          const y = Math.floor(countInCanvas / job.group!.columnsPerSheet);

          // Render single card into that canvas!
          const hash = hashes.get(card);
          if(hash !== undefined) {
            const tx = db.transaction("Images", "readonly");
    
            const imageBlob = await new Promise<Blob>((resolve, reject) => {
              const request = tx.objectStore("Images").get(hash);

              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });

            const bitmap = await createImageBitmap(imageBlob);
            const ctx = targetCanvas.getContext("2d")!;

            console.debug(`Drawing card "${card[idColumn]}" (#${index}) into Canvas #${targetCanvasIndex} (${canvases[targetCanvasIndex].name})`);
            // Respect horizontal and vertical padding when inserting an image!
            ctx.drawImage(
              bitmap,
              x * job.targetSize.width + (x + 1) * job.group!.horizontalPadding,
              y * job.targetSize.height + (y + 1) * job.group!.verticalPadding
            );
          } else {
            console.error(`Tried and load image file for card "${card[idColumn]}", but couldn't find it...`);
          }
        }
      })
    );

    allCanvases.forEach((value, key) => {
      console.info(`Drew a total of ${value.length} canvases for Group "${key}"...`);
    });

    const zip = new JSZip();
    await Promise.all(
      [...allCanvases.values()]
        .flatMap((value) => {
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
  } else {
    // We simply download individual pictures!
    const zip = new JSZip();
    const tx = db.transaction("Images", "readonly");
    const response = Array.from(hashes.entries())
      .map(async ([card, blobname]) => {
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          const request = tx.objectStore("Images").get(blobname);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        const name = await applyCardToSvg(job.filename, templates, card, app);
        console.debug(`Filename of card will be "${name}".`);

        zip.file(name, imageBlob);
      });
    
    await Promise.all(response);
    
    const archive = await zip.generateAsync({
      type: 'blob'
    });

    download(archive, job.name);
  }
};