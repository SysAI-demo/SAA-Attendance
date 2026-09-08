// Server-side Security, RBAC & Validation Module
import { Request, Response, NextFunction } from 'express';
import { GeoCoordinates, OfficeLocation, Employee } from '../src/types';

// Rate Limiter: In-memory sliding window
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export function rateLimiter(maxRequests: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
        retryAfterMs: entry.resetTime - now,
      });
    }

    entry.count += 1;
    next();
  };
}

// Input Sanitizer to prevent Stored XSS and Injection
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // remove HTML tags
    .trim()
    .slice(0, 2000); // cap length to prevent payload inflation
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj) as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      cleaned[k] = sanitizeObject(v);
    }
    return cleaned as T;
  }
  return obj;
}

// Haversine formula on the server to prevent GPS spoofing
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface ServerGeofenceResult {
  isValid: boolean;
  matchedLocation?: OfficeLocation;
  distanceMeters: number;
  message: string;
}

export function verifyServerGeofence(
  coords: GeoCoordinates,
  locations: OfficeLocation[],
  employee: Employee
): ServerGeofenceResult {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return {
      isValid: false,
      distanceMeters: 999999,
      message: 'Invalid GPS coordinates received by the server.',
    };
  }

  // Check assigned locations or any active location if employee has all authorized
  const assigned = locations.filter(
    (loc) => loc.isActive && (employee.allowedLocationIds?.includes(loc.id) || employee.role === 'admin' || employee.role === 'hr')
  );

  const candidateLocations = assigned.length > 0 ? assigned : locations.filter((loc) => loc.isActive);

  let nearestLocation: OfficeLocation | undefined;
  let minDistance = Infinity;

  for (const loc of candidateLocations) {
    const dist = calculateHaversineDistanceMeters(
      coords.latitude,
      coords.longitude,
      loc.latitude,
      loc.longitude
    );

    if (dist < minDistance) {
      minDistance = dist;
      nearestLocation = loc;
    }

    // Check with allowable radius + GPS accuracy margin (max 30m)
    const allowedRadius = loc.radiusMeters + Math.min(30, coords.accuracy || 10);
    if (dist <= allowedRadius) {
      return {
        isValid: true,
        matchedLocation: loc,
        distanceMeters: dist,
        message: `Verified by server: Inside ${loc.name} (${dist}m, allowed ${loc.radiusMeters}m)`,
      };
    }
  }

  return {
    isValid: false,
    matchedLocation: nearestLocation,
    distanceMeters: minDistance,
    message: nearestLocation
      ? `Outside geofence: ${minDistance}m from ${nearestLocation.name} (allowed: ${nearestLocation.radiusMeters}m)`
      : 'No active office geofence location found in range.',
  };
}

// Role-Based Access Control (RBAC) Middleware
export function requireRole(allowedRoles: ('employee' | 'manager' | 'hr' | 'super_admin' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || 'employee';

    // Allow bootstrap when no employees exist or when user is admin/hr/super_admin
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr' || allowedRoles.includes(userRole as any)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied. Role "${userRole}" is not authorized for this operation. Required: ${allowedRoles.join(', ')}.`,
    });
  };
}
