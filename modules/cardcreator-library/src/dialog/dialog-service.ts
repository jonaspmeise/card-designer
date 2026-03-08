import { DependableService } from '../architecture/types';
import {
  DialogOptions,
  DialogServiceDependencies,
} from './dialog-types';

/**
 * Internal dialog service for showing dialogs to the user.
 * This service is not exposed to external consumers - it's for internal library use only.
 *
 * The service emits events that the UI layer listens to.
 * The UI calls the `pick()` callback when the user makes a choice.
 */
export class DialogService extends DependableService<DialogServiceDependencies> {
  private _activeDialog: {
    title: string;
    callbacks: Record<string, () => Promise<void>>;
  } | null = null;

  constructor(dependencies: DialogServiceDependencies) {
    super(dependencies, dependencies.logger);
  }

  /**
   * Shows a dialog to the user.
   * @param options Dialog display options (title, message, level, choices, forced)
   * @param callbacks A map of choice labels to their callback functions
   */
  public show(
    options: DialogOptions,
    callbacks: Record<string, () => Promise<void>>,
  ): void {
    this._dependencies.logger.info(
      `Opening dialog: "${options.title}"`,
    );

    // Store active dialog state
    this._activeDialog = {
      title: options.title,
      callbacks,
    };

    // Create pick function for the UI to call
    const pick = (choiceLabel: string): void => {
      this._handlePick(choiceLabel);
    };

    // Emit dialogOpened event
    this._dependencies.eventService.publish({
      type: 'dialogOpened',
      data: {
        title: options.title,
        message: options.message,
        level: options.level,
        choices: options.choices,
        forced: options.forced ?? false,
        pick,
      },
    });
  }

  /**
   * Handles when the user picks a choice.
   * Emits dialogAnswered then dialogClosed, and executes the callback.
   */
  private _handlePick(choiceLabel: string): void {
    if (!this._activeDialog) {
      this._dependencies.logger.warn(
        `Pick called but no active dialog: "${choiceLabel}"`,
      );
      return;
    }

    const { title, callbacks } = this._activeDialog;
    const callback = callbacks[choiceLabel];

    if (!callback) {
      this._dependencies.logger.warn(
        `No callback found for choice: "${choiceLabel}"`,
      );
      throw new Error(
        `Invalid dialog choice: "${choiceLabel}"`,
      );
    }

    this._activeDialog = null;

    this._dependencies.logger.info(
      `Dialog answered: "${title}" -> "${choiceLabel}"`,
    );

    callback().catch((error) => {
      this._dependencies.logger.error(
        `Error executing dialog callback for "${choiceLabel}": ${error}`,
      );
    });
  }
}
