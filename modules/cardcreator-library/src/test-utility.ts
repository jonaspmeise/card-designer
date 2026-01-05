import { Card } from './render/render-types';

export const timeout = (
  done: (error: Error) => void,
  ms = 100,
) =>
  setTimeout(() => {
    done(new Error('Test timed out'));
  }, ms);

export const dummyCard: Card = {
  name: 'my dummy card',
};
