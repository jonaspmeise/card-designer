import { Logger } from '../types/domain';
import { Card } from '../render/render-types';
import { InternalEventBus } from '../events/events';

export class RenderLogger implements Logger {
  constructor(
    private readonly eventService: InternalEventBus,
  ) {}

  /**
   * Logs a message with the given level for the specified card.
   * @param level The log level.
   * @param message The message.
   * @param card The card, from whose render context the log originates.
   */
  private log = async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    card: Card,
  ): Promise<void> => {
    this.eventService.publish({
      type: 'renderLog',
      data: {
        level: level,
        message: message,
        card: card,
      },
    });
  };

  debug = async (
    message: string,
    card: Card,
  ): Promise<void> => this.log('debug', message, card);
  info = async (
    message: string,
    card: Card,
  ): Promise<void> => this.log('info', message, card);
  warn = async (
    message: string,
    card: Card,
  ): Promise<void> => this.log('warn', message, card);
  error = async (
    message: string,
    card: Card,
  ): Promise<void> => this.log('error', message, card);
}
