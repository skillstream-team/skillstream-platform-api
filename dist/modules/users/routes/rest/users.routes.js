"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// modules/users/routes/rest/users.routes.ts
const express_1 = require("express");
const users_service_1 = require("../../services/users.service");
// Import loginRateLimiter middleware
const rate_limit_1 = require("../../../../middleware/rate-limit");
const validation_1 = require("../../../../middleware/validation");
const validation_schemas_1 = require("../../../../utils/validation-schemas");
const router = (0, express_1.Router)();
const service = new users_service_1.UsersService();
// User login
router.post('/auth/login', rate_limit_1.loginRateLimiter, (0, validation_1.validate)({ body: validation_schemas_1.loginSchema }), async (req, res) => {
    try {
        const user = await service.login(req.body);
        res.json(user);
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
});
// User registration
router.post('/auth/register', rate_limit_1.registrationRateLimiter, (0, validation_1.validate)({ body: validation_schemas_1.createUserSchema }), async (req, res) => {
    try {
        const user = await service.createUser(req.body);
        res.status(201).json(user);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Refresh token
router.post('/auth/refresh-token', (0, validation_1.validate)({ body: validation_schemas_1.refreshTokenSchema }), async (req, res) => {
    try {
        const user = await service.refreshToken(req.body.token);
        res.json(user);
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
});
// User forgot password
router.post('/auth/forgot-password', rate_limit_1.passwordResetRateLimiter, (0, validation_1.validate)({ body: validation_schemas_1.forgotPasswordSchema }), async (req, res) => {
    try {
        const user = await service.forgotPassword(req.body.email);
        res.json(user);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
// Reset password
router.post('/auth/reset-password', rate_limit_1.passwordResetRateLimiter, (0, validation_1.validate)({ body: validation_schemas_1.resetPasswordSchema }), async (req, res) => {
    try {
        const user = await service.resetPassword(req.body);
        res.json(user);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
