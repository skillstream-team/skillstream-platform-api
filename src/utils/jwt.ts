import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '1h'; // adjust as needed
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in your environment variables');
}

export interface TokenPayload {
  id: string;
  role: string;
}

export interface JWTPayload {
  id: string;
  role: string;
  userId?: string; // For backward compatibility with old tokens
}

export const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export function generateToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
}