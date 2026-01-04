/**
 * Test utilities for webapp components.
 */

export const timeout = (
  done: (error: Error) => void,
  ms = 100,
) =>
  setTimeout(() => done(new Error('Test timed out')), ms);

export const nextTick = () =>
  new Promise((r) => setTimeout(r, 0));

export const createMockLibrary = () => ({
  config: {
    get: () => ({}),
    set: () => {},
    merge: () => {},
  },
  cards: {
    load: () => Promise.resolve(),
    getAll: () => [],
  },
  preview: { render: () => Promise.resolve() },
  events: { on: () => {}, off: () => {}, clear: () => {} },
});

export const createMockFile = (
  name: string,
  content: string,
  type = 'text/plain',
) => new File([content], name, { type });

export const createMockFileList = (
  files: File[],
): FileList => {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
  };
  files.forEach((f, i) => ((list as any)[i] = f));
  return list as FileList;
};
