import { RenderCardInfo } from "../types/types.js";

/**
 * Renders SVG Code to a Blob representation.
 * 
 * @param code The code, which should be rendered. This code should be raw and include no more templates.
 * @param resources A map of hrefs/URLs to their base64-encoded content. This is used to inline external resources,
 * which otherwise could not be loaded due to CORS errors.
 * @param entry information about this file, which can be updated within this method. This includes warnings, successes, or errors
 * associated with this render call.
 * 
 * @returns A promise which resolves to a Blob, the rendered image. If an error occurs, it returns {@code undefined}.
 */
export const render = async (
    code: string,
    resources: Map<string, string | null> = new Map(),
    entry?: RenderCardInfo
): Promise<Blob | undefined> => {
    // Inline resources which are referenced via <image href="..."/>
    const matches = Array.from(code.matchAll(/<image[^>]+href="(?<link>[^"]+)"[^>]*>/g));

    const externalResources: Set<string> = matches.reduce((prev, curr) => {
        const link = curr.groups!.link.trim();
        prev.add(link);

        return prev;
    }, new Set<string>());

    console.log(`Found ${externalResources.size} external resources...`);

    await Promise.all(
        [...externalResources.keys()].map(async link => {
            // Two-Step-Cache: We load many data, so this map gets very big.
            // When the first value is loaded, we insert "null" as the value to signal that this value was already requested once.
            // If we then encounter this "null" value ( a 2nd time ), we load the real data into it.

            let base64: string | undefined = undefined;
            const resource = resources.get(link);

            // Initial load: do nothing, just load...
            if (resource === undefined) {
                resources.set(link, null);
                base64 = await loadBase64FromURL(link);
                // Fetch value for real, if it has not been loaded yet!
            } else if(resource === null) {
                base64 = await loadBase64FromURL(link);
                
                if(base64 !== undefined) {
                    resources.set(link, base64);
                }
            } else {
                base64 = resource;
            }

            if(base64 === undefined) {
                console.error(`Could not load image!`);
                return;
            }

            code = code.replaceAll(link, base64!);
        })
    );

    const img = await new Promise<HTMLImageElement | undefined>(async (resolve) => {
        try {
            const img = new Image();
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code)}`;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(undefined);

            await img.decode();
        } catch (e) {
            console.log(`Error occured when rendering svg: ${e}`);
            resolve(undefined);
        }
    });

    if (img === undefined) {
        return undefined;
    }

    const canvas = new OffscreenCanvas(img.width, img.height);
    canvas.getContext("2d")!.drawImage(img, 0, 0);

    return await canvas.convertToBlob();
}

/**
 * Converts a single blob into a base64-encoded-representation.
 * 
 * @param blob The blob to be converted.
 * @returns The base64-encoded data-url ("data:image/png;base64,...") of the given blob.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Loads the content of a link into a base64-encoded string.
 * @param link The URL to load the content from.
 * @returns The base64 encoded string of the target resource. {@code undefined} if an error occured.
 */
const loadBase64FromURL = async (link: string): Promise<string | undefined> => {
    const response = await fetch(link);

    if (!response.ok) {
        return undefined;
    }

    const blob = await response.blob();
    return await blobToBase64(blob);
};