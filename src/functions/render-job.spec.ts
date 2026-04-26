import { test, expect, describe, mock, beforeEach, afterEach, jest } from "bun:test";
import { renderJob } from "./render-job.js";
import { AppState, Card, RenderJob } from "../types/types.js";

describe('render jobs', () => {
  const dummyJob: RenderJob = {
    name: 'test-render',
    jobRender: true,
    targetSize: {
      height: 1050,
      width: 750
    },
    // Describes the name of the exported image(s).
    // This is compatible with the SVGJS injection language.
    filename: 'my-name.png',
    group: {
      by: 'ID',
      maxElementsPerSheet: 1,
      rowsPerSheet: 1,
      columnsPerSheet: 1,
      horizontalPadding: 0,
      verticalPadding: 0
    },
    _cardCount: 3,
    filterCards: []
  };

  const dummyCards: Card[] = [
    {
      id: 'card-1'
    },
    {
      id: 'card-2'
    },
    {
      id: 'card-3'
    }
  ];

  test.todo('skip single card renderings if an error with text "skip" is thrown. This can be used to skip single card renderings within a job.', () => {
    renderJob(dummyJob, dummyCards, 'test', [], 'ID', {} as AppState);
  });
});