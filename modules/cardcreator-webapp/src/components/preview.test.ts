/**
 * Preview Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import './preview';
import { PreviewElement } from './preview';
import { nextTick } from '../test-utils';

describe('PreviewElement', () => {
  let element: PreviewElement;
  let mockRenderPreview: ReturnType<typeof mock>;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<cc-preview></cc-preview>';
    element = document.querySelector(
      'cc-preview',
    ) as PreviewElement;

    mockRenderPreview = mock(() => {});
    (window as any).cardCreatorLibrary = {
      preview: { render: mockRenderPreview },
    };
  });

  test('renders empty state initially', () => {
    expect(element.getContainer().textContent).toContain(
      'Select a card',
    );
    expect(element.isAutoPreviewEnabled()).toBe(true);
  });

  test('displays preview image from event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:preview-rendered', {
        detail: { image: 'data:image/png;base64,test' },
      }),
    );
    await nextTick();

    expect(element.getContainer().innerHTML).toContain(
      '<img',
    );
    expect(element.getContainer().innerHTML).toContain(
      'data:image/png',
    );
  });

  test('auto-preview enabled: calls library on card selection', async () => {
    element.setAutoPreview(true);

    window.dispatchEvent(
      new CustomEvent('cc:card-selected', {
        detail: { cardId: 'card-123' },
      }),
    );
    await nextTick();

    expect(mockRenderPreview).toHaveBeenCalledWith(
      'card-123',
    );
  });

  test('auto-preview disabled: does NOT call library on card selection', async () => {
    mockRenderPreview.mockClear();
    element.setAutoPreview(false);

    window.dispatchEvent(
      new CustomEvent('cc:card-selected', {
        detail: { cardId: 'card-123' },
      }),
    );
    await nextTick();

    expect(mockRenderPreview).not.toHaveBeenCalled();
    expect(element.getCurrentCardId()).toBe('card-123');
  });

  test('refresh button calls library with current card', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:card-selected', {
        detail: { cardId: 'card-456' },
      }),
    );
    mockRenderPreview.mockClear();

    element.clickRefresh();
    expect(mockRenderPreview).toHaveBeenCalledWith(
      'card-456',
    );
  });

  test('persists auto-preview state to localStorage', async () => {
    element.setAutoPreview(false);
    element
      .getAutoPreviewCheckbox()
      .dispatchEvent(new Event('change'));
    await nextTick();

    expect(localStorage.getItem('cc-auto-preview')).toBe(
      'false',
    );
  });

  test('loads auto-preview state from localStorage', () => {
    localStorage.setItem('cc-auto-preview', 'false');

    document.body.innerHTML = '<cc-preview></cc-preview>';
    element = document.querySelector(
      'cc-preview',
    ) as PreviewElement;

    expect(element.isAutoPreviewEnabled()).toBe(false);
  });
});
