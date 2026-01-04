/**
 * Settings Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './settings';
import { SettingsElement } from './settings';
import { nextTick } from '../test-utils';

describe('SettingsElement', () => {
  let element: SettingsElement;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<cc-settings></cc-settings>';
    element = document.querySelector(
      'cc-settings',
    ) as SettingsElement;
  });

  test('renders with default values', () => {
    const settings = element.getSettings();
    expect(settings.format).toBe('png');
    expect(settings.quality).toBe(90);
    expect(settings.scale).toBe(1);
    expect(settings.lineNumbers).toBe(true);
    expect(settings.fontSize).toBe(13);
  });

  test('loads settings from localStorage', () => {
    localStorage.setItem(
      'cc-settings',
      JSON.stringify({
        format: 'jpg',
        quality: 80,
        scale: 2,
        lineNumbers: false,
        fontSize: 16,
      }),
    );

    document.body.innerHTML = '<cc-settings></cc-settings>';
    element = document.querySelector(
      'cc-settings',
    ) as SettingsElement;

    const settings = element.getSettings();
    expect(settings.format).toBe('jpg');
    expect(settings.quality).toBe(80);
    expect(settings.lineNumbers).toBe(false);
  });

  test('saves settings to localStorage on change', async () => {
    element.getFormatSelect().value = 'webp';
    element
      .getFormatSelect()
      .dispatchEvent(new Event('change'));
    await nextTick();

    const stored = JSON.parse(
      localStorage.getItem('cc-settings')!,
    );
    expect(stored.format).toBe('webp');
  });

  test('dispatches settings-changed event on change', async () => {
    let receivedDetail: any = null;
    window.addEventListener('cc:settings-changed', ((
      e: CustomEvent,
    ) => {
      receivedDetail = e.detail;
    }) as EventListener);

    element.getQualityInput().value = '75';
    element
      .getQualityInput()
      .dispatchEvent(new Event('change'));
    await nextTick();

    expect(receivedDetail).not.toBeNull();
    expect(receivedDetail.quality).toBe(75);
  });
});
