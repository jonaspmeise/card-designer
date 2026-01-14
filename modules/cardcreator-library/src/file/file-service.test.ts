import {
  describe,
  test,
  expect,
  beforeEach,
} from 'bun:test';
import { FileService } from './file-service';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';

describe('FileService', () => {
  let service: FileService;

  const logger = console;
  const eventService: InternalEventBus = new EventService({
    logger: logger,
  });
  const fileProvider = {
    load: async (_path: string) => new Uint8Array(),
    save: async (_path: string, _data: Uint8Array) => {},
  };

  beforeEach(() => {
    service = new FileService(fileProvider, {
      logger: logger,
      eventService: eventService,
    });

    logger.info = async (_msg: string) => {};
    logger.debug = async (_msg: string) => {};
    logger.warn = async (_msg: string) => {};
    logger.error = async (_msg: string) => {};

    eventService.publish = async (_event) => {};
  });

  describe('addSingleFile', () => {
    test('when a single file is added, an event is issued', (done) => {
      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'fileAdded') {
          expect(event.data.file.path).toBe('myfile.txt');
          expect(event.data.file.extension).toBe('txt');
          expect(event.data.file.type).toBe('direct');
          expect(
            event.data.file.content(),
          ).resolves.toEqual(new Uint8Array().buffer);

          done();
        }
      };

      // GIVEN
      service.loadFile({
        type: 'direct',
        extension: 'txt',
        path: 'myfile.txt',
        content: new Uint8Array().buffer,
        size: 0,
      });

      timeout(done);
    });

    test.each([
      ['file', ''],
      ['file.', ''],
      ['file.txt', 'txt'],
      ['archive.tar.gz', 'gz'],
      ['file.TXT', 'txt'],
    ])(
      'when a single file "%s" without an extension is added, the extension "%s" is automatically extracted',
      (path, extension, done) => {
        // THEN
        eventService.publish = async (event) => {
          if (event.type === 'fileAdded') {
            expect(event.data.file.extension).toEqual(
              extension,
            );
            done();
          }
        };

        // GIVEN / WHEN
        service.loadFile({
          type: 'direct',
          path: path,
          content: new Uint8Array().buffer,
          size: 0,
        });

        timeout(done);
      },
    );

    test('when a single virtual file is loaded, the file provider is called to load its content', () => {
      // THEN
      let called = 0;
      fileProvider.load = async (path: string) => {
        if (path === 'myfile.txt') {
          called++;
        }

        return new Uint8Array([0, 1, 2]);
      };

      // GIVEN / WHEN
      const file = service.loadFile({
        type: 'virtual',
        path: 'myfile.txt',
      });

      expect(file.content()).resolves.toEqual(
        new Uint8Array([0, 1, 2]).buffer,
      );
      expect(file.size()).resolves.toBe(3);

      // We only expect the file provider to be called once, even though
      // both content and size access it.
      // We don't want to load the file multiple times for each access.
      expect(called).toBe(1);
    });
  });

  describe('fetch', () => {
    test('when a single file is added, that file can be fetched through the API.', () => {
      // GIVEN
      service.loadFile({
        type: 'direct',
        path: 'myfile.txt',
        extension: 'txt',
        content: new Uint8Array([1, 2, 3]).buffer,
        size: 3,
      });

      // WHEN / THEN
      const returned = service.fetch('myfile.txt');

      // The file is not loaded until we request its content.
      expect(returned.loaded()).toBe(false);

      expect(returned.type).toBe('direct');
      expect(returned.content()).resolves.toEqual(
        new Uint8Array([1, 2, 3]).buffer,
      );

      expect(returned.loaded()).toBe(true);
      expect(returned.path).toBe('myfile.txt');
      expect(returned.extension).toBe('txt');
    });

    test.todo(
      "when a file's content is loaded, it is cached.",
      () => {},
    ); // TODO: For how long, with what strategy...?

    test('when a non-existing file is fetched, an error event is issued and an error is thrown.', () => {
      // THEN
      let eventIssued = false;
      eventService.publish = async (event) => {
        if (event.type === 'errorOccurred') {
          eventIssued = true;
        }
      };

      // GIVEN / WHEN / THEN
      expect(() => {
        service.fetch('non-existing-file.txt');
      }).toThrowError();

      expect(eventIssued).toBe(true);
    });
  });

  describe('clear', () => {
    test('when the file service is cleared, previously added files can no longer be fetched.', () => {
      // GIVEN
      service.loadFile({
        type: 'direct',
        content: new Uint8Array([1, 2, 3]).buffer,
        path: 'myfile.txt',
        extension: 'txt',
        size: 3,
      });

      // WHEN
      service.clear();

      // THEN
      expect(() => {
        service.fetch('myfile.txt');
      }).toThrowError();
    });
  });
});
