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
 * Initialize Sentry for error tracking and performance monitoring.
 * Initializes when SENTRY_DSN is set (works in both development and production).
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment !== 'production';

  if (dsn) {
    const integrations: any[] = [
      expressIntegration(),
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
  } else if (environment === 'production') {
    console.warn("⚠️  Sentry DSN not provided. Error tracking disabled.");
  } else {
    console.log("ℹ️  Sentry disabled. Set SENTRY_DSN in .env to enable in development.");
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
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}) {
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
export function setUser(user: { id: string; email?: string; username?: string }) {
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
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
