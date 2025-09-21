import { ZodError } from 'zod';
import { Logger } from '../services/logger.service';
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
class ValidationError extends AppError {
    constructor(message, field, value, expectedType) {
        super(message, 400);
        this.field = field;
        this.value = value;
        this.expectedType = expectedType;
    }
}
class DatabaseError extends AppError {
    constructor(message, operation, table, originalError) {
        super(message, 500);
        this.operation = operation;
        this.table = table;
        this.originalError = originalError || new Error(message);
    }
}
const isAppError = (error) => {
    return error instanceof AppError;
};
const isOperationalError = (error) => {
    return error.isOperational;
};
const formatErrorResponse = (error) => {
    return {
        error: {
            message: error.message,
            statusCode: error.statusCode,
            ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
        }
    };
};
const logger = new Logger('ErrorMiddleware');
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
export const errorHandler = (error, req, res, next) => {
    let processedError;
    if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
        }));
        processedError = new ValidationError('Request validation failed', validationErrors[0]?.field || 'unknown', 'invalid', 'valid input');
    }
    else if (isAppError(error)) {
        processedError = error;
    }
    else {
        processedError = new AppError(process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message || 'Unknown error occurred', 500, false);
    }
    if (isOperationalError(processedError)) {
        logger.warn('Operational error occurred', {
            error: processedError.message,
            statusCode: processedError.statusCode,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    }
    else {
        logger.error('Non-operational error occurred', {
            error: processedError.message,
            stack: processedError.stack,
            statusCode: processedError.statusCode,
            url: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    }
    const errorResponse = formatErrorResponse(processedError);
    res.status(processedError.statusCode).json(errorResponse);
};
export const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
export const handleDatabaseError = (error, operation, table) => {
    logger.error('Database error occurred', {
        operation,
        table,
        error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof Error) {
        throw new DatabaseError(error.message, operation, table, error);
    }
    throw new DatabaseError('Unknown database error', operation, table);
};
export const handleValidationError = (field, value, expectedType, customMessage) => {
    const message = customMessage || `Invalid value for ${field}`;
    throw new ValidationError(message, field, value, expectedType);
};
export const handleExternalServiceError = (serviceName, error, context) => {
    logger.error('External service error', {
        serviceName,
        error: error instanceof Error ? error.message : String(error),
        ...context
    });
    const message = error instanceof Error ? error.message : 'External service unavailable';
    throw new AppError(`${serviceName} service error: ${message}`, 502);
};
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
    });
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
//# sourceMappingURL=error.middleware.js.map