"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.setUser = setUser;
exports.addBreadcrumb = addBreadcrumb;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
const node_1 = require("@sentry/node");
/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes in production if SENTRY_DSN is provided
 */
function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';
    // Only initialize in production with a valid DSN
    if (environment === 'production' && dsn) {
        Sentry.init({
            dsn: dsn,
            environment: environment,
            // Integrations
            integrations: [
                (0, node_1.expressIntegration)(),
                (0, profiling_node_1.nodeProfilingIntegration)(),
            ],
            // Performance Monitoring
            // Sample 10% of transactions for performance monitoring
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
            // Profiling
            // Sample 10% of transactions for profiling
            profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
            // Release tracking (useful for versioning)
            release: process.env.SENTRY_RELEASE || process.env.npm_package_version || undefined,
            // Filter out health check endpoints from monitoring
            beforeSend(event, hint) {
                // Don't send events for health checks
                if (event.request?.url?.includes('/health')) {
                    return null;
                }
                return event;
            },
            // Ignore certain errors
            ignoreErrors: [
                // Browser extensions
                'top.GLOBALS',
                // Network errors
                'NetworkError',
                'Network request failed',
                // Prisma client errors (we handle these separately)
            ],
        });
        console.log("✅ Sentry initialized for error tracking");
    }
    else if (environment === 'production' && !dsn) {
        console.warn("⚠️  Sentry DSN not provided. Error tracking disabled.");
    }
    else {
        console.log("ℹ️  Sentry disabled in development mode");
    }
}
/**
 * Capture an exception and send it to Sentry
 */
function captureException(error, context) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            // Set user context
            if (context?.user) {
                scope.setUser({
                    id: context.user.id,
                    email: context.user.email,
                    username: context.user.username,
                });
            }
            // Set tags
            if (context?.tags) {
                Object.entries(context.tags).forEach(([key, value]) => {
                    scope.setTag(key, value);
                });
            }
            // Set extra context
            if (context?.extra) {
                Object.entries(context.extra).forEach(([key, value]) => {
                    scope.setExtra(key, value);
                });
            }
            Sentry.captureException(error);
        });
    }
}
/**
 * Capture a message (non-error event)
 */
function captureMessage(message, level = 'info', context) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            if (context?.tags) {
                Object.entries(context.tags).forEach(([key, value]) => {
                    scope.setTag(key, value);
                });
            }
            if (context?.extra) {
                Object.entries(context.extra).forEach(([key, value]) => {
                    scope.setExtra(key, value);
                });
            }
            Sentry.captureMessage(message, level);
        });
    }
}
/**
 * Set user context for all subsequent events
 */
function setUser(user) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
        });
    }
}
/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(breadcrumb) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
    }
}
