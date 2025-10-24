/**
 * Structured Logging with Winston
 *
 * Provides consistent logging across the application with:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - JSON structured logs for easy parsing
 * - PII redaction
 * - Request ID tracking
 * - Environment-aware configuration
 */

import winston from 'winston';

// Define log levels
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// Custom format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  })
);

// File transport for production errors
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * PII Redaction Helper
 * Redacts sensitive fields from objects before logging
 */
export function redactPII<T extends Record<string, any>>(obj: T): T {
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'email', // Partially redact email
  ];

  const redacted = { ...obj };

  for (const key in redacted) {
    if (sensitiveFields.includes(key)) {
      if (key === 'email' && typeof redacted[key] === 'string') {
        // Partially redact email (keep first 2 chars + domain)
        const email = redacted[key] as string;
        const [local, domain] = email.split('@');
        redacted[key] = `${local.substring(0, 2)}***@${domain}` as any;
      } else {
        redacted[key] = '[REDACTED]' as any;
      }
    }
  }

  return redacted;
}

/**
 * Create child logger with additional context
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log with request ID (for tracing)
 */
export function logWithRequest(
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  message: string,
  metadata: Record<string, any> = {},
  requestId?: string
) {
  logger.log(level, message, {
    ...metadata,
    ...(requestId && { requestId }),
  });
}

// Export logger instance
export default logger;

// Export convenience methods
export const { debug, info, warn, error } = logger;

/**
 * Fatal error (system down)
 */
export function fatal(message: string, metadata: Record<string, any> = {}) {
  logger.log('fatal', message, metadata);
}
