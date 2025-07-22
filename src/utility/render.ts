export type RenderResult = {
    image: Blob | undefined,
    warnings: string[],
    errors: string[]
};

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
    resources: Map<string, string | null> = new Map()
): Promise<RenderResult> => {
    // Inline resources which are referenced via <image href="..."/>
    const matches = Array.from(code.matchAll(/<image[^>]+href="(?<link>[^"]+)"[^>]*>/g));

    const externalResources: Set<string> = matches.reduce((prev, curr) => {
        const link = curr.groups!.link.trim();
        prev.add(link);

        return prev;
    }, new Set<string>());

    console.log(`Found ${externalResources.size} external resources...`);

    
    const errors: string[] = [];
    const warnings: string[] = [];
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
                const response = await loadBase64FromURL(link);

                if(response.base64 === undefined) {
                    errors.push(response.error!);
                    return;
                }

                base64 = response.base64;

                // Fetch value for real, if it has not been loaded yet!
            } else if(resource === null) {
                const response = await loadBase64FromURL(link);

                if(response.base64 === undefined) {
                    errors.push(response.error!);
                    return;
                }
                
                resources.set(link, response.base64);
                base64 = response.base64;
            } else {
                base64 = resource;
            }

            if(base64 === undefined) {
                errors.push(`Could not load image "${link}"!`);
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
            img.onerror = (e) => {
                errors.push(e.toString());
                resolve(undefined);
            }

            await img.decode();
        } catch (e) {
            errors.push(`Error occured when rendering svg: ${e}`);
            resolve(undefined);
        }
    });

    if (img === undefined) {
        return {
            errors: errors,
            warnings: warnings,
            image: undefined
        };
    }

    const canvas = new OffscreenCanvas(img.width, img.height);
    canvas.getContext("2d")!.drawImage(img, 0, 0);

    return {
        image: await canvas.convertToBlob(),
        warnings: warnings,
        errors: errors
    };
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
const loadBase64FromURL = async (link: string): Promise<{
    base64: string | undefined,
    error: string | undefined
}> => {
    try {
        const response = await fetch(link);

        if (!response.ok) {
            return {
                error: `HTTP Error Status (${response.status}) when loading "${link}"`,
                base64: undefined
            };
        }

        const blob = await response.blob();
        return {
            base64: await blobToBase64(blob),
            error: undefined
        };
    } catch(e) {
        return {
            base64: undefined,
            error: (e as Error).message
        };
    }
};