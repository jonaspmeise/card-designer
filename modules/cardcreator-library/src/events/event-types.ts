import { CardCreatorDependencies } from '..';
import { Command } from '../architecture/types';
import { ProjectData } from '../project/project-types';
import { Card, RenderJob } from '../render/render-types';
import { Template } from '../template/template-types';
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

export type JobRenderStartedEvent = DomainEvent<
  'jobRenderStarted',
  {
    job: RenderJob;
  }
>;

export type JobRenderFinishedEvent = DomainEvent<
  'jobRenderFinished',
  {
    job: RenderJob;
  }
>;

export type CardRenderStartedEvent = DomainEvent<
  'cardRenderStarted',
  {
    card: Card;
  }
>;

export type CardRenderFinishedEvent = DomainEvent<
  'cardRenderFinished',
  {
    card: Card;
  }
>;

export type TemplateLoadedEvent = DomainEvent<
  'templateLoaded',
  {
    template: Template;
  }
>;
