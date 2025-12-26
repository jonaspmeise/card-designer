import { ProjectData } from '../types/domain';
import { DomainEvent } from '../types/events';

export type ProjectLoadedEvent = DomainEvent<
  'projectLoaded',
  ProjectData
>;

export type FileOpenedEvent = DomainEvent<
  'fileOpened',
  {
    filePath: string
  }
>;


export type DialogEvent = DomainEvent<
  'dialog',
  {
    text: string,
    level: 'question' | 'info' | 'warning' | 'error',
    callbacks: Record<string, () => void>
  }
>;
