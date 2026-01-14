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
  InternalResolvedFile,
  ResolvedFile,
} from './file-types';

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

    const extension =
      file.extension ?? file.path.includes('.')
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

    return resolved;
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
