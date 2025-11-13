"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticated = void 0;
// middleware/auth.ts
const jwt_1 = require("../utils/jwt");
const authenticated = (resolverFn) => {
    return (parent, args, context, info) => {
        const authHeader = context.req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        if (!token)
            throw new Error('Authentication required');
        const payload = (0, jwt_1.verifyToken)(token);
        context.user = payload;
        return resolverFn(parent, args, context, info);
    };
};
exports.authenticated = authenticated;
