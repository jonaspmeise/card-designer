import { Resvg } from '@resvg/resvg-js';
import { CardCreatorLibrary } from 'cardcreator-library';

// Load library and inject dependencies.
const library: CardCreatorLibrary = new CardCreatorLibrary({
  renderer: {
    render: async (svg: string) => {
      return new Resvg(svg).render().asPng();
    },
    supports: (format: string) => format === 'png',
  },
  fileProvider: {
    load: async (path: string) => {
      const data = await Bun.file(path).arrayBuffer();

      return new Uint8Array(data);
    },
    save: async (path: string, data: Uint8Array) => {
      await Bun.write(path, data);
    },
  },
});

// TODO: Load parameters based on CLI arguments.
