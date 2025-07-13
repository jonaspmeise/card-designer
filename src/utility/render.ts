/**
 * Renders SVG Code to a Blob representation.
 * 
 * @param code The code, which should be rendered. This code should be raw and include no more templates.
 * @param resources A map of hrefs/URLs to their base64-encoded content. This is used to inline external resources,
 * which otherwise could not be loaded due to CORS errors.
 * 
 * @returns A promise which resolves to a Blob, the rendered image. If an error occurs, it returns {@code undefined}.
 */
export const render = async (
    code: string,
    resources: Map<string, string> = new Map()
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
            if (!resources.has(link)) {
                const response = await fetch(link);

                if (!response.ok) {
                    console.error(`HTTP error when loading "${link}"! status: ${response.status}`);

                    return;
                }

                const blob = await response.blob();
                const base64: string = await blobToBase64(blob);

                console.log(`Downloaded image "${link}"...`);
                resources.set(link, base64);
            }

            code = code.replaceAll(link, resources.get(link)!);
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