import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users, sessions } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: any;
  sessionToken?: string;
}

interface AuthCacheEntry {
  dbUser: any;
  sessionValid: boolean;
  timestamp: number;
}

const authCache = new Map<string, AuthCacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds short-term cache

export const invalidateAuthCache = (uid?: string) => {
  if (!uid) {
    authCache.clear();
    return;
  }
  for (const key of authCache.keys()) {
    if (key.startsWith(`${uid}:`)) {
      authCache.delete(key);
    }
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const sessionToken = req.headers['x-session-token'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH_REJECT] 401 Unauthorized: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const cacheKey = `${decodedToken.uid}:${sessionToken || 'none'}`;
    const now = Date.now();
    const cached = authCache.get(cacheKey);

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      if (!cached.sessionValid) {
        return res.status(401).json({ error: 'SESSION_INVALIDATED', message: 'You have been logged in from another device.' });
      }
      req.dbUser = cached.dbUser;
      if (sessionToken) req.sessionToken = sessionToken;
      return next();
    }

    // Get user from DB
    const dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
    if (dbUsers.length > 0) {
      req.dbUser = dbUsers[0];

      // Single Active Session check
      if (sessionToken) {
        const sessionRec = await db.select().from(sessions).where(
          and(
            eq(sessions.studentId, req.dbUser.id),
            eq(sessions.sessionToken, sessionToken),
            eq(sessions.isActive, true)
          )
        );
        if (sessionRec.length === 0) {
          authCache.set(cacheKey, { dbUser: req.dbUser, sessionValid: false, timestamp: now });
          console.warn(`[AUTH_REJECT] 401 Session invalidated for user: ${req.dbUser.email} (ID: ${req.dbUser.id})`);
          return res.status(401).json({ error: 'SESSION_INVALIDATED', message: 'You have been logged in from another device.' });
        }
        req.sessionToken = sessionToken;
      }

      authCache.set(cacheKey, { dbUser: req.dbUser, sessionValid: true, timestamp: now });
    } else {
      console.warn(`[AUTH_WARN] No DB user found for UID: ${decodedToken.uid} (${decodedToken.email})`);
    }

    next();
  } catch (error) {
    console.error('[AUTH_REJECT] 401 Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const sessionToken = req.headers['x-session-token'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const cacheKey = `${decodedToken.uid}:${sessionToken || 'none'}`;
    const now = Date.now();
    const cached = authCache.get(cacheKey);

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      if (cached.sessionValid) {
        req.dbUser = cached.dbUser;
        if (sessionToken) req.sessionToken = sessionToken;
      }
      return next();
    }

    const dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
    if (dbUsers.length > 0) {
      req.dbUser = dbUsers[0];
      if (sessionToken) {
        const sessionRec = await db.select().from(sessions).where(
          and(
            eq(sessions.studentId, req.dbUser.id),
            eq(sessions.sessionToken, sessionToken),
            eq(sessions.isActive, true)
          )
        );
        if (sessionRec.length > 0) {
          req.sessionToken = sessionToken;
          authCache.set(cacheKey, { dbUser: req.dbUser, sessionValid: true, timestamp: now });
        } else {
          authCache.set(cacheKey, { dbUser: req.dbUser, sessionValid: false, timestamp: now });
        }
      } else {
        authCache.set(cacheKey, { dbUser: req.dbUser, sessionValid: true, timestamp: now });
      }
    }
    next();
  } catch {
    // Silently continue for optional auth
    next();
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const isMasterAdmin = req.user?.email === 'o.20x25@gmail.com';
  const hasAdminRole = req.dbUser && req.dbUser.role === 'admin';

  if (!hasAdminRole && !isMasterAdmin) {
    console.warn(`[AUTH_REJECT] 403 Forbidden: Admin access required. User email: ${req.user?.email}, DB role: ${req.dbUser?.role || 'none'}`);
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

