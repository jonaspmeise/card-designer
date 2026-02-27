import { CardCreatorDependencies } from '..';
import { Card } from '../render/render-types';

export type Template = string;

export type TemplateState = {
  // The current loaded template.
  template: Template;
  // The functions extracted from the template, mapped by their source string.
  // TODO: This is a private property and should _not_ be serialized.
  _functions: Map<string, Function>;
};

/**
 * The dependencies required by the render service.
 */
export type TemplateServiceDependencies = Pick<
  CardCreatorDependencies,
  | 'historyService'
  | 'eventService'
  | 'logger'
  | 'configService'
  // TODO: This leads to a circular dependency though, so we leave it to the caller to call the render method.
  // | 'renderService' // we need the render service to issue render previews when the template changes.
>;
