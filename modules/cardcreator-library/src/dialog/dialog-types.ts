import { CardCreatorDependencies } from '..';
import { DomainEvent } from '../types/events';

// ── Dialog Types ──

export type DialogLevel =
  | 'info'
  | 'warning'
  | 'error'
  | 'question';

export type DialogButtonStyle =
  | 'primary'
  | 'secondary'
  | 'danger';

export interface DialogChoice {
  label: string;
  style: DialogButtonStyle;
}

export interface DialogOptions {
  title: string;
  message: string;
  level: DialogLevel;
  choices: DialogChoice[];
  forced?: boolean;
}

export type DialogServiceDependencies = Pick<
  CardCreatorDependencies,
  'logger' | 'eventService'
>;
