import * as Sentry from "@sentry/node";
import { expressIntegration } from "@sentry/node";

// Conditionally import profiling integration (may not be available)
let nodeProfilingIntegration: any = null;
try {
  const profilingModule = require("@sentry/profiling-node");
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
} catch (error) {
  // Profiling module not available - that's okay, we'll skip it
  console.warn("⚠️  Sentry profiling module not available. Profiling disabled.");
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only initializes in production if SENTRY_DSN is provided
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Only initialize in production with a valid DSN
  if (environment === 'production' && dsn) {
    const integrations: any[] = [
      expressIntegration(),
    ];

    // Only add profiling integration if available
    if (nodeProfilingIntegration) {
      integrations.push(nodeProfilingIntegration());
    }

    Sentry.init({
      dsn: dsn,
      environment: environment,
      
      // Integrations
      integrations,

      // Performance Monitoring
      // Sample 10% of transactions for performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      
      // Profiling (only if module is available)
      // Sample 10% of transactions for profiling
      profilesSampleRate: nodeProfilingIntegration 
        ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1')
        : undefined,

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
  } else if (environment === 'production' && !dsn) {
    console.warn("⚠️  Sentry DSN not provided. Error tracking disabled.");
  } else {
    console.log("ℹ️  Sentry disabled in development mode");
  }
}

/**
 * Capture an exception and send it to Sentry
 */
export function captureException(error: Error, context?: {
  user?: { id: string; email?: string; username?: string };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}) {
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
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}) {
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
export function setUser(user: { id: string; email?: string; username?: string }) {
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
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
