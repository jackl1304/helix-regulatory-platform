import { createLogger, format, transports } from 'winston';
export var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (LogLevel = {}));
export class Logger {
    constructor(context = 'Application') {
        this.context = context;
        this.winston = createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json(), format.printf(({ timestamp, level, message, context, ...meta }) => {
                const logObject = {
                    timestamp,
                    level,
                    message,
                    context: context || this.context,
                    ...meta
                };
                if (process.env.NODE_ENV === 'development') {
                    return `${timestamp} [${level.toUpperCase()}] [${context || this.context}] ${message} ${Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : ''}`;
                }
                return JSON.stringify(logObject);
            })),
            transports: [
                new transports.Console({
                    handleExceptions: true,
                    handleRejections: true
                })
            ],
            exitOnError: false
        });
    }
    error(message, context) {
        this.winston.error(message, { context: this.context, ...context });
    }
    warn(message, context) {
        this.winston.warn(message, { context: this.context, ...context });
    }
    info(message, context) {
        this.winston.info(message, { context: this.context, ...context });
    }
    debug(message, context) {
        this.winston.debug(message, { context: this.context, ...context });
    }
    http(method, url, statusCode, responseTime, context) {
        this.info(`${method} ${url}`, {
            method,
            url,
            statusCode,
            responseTime,
            ...context
        });
    }
    database(operation, table, duration, context) {
        this.debug(`DB ${operation} on ${table}`, {
            operation,
            table,
            duration,
            ...context
        });
    }
    performance(operation, duration, context) {
        const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
        this[level](`Performance: ${operation} took ${duration}ms`, {
            operation,
            duration,
            performance: true,
            ...context
        });
    }
    security(event, severity, context) {
        const level = ['high', 'critical'].includes(severity) ? LogLevel.ERROR : LogLevel.WARN;
        this[level](`Security: ${event}`, {
            event,
            severity,
            security: true,
            ...context
        });
    }
    api(endpoint, method, statusCode, responseTime, context) {
        const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
        this[level](`API ${method} ${endpoint} - ${statusCode}`, {
            endpoint,
            method,
            statusCode,
            responseTime,
            api: true,
            ...context
        });
    }
    child(additionalContext) {
        const childLogger = new Logger(this.context);
        const originalInfo = childLogger.winston.info.bind(childLogger.winston);
        const originalError = childLogger.winston.error.bind(childLogger.winston);
        const originalWarn = childLogger.winston.warn.bind(childLogger.winston);
        const originalDebug = childLogger.winston.debug.bind(childLogger.winston);
        childLogger.winston.info = (message, meta = {}) => {
            return originalInfo(message, { ...additionalContext, ...meta });
        };
        childLogger.winston.error = (message, meta = {}) => {
            return originalError(message, { ...additionalContext, ...meta });
        };
        childLogger.winston.warn = (message, meta = {}) => {
            return originalWarn(message, { ...additionalContext, ...meta });
        };
        childLogger.winston.debug = (message, meta = {}) => {
            return originalDebug(message, { ...additionalContext, ...meta });
        };
        return childLogger;
    }
    startTimer(label) {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.performance(label, duration);
        };
    }
}
export const logger = new Logger('Global');
export const dbLogger = new Logger('Database');
export const apiLogger = new Logger('API');
export const authLogger = new Logger('Authentication');
export const securityLogger = new Logger('Security');
export const logError = (error, context) => {
    logger.error(error.message, {
        stack: error.stack,
        name: error.name,
        ...context
    });
};
export const createRequestLogger = (logger) => {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.api(req.originalUrl, req.method, res.statusCode, duration, {
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
        });
        next();
    };
};
//# sourceMappingURL=logger.service.js.map