/**
 * Render Queue Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import './render-queue';
import { RenderQueueElement } from './render-queue';
import { nextTick } from '../test-utils';

describe('RenderQueueElement', () => {
  let element: RenderQueueElement;
  let mockRenderAll: ReturnType<typeof mock>;

  beforeEach(() => {
    document.body.innerHTML =
      '<cc-render-queue></cc-render-queue>';
    element = document.querySelector(
      'cc-render-queue',
    ) as RenderQueueElement;

    mockRenderAll = mock(() => {});
    (window as any).cardCreatorLibrary = {
      render: { all: mockRenderAll },
    };
  });

  test('renders empty state initially', () => {
    expect(element.getQueue().length).toBe(0);
    expect(element.getList().textContent).toContain(
      'empty',
    );
  });

  test('populates queue from cards-loaded event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [
          { id: '1', name: 'Fireball' },
          { id: '2', name: 'Ice Bolt' },
        ],
      }),
    );
    await nextTick();

    expect(element.getQueue().length).toBe(2);
    expect(element.getList().innerHTML).toContain(
      'Fireball',
    );
    expect(element.getList().innerHTML).toContain(
      'Ice Bolt',
    );
  });

  test('updates item status on render-progress', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'card1', name: 'Test Card' }],
      }),
    );
    await nextTick();

    window.dispatchEvent(
      new CustomEvent('cc:render-progress', {
        detail: { current: 1, total: 1, cardId: 'card1' },
      }),
    );
    await nextTick();

    expect(element.getQueue()[0].status).toBe('processing');
  });

  test('marks item done on render-complete', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: 'card1', name: 'Test Card' }],
      }),
    );
    await nextTick();

    window.dispatchEvent(
      new CustomEvent('cc:render-complete', {
        detail: { cardId: 'card1' },
      }),
    );
    await nextTick();

    expect(element.getQueue()[0].status).toBe('done');
  });

  test('render-all button calls library method', async () => {
    element.clickRenderAll();
    expect(mockRenderAll).toHaveBeenCalled();
  });

  test('clear button empties queue', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:cards-loaded', {
        detail: [{ id: '1', name: 'Card' }],
      }),
    );
    await nextTick();
    expect(element.getQueue().length).toBe(1);

    element.clickClear();
    expect(element.getQueue().length).toBe(0);
  });
});
