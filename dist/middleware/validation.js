"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
const zod_1 = require("zod");
/**
 * Validation middleware factory
 * Creates middleware to validate request body/query/params against a Zod schema
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            // Validate body
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            // Validate query
            if (schema.query) {
                req.query = schema.query.parse(req.query);
            }
            // Validate params
            if (schema.params) {
                req.params = schema.params.parse(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: error.errors.map((err) => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            next(error);
        }
    };
}
/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input) {
    if (typeof input !== 'string')
        return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}
/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
    const sanitized = { ...obj };
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeString(sanitized[key]);
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeObject(sanitized[key]);
        }
    }
    return sanitized;
}
