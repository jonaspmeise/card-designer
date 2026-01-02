import { CardCreatorDependencies } from '..';
import { Command } from '../architecture/types';
import {
  ID,
  Identifiable,
} from '../cross-cutting-concerns';
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
  Identifiable<{
    job: RenderJob;
  }>
>;

export type JobRenderFinishedEvent = DomainEvent<
  'jobRenderFinished',
  Identifiable<{
    job: RenderJob;
  }>
>;

export type CardRenderStartedEvent = DomainEvent<
  'cardRenderStarted',
  Identifiable<{
    card: Card;
  }>
>;

export type CardRenderFinishedEvent = DomainEvent<
  'cardRenderFinished',
  Identifiable<{
    card: Card;
    image: ArrayBufferLike;
  }>
>;

export type PreviewRenderStartedEvent =
  DomainEvent<'previewRenderStarted'>;

export type PreviewRenderFinishedEvent =
  DomainEvent<'previewRenderFinished'>;

export type TemplateLoadedEvent = DomainEvent<
  'templateLoaded',
  {
    template: Template;
  }
>;

export type ProjectClosedEvent =
  DomainEvent<'projectClosed'>;

export type CardCompiledEvent = DomainEvent<
  'cardCompiled',
  Identifiable<{
    card: Card;
    compiled: string;
  }>
>;
