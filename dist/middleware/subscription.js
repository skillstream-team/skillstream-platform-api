"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSubscription = exports.requireSubscription = void 0;
const subscription_service_1 = require("../modules/subscriptions/services/subscription.service");
const subscriptionService = new subscription_service_1.SubscriptionService();
/**
 * Middleware to require active subscription for students
 * Teachers and Admins are exempt from subscription requirement
 */
const requireSubscription = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        // Teachers and Admins don't need subscription
        if (req.user.role === 'TEACHER' || req.user.role === 'ADMIN') {
            return next();
        }
        // Check if user has active subscription
        const hasSubscription = await subscriptionService.hasActiveSubscription(req.user.id);
        if (!hasSubscription) {
            return res.status(403).json({
                error: 'Active subscription required to access courses',
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'You need an active subscription ($6/month) to access courses. Please subscribe to continue.',
                subscriptionFee: subscriptionService.getSubscriptionFee(),
            });
        }
        next();
    }
    catch (error) {
        console.error('Subscription middleware error:', error);
        res.status(500).json({
            error: 'Failed to verify subscription status',
            code: 'SUBSCRIPTION_CHECK_FAILED'
        });
    }
};
exports.requireSubscription = requireSubscription;
/**
 * Optional subscription check - adds subscription status to request but doesn't block
 */
const checkSubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }
        // Teachers and Admins don't need subscription
        if (req.user.role === 'TEACHER' || req.user.role === 'ADMIN') {
            req.hasSubscription = true;
            return next();
        }
        const hasSubscription = await subscriptionService.hasActiveSubscription(req.user.id);
        req.hasSubscription = hasSubscription;
        next();
    }
    catch (error) {
        // If check fails, assume no subscription but don't block
        req.hasSubscription = false;
        next();
    }
};
exports.checkSubscription = checkSubscription;
