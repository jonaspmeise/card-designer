import {
  describe,
  test,
  expect,
  beforeEach,
  mock,
} from 'bun:test';
import { FileService } from './file-service';
import { EventService } from '../events/event-service';
import { InternalEventBus } from '../events/events';
import { timeout } from '../test-utility';
import { FileInformation } from './file-types';
import { ProjectService } from '../project/project-service';
import { DialogService } from '../dialog/dialog-service';
import { DialogOptions } from '../dialog/dialog-types';
import { ProjectData } from '../project/project-types';

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
  let projectService = {} as ProjectService;
  let dialogService = new DialogService({
    logger: logger,
    eventService: eventService,
  });

  beforeEach(() => {
    projectService = {} as ProjectService;

    service = new FileService(
      fileProvider,
      {
        logger: logger,
        eventService: eventService,
        dialogService: dialogService,
      },
      () => projectService,
    );

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

    test('when a file with no name is added, an error event is issued and an error is thrown', () => {
      // THEN
      let eventIssued = false;
      eventService.publish = async (event) => {
        if (event.type === 'errorOccurred') {
          eventIssued = true;
        }
      };

      // GIVEN / WHEN / THEN
      expect(() => {
        service.loadFile({
          type: 'direct',
          path: '',
          content: new Uint8Array().buffer,
          size: 0,
        });
      }).toThrowError();

      expect(eventIssued).toBe(true);
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

  describe('loadFolder', () => {
    test('when a folder of files is loaded, all files are added and an event is published.', (done) => {
      // GIVEN
      const files = [
        {
          type: 'direct',
          content: new Uint8Array([1, 2, 3]).buffer,
          path: 'file1.txt',
          size: 3,
        } as FileInformation,
        {
          type: 'direct',
          content: new Uint8Array([4, 5, 6, 7]).buffer,
          path: 'file2.bin',
          size: 4,
        } as FileInformation,
      ];

      // THEN
      eventService.publish = async (event) => {
        if (event.type === 'folderLoaded') {
          expect(event.data.files.length).toBe(2);
          expect(
            event.data.files.map((f) => f.path),
          ).toEqual(['file1.txt', 'file2.bin']);

          done();
        }
      };

      // WHEN
      service.loadWorkspace({
        files: files,
      });

      // THEN
      const fetched1 = service.fetch('file1.txt');
      expect(fetched1.content()).resolves.toEqual(
        new Uint8Array([1, 2, 3]).buffer,
      );
    });
  });

  describe('*.cardcreator.json project file detection', () => {
    test('when a *.cardcreator.json file is loaded, a dialog is shown', () => {
      // GIVEN
      const showMock = mock(
        (
          _options: DialogOptions,
          _callbacks: Record<string, () => Promise<void>>,
        ) => {},
      );
      dialogService.show = showMock;

      const projectContent = JSON.stringify({
        name: 'Test Project',
        cards: [],
      });

      // WHEN
      service.loadFile({
        type: 'direct',
        path: 'myproject.cardcreator.json',
        content: new TextEncoder().encode(projectContent)
          .buffer,
        size: projectContent.length,
      });

      // THEN
      expect(showMock).toHaveBeenCalledTimes(1);
    });

    test('dialog has correct title, message, level, and choices', () => {
      // GIVEN
      let capturedOptions: DialogOptions | null = null;
      dialogService.show = (options, _callbacks) => {
        capturedOptions = options;
      };

      const projectContent = JSON.stringify({
        name: 'Test Project',
      });

      // WHEN
      service.loadFile({
        type: 'direct',
        path: 'myproject.cardcreator.json',
        content: new TextEncoder().encode(projectContent)
          .buffer,
        size: projectContent.length,
      });

      // THEN
      expect(capturedOptions).not.toBeNull();
      expect(capturedOptions!.title).toBe('Load Project?');
      expect(capturedOptions!.message).toContain(
        'myproject.cardcreator.json',
      );
      expect(capturedOptions!.level).toBe('question');
      expect(capturedOptions!.choices).toEqual([
        { label: 'Cancel', style: 'secondary' },
        { label: 'Load Project', style: 'primary' },
      ]);
    });

    test('when user confirms, project is loaded via dialog service.', (done) => {
      // GIVEN
      dialogService.show = (_options, callbacks) => {
        callbacks['Load Project']();
      };

      projectService.load = async (data: unknown) => {
        // THEN
        expect((data as ProjectData).name).toBe(
          'Test Project',
        );
        done();
      };

      const projectContent: string = JSON.stringify({
        name: 'Test Project',
        template: 'eee',
        _functions: new Map(),
      } as ProjectData);

      // WHEN
      service.loadFile({
        type: 'direct',
        path: 'myproject.cardcreator.json',
        content: new TextEncoder().encode(projectContent)
          .buffer,
        size: projectContent.length,
      });

      timeout(done);
    });

    test('when user cancels, project is not loaded', async () => {
      // GIVEN
      let capturedCallbacks: Record<
        string,
        () => Promise<void>
      > | null = null;
      dialogService.show = (_options, callbacks) => {
        capturedCallbacks = callbacks;
      };

      const loadMock = mock((_data: unknown) => {});
      projectService.load = loadMock;

      const projectContent = JSON.stringify({
        name: 'Test Project',
      });

      // WHEN
      service.loadFile({
        type: 'direct',
        path: 'myproject.cardcreator.json',
        content: new TextEncoder().encode(projectContent)
          .buffer,
        size: projectContent.length,
      });

      // Simulate user clicking "Cancel"
      await capturedCallbacks!['Cancel']();

      // THEN
      expect(loadMock).toHaveBeenCalledTimes(0);
    });

    test.each([
      'project.cardcreator.json',
      'PROJECT.CARDCREATOR.JSON',
      'Project.CardCreator.Json',
      'my-project.CARDCREATOR.json',
      'nested/path/file.cardcreator.json',
    ])(
      'detection is case-insensitive: "%s" triggers dialog',
      (filePath) => {
        // GIVEN
        const showMock = mock(
          (
            _options: DialogOptions,
            _callbacks: Record<string, () => Promise<void>>,
          ) => {},
        );
        dialogService.show = showMock;

        const projectContent = JSON.stringify({
          name: 'Test',
        });

        // WHEN
        service.loadFile({
          type: 'direct',
          path: filePath,
          content: new TextEncoder().encode(projectContent)
            .buffer,
          size: projectContent.length,
        });

        // THEN
        expect(showMock).toHaveBeenCalledTimes(1);
      },
    );

    test.each([
      'project.json',
      'cardcreator.json',
      'file.cardcreator.txt',
      'file.cardcreator',
      'project.cardcreator.json.bak',
    ])(
      'non-matching file "%s" does not trigger dialog',
      (filePath) => {
        // GIVEN
        const showMock = mock(
          (
            _options: DialogOptions,
            _callbacks: Record<string, () => Promise<void>>,
          ) => {},
        );
        dialogService.show = showMock;

        // WHEN
        service.loadFile({
          type: 'direct',
          path: filePath,
          content: new Uint8Array().buffer,
          size: 0,
        });

        // THEN
        expect(showMock).toHaveBeenCalledTimes(0);
      },
    );

    test('dialog message includes the file path', () => {
      // GIVEN
      let capturedOptions: DialogOptions | null = null;
      dialogService.show = (options, _callbacks) => {
        capturedOptions = options;
      };

      const projectContent = JSON.stringify({
        name: 'Test',
      });

      // WHEN
      service.loadFile({
        type: 'direct',
        path: 'nested/folder/myproject.cardcreator.json',
        content: new TextEncoder().encode(projectContent)
          .buffer,
        size: projectContent.length,
      });

      // THEN
      expect(capturedOptions!.message).toContain(
        'nested/folder/myproject.cardcreator.json',
      );
    });
  });
});
