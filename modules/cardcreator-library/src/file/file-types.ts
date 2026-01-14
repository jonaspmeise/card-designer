import { CardCreatorDependencies } from '..';

export type FileServiceDependencies = Pick<
  CardCreatorDependencies,
  'eventService' | 'logger'
>;

/**
 * A file can be of different sources:
 * - virtual (provided during runtime through e.g. the Browser File API or OS file system)
 * - direct (content is loaded into the project and kept here)
 */
export type FileTypes = 'virtual' | 'direct';

/**
 * A group of file extensions that have special meaning in Card Creator.
 */
export type SpecialFileExtensions =
  | 'json'
  | 'csv'
  | 'xml'
  | 'yml'
  | 'yaml'
  | 'png'
  | 'jpg'
  | 'jpeg';

export type FileInformation =
  | VirtualFileInformation
  | DirectFileInformation;

/**
 * Every file shares these basic properties.
 */
export type BasicFileInformation = {
  type: FileTypes;
  // Full file path.
  path: string;
  // Optional file extension.
  extension?: string;
};

export type VirtualFileInformation =
  BasicFileInformation & {
    type: 'virtual';
  };

export type ResolvedFile<FILE extends FileInformation> =
  FILE & {
    content: () => Promise<ArrayBufferLike>;
    size: () => Promise<number>;
    loaded: () => boolean;
  };

export type InternalResolvedFile<
  FILE extends FileInformation,
> = ResolvedFile<FILE> & {
  _content?: ArrayBufferLike;
  _update: () => Promise<void>;
};

export type DirectFileInformation = BasicFileInformation & {
  type: 'direct';
  // Raw file content.
  content: ArrayBufferLike;
  // Size of the file in bytes.
  size: number;
};

export type FolderInformation = {
  files: FileInformation[];
};
