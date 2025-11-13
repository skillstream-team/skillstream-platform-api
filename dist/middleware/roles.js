"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const jwt_1 = require("../utils/jwt");
const requireRole = (role) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return res.status(401).json({ error: 'No token provided' });
            const token = authHeader.split(' ')[1];
            const payload = (0, jwt_1.verifyToken)(token);
            if (payload.role !== role) {
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
            // Attach user info to req if needed
            req.user = payload;
            next();
        }
        catch (err) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
};
exports.requireRole = requireRole;
