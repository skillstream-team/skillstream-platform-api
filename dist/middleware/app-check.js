"use strict";
// src/middleware/app-check.ts
// Optional Firebase App Check verification. When ENABLE_APP_CHECK is true and
// the client sends X-Firebase-AppCheck, we verify the token. Missing header is
// allowed (e.g. dev or older clients); invalid token returns 401.
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAppCheck = verifyAppCheck;
const firebase_1 = require("../utils/firebase");
const app_check_1 = require("firebase-admin/app-check");
async function verifyAppCheck(req, res, next) {
    if (process.env.ENABLE_APP_CHECK !== 'true') {
        return next();
    }
    const token = req.header('X-Firebase-AppCheck');
    if (!token) {
        return next();
    }
    try {
        const appCheck = (0, app_check_1.getAppCheck)((0, firebase_1.getFirebaseApp)());
        await appCheck.verifyToken(token);
        next();
    }
    catch {
        res.status(401).json({
            error: 'Invalid or expired App Check token.',
            code: 'APP_CHECK_INVALID',
        });
    }
}
