import {
  Clearable,
  DependableService,
  PopulatedCommand,
} from '../architecture/types';
import { FileProvider } from './file-provider';
import path from 'path';
import {
  FileInformation,
  FileServiceDependencies,
  FolderInformation,
  InternalResolvedFile,
  ResolvedFile,
} from './file-types';
import { ProjectService } from '../project/project-service';

/**
 * Service to record and manage history (commands).
 */
export class FileService
  extends DependableService<FileServiceDependencies>
  implements Clearable
{
  private _files: Map<
    string,
    ResolvedFile<FileInformation>
  > = new Map();

  constructor(
    private readonly _fileProvider: FileProvider,
    dependencies: FileServiceDependencies,
    private readonly projectService: () => ProjectService,
  ) {
    super(dependencies, dependencies.logger);
  }

  public clear(): void {
    this._dependencies.logger.info('Clearing files...');
    this._files.clear();
  }

  /**
   * Loads a file into the system.
   * @param file The file to load.
   */
  public loadFile(
    file: FileInformation,
  ): ResolvedFile<FileInformation> {
    this._dependencies.logger.info(
      `Loading file: ${file.path}`,
    );

    return this._loadFile(file);
  }

  public loadWorkspace(
    folder: FolderInformation,
  ): ResolvedFile<FileInformation>[] {
    this._dependencies.logger.info(
      `Loading folder with ${folder.files.length} files...`,
    );

    const loadedFiles: ResolvedFile<FileInformation>[] =
      folder.files.map((file) => this._loadFile(file));

    this._dependencies.eventService.publish({
      type: 'folderLoaded',
      data: {
        files: loadedFiles,
      },
    });

    return loadedFiles;
  }

  private _loadFile(
    file: FileInformation,
  ): ResolvedFile<typeof file> {
    if (file.path.trim().length == 0) {
      // TODO: Generalize!

      const message = `Cannot load file with empty path!`;
      this._dependencies.eventService.publish({
        type: 'errorOccurred',
        data: {
          message: message,
        },
      });
      throw new Error(message);
    }

    const extension =
      (file.extension ?? file.path.includes('.'))
        ? file.path.split('.').pop()?.toLowerCase()
        : '';
    this._dependencies.logger.debug(
      `Guessed file extension: ${extension}`,
    );

    // We provide references to ourr local dependencies of this service so that each file's scope can access it.
    const fileProvider = this._fileProvider;
    const logger = this._dependencies.logger;

    const resolved: ResolvedFile<typeof file> = {
      ...file,
      loaded() {
        return this._content !== undefined;
      },
      async _update() {
        logger.debug(
          `Updating content for file "${this.path}"...`,
        );

        this._content =
          file.type === 'virtual'
            ? (await fileProvider.load(this.path)).buffer
            : file.content;
      },
      async content() {
        if (this._content === undefined) {
          await this._update();
        }

        return this._content!;
      },
      async size() {
        if (this._content === undefined) {
          await this._update();
        }

        return this._content!.byteLength;
      },
    } as InternalResolvedFile<typeof file>;

    this._files.set(file.path, resolved);

    this._dependencies.eventService.publish({
      type: 'fileAdded',
      data: {
        file: {
          ...resolved,
          extension,
        },
      },
    });

    if (FileService._isProjectFile(file.path)) {
      this._dependencies.logger.info(
        `Loaded project file detected: ${file.path}`,
      );

      this._dependencies.dialogService.show(
        {
          title: 'Load Project?',
          message: `A project file "${file.path}" was detected. Do you want to load it?`,
          level: 'question',
          choices: [
            { label: 'Cancel', style: 'secondary' },
            { label: 'Load Project', style: 'primary' },
          ],
        },
        {
          'Load Project': async () => {
            this._dependencies.logger.debug(
              `User confirmed loading project from: ${file.path}`,
            );

            const content = await resolved.content();
            const text = new TextDecoder().decode(content);

            try {
              const parsed = JSON.parse(text);

              if (!parsed.name) {
                this._dependencies.dialogService.show(
                  {
                    title: 'Error Loading Project',
                    message: `The project file is missing "name" field.`,
                    level: 'error',
                    choices: [
                      { label: 'OK', style: 'primary' },
                    ],
                    forced: true,
                  },
                  {
                    OK: async () => {},
                  },
                );
                return;
              }

              this.projectService().load(parsed);
            } catch (error) {
              this._dependencies.dialogService.show(
                {
                  title: 'Error Loading Project',
                  message: `Failed to parse project file: ${error}`,
                  level: 'error',
                  choices: [
                    { label: 'OK', style: 'primary' },
                  ],
                  forced: true,
                },
                {
                  OK: async () => {},
                },
              );
            }
          },
          Cancel: async () => {},
        },
      );
    }

    return resolved;
  }

  /**
   * Checks if the file path matches the *.cardcreator.json pattern.
   * @param path The file path to check
   * @returns True if the file is a cardcreator project file
   */
  private static _isProjectFile(path: string): boolean {
    return path.toLowerCase().endsWith('.cardcreator.json');
  }

  /**
   * Fetches a loaded file through the file provider.
   * @param path
   */
  public fetch(
    path: string,
  ): ResolvedFile<FileInformation> {
    this._dependencies.logger.info(
      `Fetching file from path: ${path}`,
    );

    if (!this._files.has(path)) {
      const message = `File at path ${path} not found.`;
      this._dependencies.eventService.publish({
        type: 'errorOccurred',
        data: {
          message,
        },
      });

      throw new Error(message);
    }

    return this._files.get(path)!;
  }
}
