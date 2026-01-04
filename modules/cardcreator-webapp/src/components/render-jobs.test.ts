/**
 * Render Jobs Component Tests
 */
import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import './render-jobs';
import { RenderJobsElement } from './render-jobs';
import { nextTick } from '../test-utils';

describe('RenderJobsElement', () => {
  let element: RenderJobsElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<cc-render-jobs></cc-render-jobs>';
    element = document.querySelector(
      'cc-render-jobs',
    ) as RenderJobsElement;
  });

  test('renders empty state initially', () => {
    expect(element.getJobs().length).toBe(0);
    expect(element.getList().textContent).toContain(
      'No render jobs',
    );
  });

  test('adds successful render job from event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:render-complete', {
        detail: {
          cardName: 'Fireball',
          thumbnail: 'data:image/png;base64,abc',
        },
      }),
    );
    await nextTick();

    expect(element.getJobs().length).toBe(1);
    expect(element.getJobs()[0].cardName).toBe('Fireball');
    expect(element.getJobs()[0].status).toBe('success');
    expect(element.getList().innerHTML).toContain(
      'Fireball',
    );
  });

  test('adds error render job from event', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:render-error', {
        detail: {
          cardName: 'Ice Bolt',
          error: 'Template not found',
        },
      }),
    );
    await nextTick();

    expect(element.getJobs()[0].status).toBe('error');
    expect(element.getList().innerHTML).toContain(
      'Ice Bolt',
    );
    expect(element.getList().innerHTML).toContain('error');
  });

  test('shows newest jobs first', async () => {
    window.dispatchEvent(
      new CustomEvent('cc:render-complete', {
        detail: { cardName: 'First' },
      }),
    );
    await nextTick();
    window.dispatchEvent(
      new CustomEvent('cc:render-complete', {
        detail: { cardName: 'Second' },
      }),
    );
    await nextTick();

    expect(element.getJobs()[0].cardName).toBe('Second');
    expect(element.getJobs()[1].cardName).toBe('First');
  });

  test('limits jobs to 100', async () => {
    // Add 102 jobs to verify limit of 100
    for (let i = 0; i < 102; i++) {
      window.dispatchEvent(
        new CustomEvent('cc:render-complete', {
          detail: { cardName: `Card ${i}` },
        }),
      );
    }
    await nextTick();

    expect(element.getJobs().length).toBe(100);
    // Verify oldest jobs are removed (newest first)
    expect(element.getJobs()[0].cardName).toBe('Card 101');
  });
});
