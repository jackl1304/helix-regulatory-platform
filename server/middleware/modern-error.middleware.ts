import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  ApiError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ExternalServiceError,
  isAppError,
  isOperationalError 
} from '../../shared/types/errors';

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
  timestamp: string;
  requestId?: string;
}

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip: string;
  requestId?: string;
}

class ModernErrorHandler {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * Main error handling middleware
   */
  handle = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const context = this.buildErrorContext(req);
    const errorResponse = this.buildErrorResponse(error, context);
    
    this.logError(error, context);
    
    // Prevent further error handling
    if (res.headersSent) {
      return next(error);
    }
    
    res.status(errorResponse.statusCode).json({
      success: false,
      message: errorResponse.message,
      code: errorResponse.code,
      details: errorResponse.details,
      timestamp: errorResponse.timestamp,
      requestId: context.requestId,
      ...(this.isDevelopment && { stack: error.stack })
    });
  };

  /**
   * 404 Not Found handler
   */
  notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
    next(error);
  };

  /**
   * Async wrapper for route handlers
   */
  asyncHandler = <T extends Request, U extends Response>(
    fn: (req: T, res: U, next: NextFunction) => Promise<any>
  ) => {
    return (req: T, res: U, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Build error context from request
   */
  private buildErrorContext(req: Request): ErrorContext {
    return {
      userId: (req as any).user?.id,
      tenantId: (req as any).tenant?.id,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      requestId: (req as any).requestId || this.generateRequestId()
    };
  }

  /**
   * Build standardized error response
   */
  private buildErrorResponse(error: Error, context: ErrorContext) {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (isAppError(error)) {
      statusCode = error.statusCode;
      message = error.message;
      code = error.name.toUpperCase();
    } else if (error instanceof ZodError) {
      statusCode = 400;
      message = 'Validation failed';
      code = 'VALIDATION_ERROR';
      details = this.formatZodErrors(error);
    } else if (error.name === 'MongoError' || error.name === 'SequelizeError') {
      statusCode = 500;
      message = 'Database operation failed';
      code = 'DATABASE_ERROR';
      details = this.isDevelopment ? error.message : undefined;
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
      code = 'INVALID_TOKEN';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token has expired';
      code = 'TOKEN_EXPIRED';
    } else if (error.name === 'SyntaxError' && 'body' in error) {
      statusCode = 400;
      message = 'Invalid JSON in request body';
      code = 'INVALID_JSON';
    }

    return {
      statusCode,
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log error with context
   */
  private logError(error: Error, context: ErrorContext): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    };

    if (isAppError(error) && error.statusCode < 500) {
      console.warn('Client Error:', logData);
    } else {
      console.error('Server Error:', logData);
    }

    // In production, you might want to send to external logging service
    if (!this.isDevelopment && (!isAppError(error) || error.statusCode >= 500)) {
      this.sendToExternalLogger(error, context);
    }
  }

  /**
   * Format Zod validation errors
   */
  private formatZodErrors(error: ZodError) {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: err.received
    }));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send error to external logging service (placeholder)
   */
  private sendToExternalLogger(error: Error, context: ErrorContext): void {
    // Implement external logging service integration
    // e.g., Sentry, LogRocket, DataDog, etc.
    console.log('Would send to external logger:', { error: error.message, context });
  }
}

// Create singleton instance
export const errorHandler = new ModernErrorHandler();

// Export individual middleware functions
export const { handle: errorMiddleware } = errorHandler;
export const { notFoundHandler } = errorHandler;
export const { asyncHandler } = errorHandler;

// Export error classes for use in other files
export {
  AppError,
  ValidationError,
  DatabaseError,
  ApiError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ExternalServiceError
};