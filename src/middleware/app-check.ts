// src/middleware/app-check.ts
// Optional Firebase App Check verification. When ENABLE_APP_CHECK is true and
// the client sends X-Firebase-AppCheck, we verify the token. Missing header is
// allowed (e.g. dev or older clients); invalid token returns 401.

import { Request, Response, NextFunction } from 'express';
import { getFirebaseApp } from '../utils/firebase';
import { getAppCheck } from 'firebase-admin/app-check';

export async function verifyAppCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.ENABLE_APP_CHECK !== 'true') {
    return next();
  }

  const token = req.header('X-Firebase-AppCheck');
  if (!token) {
    return next();
  }

  try {
    const appCheck = getAppCheck(getFirebaseApp());
    await appCheck.verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      error: 'Invalid or expired App Check token.',
      code: 'APP_CHECK_INVALID',
    });
  }
}
