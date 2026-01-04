/**
 * History Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import './history';
import { HistoryElement } from './history';
import { nextTick } from '../test-utils';

describe('HistoryElement', () => {
  let element: HistoryElement;
  let mockUndo: ReturnType<typeof mock>;
  let mockRedo: ReturnType<typeof mock>;
  let mockGoTo: ReturnType<typeof mock>;

  beforeEach(() => {
    document.body.innerHTML = '<cc-history></cc-history>';
    element = document.querySelector(
      'cc-history',
    ) as HistoryElement;

    mockUndo = mock(() => {});
    mockRedo = mock(() => {});
    mockGoTo = mock(() => {});
    (window as any).cardCreatorLibrary = {
      history: {
        undo: mockUndo,
        redo: mockRedo,
        goTo: mockGoTo,
      },
    };
  });

  test('renders empty list initially', () => {
    expect(element.getList().children.length).toBe(0);
    expect(element.getUndoButton().disabled).toBe(true);
    expect(element.getRedoButton().disabled).toBe(true);
  });

  test('renders history entries from event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:history-changed', {
        detail: {
          entries: [
            {
              id: '1',
              label: 'Load cards',
              timestamp: 1700000000000,
            },
            {
              id: '2',
              label: 'Edit card',
              timestamp: 1700000001000,
            },
          ],
          currentIndex: 1,
        },
      }),
    );
    await nextTick();

    expect(element.getList().children.length).toBe(2);
    expect(
      element.getList().children[0].textContent,
    ).toContain('Load cards');
    expect(
      element
        .getList()
        .children[1].classList.contains('current'),
    ).toBe(true);
  });

  test('undo button calls library method', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:history-changed', {
        detail: {
          entries: [
            { id: '1', label: 'A', timestamp: 0 },
            { id: '2', label: 'B', timestamp: 0 },
          ],
          currentIndex: 1,
        },
      }),
    );
    await nextTick();

    element.getUndoButton().click();
    expect(mockUndo).toHaveBeenCalled();
  });

  test('redo button calls library method', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:history-changed', {
        detail: {
          entries: [
            { id: '1', label: 'A', timestamp: 0 },
            { id: '2', label: 'B', timestamp: 0 },
          ],
          currentIndex: 0,
        },
      }),
    );
    await nextTick();

    element.getRedoButton().click();
    expect(mockRedo).toHaveBeenCalled();
  });

  test('clicking entry calls goTo', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:history-changed', {
        detail: {
          entries: [
            { id: '1', label: 'A', timestamp: 0 },
            { id: '2', label: 'B', timestamp: 0 },
          ],
          currentIndex: 1,
        },
      }),
    );
    await nextTick();

    (element.getList().children[0] as HTMLElement).click();
    expect(mockGoTo).toHaveBeenCalledWith(0);
  });
});
