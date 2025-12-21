/**
 * Logger registry for managing logger instances across the library.
 * Provides a central way to set and retrieve the logger implementation.
 *
 * This allows consumers to inject their own logging implementation
 * (e.g., Winston, Pino, custom solutions) without modifying library code.
 *
 * @module LoggerRegistry
 */

import type { Logger } from '../types/domain';

/**
 * Console-based logger implementation.
 * Used as the default logger when no custom implementation is registered.
 * Suitable for development but should be replaced with a production logger.
 */
class DefaultLogger implements Logger {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}`, context ?? {});
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, context ?? {});
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context ?? {});
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error, context ?? {});
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(`[FATAL] ${message}`, error, context ?? {});
  }
}

/**
 * Registry for managing the logger instance used throughout the library.
 *
 * Features:
 * - Singleton pattern for global logger access
 * - Dynamic logger registration
 * - Default logger fallback
 * - Thread-safe (single-threaded JavaScript guarantee)
 *
 * @example
 * ```typescript
 * // Register a custom logger
 * import Winston from 'winston';
 *
 * const customLogger = Winston.createLogger({...});
 * LoggerRegistry.setLogger(customLogger);
 *
 * // Get the logger from anywhere in your code
 * const logger = LoggerRegistry.getLogger();
 * logger.info('Application started');
 * ```
 */
export class LoggerRegistry {
  /** Global logger instance */
  private static instance: Logger = new DefaultLogger();

  /**
   * Set the logger instance for the entire library.
   * This should be called once during application initialization.
   *
   * @param logger - The logger implementation to use
   * @example
   * ```typescript
   * LoggerRegistry.setLogger(myWinstonLogger);
   * ```
   */
  static setLogger(logger: Logger): void {
    if (!logger) {
      throw new Error('Logger cannot be null or undefined');
    }
    LoggerRegistry.instance = logger;
  }

  /**
   * Get the current logger instance.
   * Returns the registered logger or the default console logger.
   *
   * @returns The current logger instance
   * @example
   * ```typescript
   * const logger = LoggerRegistry.getLogger();
   * logger.info('This is an info message');
   * ```
   */
  static getLogger(): Logger {
    return LoggerRegistry.instance;
  }

  /**
   * Reset the logger to the default console logger.
   * Useful for testing and cleanup.
   */
  static reset(): void {
    LoggerRegistry.instance = new DefaultLogger();
  }
}
