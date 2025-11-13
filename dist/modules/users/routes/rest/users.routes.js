"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// modules/users/routes/rest/users.routes.ts
const express_1 = require("express");
const users_service_1 = require("../../services/users.service");
// Import loginRateLimiter middleware
const rate_limit_1 = require("../../../../middleware/rate-limit");
const router = (0, express_1.Router)();
const service = new users_service_1.UsersService();
// User login
router.post('/auth/login', rate_limit_1.loginRateLimiter, async (req, res) => {
    try {
        const user = await service.login(req.body);
        res.json(user);
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
});
// User registration
router.post('/auth/register', rate_limit_1.loginRateLimiter, async (req, res) => {
    try {
        const user = await service.createUser(req.body);
        res.status(201).json(user);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Refresh token
router.post('/auth/refresh-token', async (req, res) => {
    try {
        const user = await service.refreshToken(req.body.token);
        res.json(user);
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
});
// User forgot password
router.post('/auth/forgot-password', async (req, res) => {
    try {
        const user = await service.forgotPassword(req.body.email);
        res.json(user);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
});
// Reset password
router.post('/auth/reset-password', async (req, res) => {
    try {
        const user = await service.resetPassword(req.body);
        res.json(user);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
