/**
 * Test utilities for webapp components.
 */

export const timeout = (
  done: (error: Error) => void,
  ms = 100,
) =>
  setTimeout(() => done(new Error('Test timed out')), ms);

export const idle = (ms = 0) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
