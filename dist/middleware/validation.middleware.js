import { z } from 'zod';
import { logger } from '../services/logger.service';
class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            logger.warn('Request body validation failed', {
                error: error instanceof z.ZodError ? error.errors : error,
                path: req.path,
                method: req.method
            });
            if (error instanceof z.ZodError) {
                const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(`Validation failed: ${message}`, error.errors));
            }
            else {
                next(new ValidationError('Invalid request body'));
            }
        }
    };
};
export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            logger.warn('Request query validation failed', {
                error: error instanceof z.ZodError ? error.errors : error,
                path: req.path,
                method: req.method
            });
            if (error instanceof z.ZodError) {
                const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(`Query validation failed: ${message}`, error.errors));
            }
            else {
                next(new ValidationError('Invalid query parameters'));
            }
        }
    };
};
export const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            logger.warn('Request params validation failed', {
                error: error instanceof z.ZodError ? error.errors : error,
                path: req.path,
                method: req.method
            });
            if (error instanceof z.ZodError) {
                const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
                next(new ValidationError(`Parameters validation failed: ${message}`, error.errors));
            }
            else {
                next(new ValidationError('Invalid parameters'));
            }
        }
    };
};
//# sourceMappingURL=validation.middleware.js.map