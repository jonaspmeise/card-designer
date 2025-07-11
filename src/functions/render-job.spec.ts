import { test, expect, describe } from "bun:test";
import { blobifySingleSvgCode } from "./render-job.js";

describe('Image creation from SVG', () => {
  test('works', async (done) => {
    const img = await blobifySingleSvgCode(`
      <svg width="1" height="1" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="1" height="1" fill="red" />
      </svg>
    `);
    
    expect(img).not.toBeUndefined();

    console.log(img!.arrayBuffer());

    done();
  });
})