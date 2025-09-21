import { z } from 'zod';
class ConfigurationError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
import { Logger } from '../services/logger.service';
const logger = new Logger('Environment');
const EnvironmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    REPLIT_DEPLOYMENT: z.string().optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
    DB_POOL_MIN: z.string().transform(Number).pipe(z.number().min(0)).default('2'),
    DB_POOL_MAX: z.string().transform(Number).pipe(z.number().min(1)).default('10'),
    API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
    ENABLE_RATE_LIMITING: z.string().transform(v => v === 'true').default('true'),
    ENABLE_REQUEST_LOGGING: z.string().transform(v => v === 'true').default('true'),
    ENABLE_PERFORMANCE_MONITORING: z.string().transform(v => v === 'true').default('true')
});
class EnvironmentConfig {
    constructor() {
        this._config = null;
    }
    get config() {
        if (!this._config) {
            throw new ConfigurationError('ENVIRONMENT_NOT_LOADED', 'Environment configuration not loaded. Call validateAndLoad() first.');
        }
        return this._config;
    }
    validateAndLoad() {
        try {
            logger.info('Validating environment configuration');
            const result = EnvironmentSchema.safeParse(process.env);
            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));
                logger.error('Environment validation failed', { errors });
                throw new ConfigurationError('ENVIRONMENT_VALIDATION', `Environment validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
            }
            this._config = result.data;
            logger.info('Environment configuration loaded successfully', {
                nodeEnv: this._config.NODE_ENV,
                port: this._config.PORT,
                logLevel: this._config.LOG_LEVEL,
                hasDatabaseUrl: !!this._config.DATABASE_URL,
                hasSessionSecret: !!this._config.SESSION_SECRET,
                rateLimitEnabled: this._config.ENABLE_RATE_LIMITING
            });
            return this._config;
        }
        catch (error) {
            logger.error('Failed to load environment configuration', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    isDevelopment() {
        return this.config.NODE_ENV === 'development';
    }
    isProduction() {
        return this.config.NODE_ENV === 'production';
    }
    isTest() {
        return this.config.NODE_ENV === 'test';
    }
    hasApiKey(service) {
        switch (service) {
            case 'openai':
                return !!this.config.OPENAI_API_KEY;
            case 'anthropic':
                return !!this.config.ANTHROPIC_API_KEY;
            case 'sendgrid':
                return !!this.config.SENDGRID_API_KEY;
            default:
                return false;
        }
    }
    getDatabaseConfig() {
        return {
            url: this.config.DATABASE_URL,
            pool: {
                min: this.config.DB_POOL_MIN,
                max: this.config.DB_POOL_MAX
            }
        };
    }
    getRateLimitConfig() {
        return {
            windowMs: this.config.RATE_LIMIT_WINDOW_MS,
            max: this.config.RATE_LIMIT_MAX_REQUESTS,
            enabled: this.config.ENABLE_RATE_LIMITING
        };
    }
    validateDatabaseConnection() {
        if (!this.config.DATABASE_URL) {
            throw new ConfigurationError('DATABASE_URL', 'Database URL is required but not provided');
        }
        try {
            new URL(this.config.DATABASE_URL);
        }
        catch {
            throw new ConfigurationError('DATABASE_URL', 'Database URL is not a valid URL');
        }
    }
    validateProductionRequirements() {
        if (!this.isProduction())
            return;
        const requiredInProduction = [
            { key: 'SESSION_SECRET', value: this.config.SESSION_SECRET },
        ];
        const missing = requiredInProduction.filter(req => !req.value);
        if (missing.length > 0) {
            throw new ConfigurationError('PRODUCTION_CONFIG', `Production environment requires: ${missing.map(m => m.key).join(', ')}`);
        }
        logger.info('Production environment validation passed');
    }
}
export const env = new EnvironmentConfig();
export const validateEnvironment = () => {
    const config = env.validateAndLoad();
    env.validateDatabaseConnection();
    env.validateProductionRequirements();
    return config;
};
//# sourceMappingURL=environment.js.map