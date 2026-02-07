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
const node_1 = require("@sentry/node");
// Conditionally import profiling integration (may not be available)
let nodeProfilingIntegration = null;
try {
    const profilingModule = require("@sentry/profiling-node");
    nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
}
catch (error) {
    // Profiling module not available - that's okay, we'll skip it
    console.warn("⚠️  Sentry profiling module not available. Profiling disabled.");
}
/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Initializes when SENTRY_DSN is set (works in both development and production).
 */
function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';
    const isDevelopment = environment !== 'production';
    if (dsn) {
        const integrations = [
            (0, node_1.expressIntegration)(),
        ];
        // Only add profiling integration if available
        if (nodeProfilingIntegration) {
            integrations.push(nodeProfilingIntegration());
        }
        // Higher sample rates in development so you see all events
        const defaultTracesSampleRate = isDevelopment ? '1' : '0.1';
        const defaultProfilesSampleRate = isDevelopment ? '1' : '0.1';
        Sentry.init({
            dsn: dsn,
            environment: environment,
            // Integrations
            integrations,
            // Performance Monitoring
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || defaultTracesSampleRate),
            // Profiling (only if module is available)
            profilesSampleRate: nodeProfilingIntegration
                ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || defaultProfilesSampleRate)
                : undefined,
            // Release tracking (useful for versioning)
            release: process.env.SENTRY_RELEASE || process.env.npm_package_version || undefined,
            // Filter out health check endpoints from monitoring
            beforeSend(event) {
                if (event.request?.url?.includes('/health')) {
                    return null;
                }
                return event;
            },
            // Ignore certain errors
            ignoreErrors: [
                'top.GLOBALS',
                'NetworkError',
                'Network request failed',
            ],
        });
        console.log(`✅ Sentry initialized for error tracking (${environment})`);
    }
    else if (environment === 'production') {
        console.warn("⚠️  Sentry DSN not provided. Error tracking disabled.");
    }
    else {
        console.log("ℹ️  Sentry disabled. Set SENTRY_DSN in .env to enable in development.");
    }
}
/**
 * Capture an exception and send it to Sentry
 */
function captureException(error, context) {
    if (process.env.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            if (context?.user) {
                scope.setUser({
                    id: context.user.id,
                    email: context.user.email,
                    username: context.user.username,
                });
            }
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
            Sentry.captureException(error);
        });
    }
}
/**
 * Capture a message (non-error event)
 */
function captureMessage(message, level = 'info', context) {
    if (process.env.SENTRY_DSN) {
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
    if (process.env.SENTRY_DSN) {
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
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb(breadcrumb);
    }
}
