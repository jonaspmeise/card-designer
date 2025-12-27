import { CardCreatorDependencies } from '..';
import { Command } from '../architecture/types';
import { ProjectData } from '../project/project-types';
import { DomainEvent } from '../types/events';

export type EventServiceDependencies = Pick<
  CardCreatorDependencies,
  'logger'
>;

export type ProjectLoadedEvent = DomainEvent<
  'projectLoaded',
  ProjectData
>;

export type CommandExecutedEvent = DomainEvent<
  'commandExecuted',
  Command
>;

export type CommandUndoneEvent = DomainEvent<
  'commandUndone',
  Command
>;

export type ProjectSavedEvent = DomainEvent<
  'projectSaved',
  {
    path: string;
  }
>;

export type ProjectResetEvent = DomainEvent<'projectReset'>;

export type FileOpenedEvent = DomainEvent<
  'fileOpened',
  {
    path: string;
  }
>;

export type DialogEvent = DomainEvent<
  'dialog',
  {
    text: string;
    level: 'question' | 'info' | 'warning' | 'error';
    callbacks: Record<string, () => Promise<void>>;
  }
>;
