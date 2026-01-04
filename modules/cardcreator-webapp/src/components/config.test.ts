/**
 * Config Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import './config';
import { ConfigElement } from './config';
import { nextTick } from '../test-utils';

describe('ConfigElement', () => {
  let element: ConfigElement;
  let mockMerge: ReturnType<typeof mock>;

  beforeEach(() => {
    document.body.innerHTML = '<cc-config></cc-config>';
    element = document.querySelector(
      'cc-config',
    ) as ConfigElement;

    mockMerge = mock(() => {});
    (window as any).cardCreatorLibrary = {
      config: { merge: mockMerge },
    };
  });

  test('renders empty editor initially', () => {
    expect(element.getEditor().value).toBe('');
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(false);
  });

  test('applies valid JSON and calls library method', async () => {
    element.getEditor().value = '{"template": "card.svg"}';
    element.clickApply();
    await nextTick();

    expect(mockMerge).toHaveBeenCalledWith({
      template: 'card.svg',
    });
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(false);
  });

  test('shows error for malformed JSON and does not call library method', async () => {
    element.getEditor().value = '{ invalid json }';
    element.clickApply();
    await nextTick();

    expect(mockMerge).not.toHaveBeenCalled();
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(true);
    expect(element.getError().textContent).toContain(
      'Invalid JSON',
    );
  });

  test('shows error for empty config', async () => {
    element.getEditor().value = '';
    element.clickApply();
    await nextTick();

    expect(mockMerge).not.toHaveBeenCalled();
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(true);
    expect(element.getError().textContent).toContain(
      'empty',
    );
  });

  test('resets editor to last loaded config', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:config-loaded', {
        detail: { output: 'output/' },
      }),
    );
    await nextTick();

    element.getEditor().value = 'modified';
    element.shadowRoot!.getElementById('reset')!.click();

    expect(element.getEditor().value).toBe(
      JSON.stringify({ output: 'output/' }, null, 2),
    );
  });

  test('clears error on successful apply', async () => {
    element.getEditor().value = 'invalid';
    element.clickApply();
    await nextTick();
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(true);

    element.getEditor().value = '{"valid": true}';
    element.clickApply();
    await nextTick();
    expect(
      element.getError().classList.contains('visible'),
    ).toBe(false);
  });
});
