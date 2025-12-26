export const timeout = (done: (error: Error) => void, ms = 500) =>
  setTimeout(() => {
    done(new Error('Test timed out'));
  }, ms);
