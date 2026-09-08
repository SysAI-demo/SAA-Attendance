import { GeoCoordinates, OfficeLocation, GeofenceCheckResult } from '../types';

/**
 * Calculates the great-circle distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates whether user's current GPS position is inside any of their authorized office geofences.
 */
export function checkGeofenceStatus(
  coords: GeoCoordinates,
  allLocations: OfficeLocation[],
  allowedLocationIds: string[]
): GeofenceCheckResult {
  if (!allLocations || allLocations.length === 0) {
    return {
      isInAllowedGeofence: false,
      distanceToNearestMeters: 0,
      isAuthorizedLocation: false,
      statusMessage: 'No office locations configured in the system.',
    };
  }

  const isGlobalAllowed =
    !allowedLocationIds ||
    allowedLocationIds.length === 0 ||
    allowedLocationIds.includes('*') ||
    allowedLocationIds.includes('all');

  // Calculate distance to all locations with GPS accuracy tolerance buffer
  const accuracyBuffer = Math.min(35, Math.max(5, (coords.accuracy || 10) * 0.4));

  const locationsWithDist = allLocations.map((loc) => {
    const dist = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      loc.latitude,
      loc.longitude
    );
    // Inside if distance is within the location radius plus device GPS accuracy margin
    const effectiveRadius = loc.radiusMeters + accuracyBuffer;
    const isInsideRadius = dist <= effectiveRadius;
    const isAllowedForEmployee = isGlobalAllowed || allowedLocationIds.includes(loc.id);

    return {
      location: loc,
      distance: dist,
      isInsideRadius,
      isAllowedForEmployee,
      effectiveRadius,
    };
  });

  // Sort by nearest distance
  locationsWithDist.sort((a, b) => a.distance - b.distance);
  const nearest = locationsWithDist[0];

  // Check if inside any authorized active location
  const matchingAuthorized = locationsWithDist.find(
    (item) => item.isInsideRadius && item.isAllowedForEmployee && item.location.isActive
  );

  // Check if inside an unauthorized active location
  const matchingUnauthorized = locationsWithDist.find(
    (item) => item.isInsideRadius && !item.isAllowedForEmployee && item.location.isActive
  );

  if (matchingAuthorized) {
    return {
      isInAllowedGeofence: true,
      nearestLocation: matchingAuthorized.location,
      activeAuthorizedLocation: matchingAuthorized.location,
      distanceToNearestMeters: matchingAuthorized.distance,
      isAuthorizedLocation: true,
      statusMessage: `Verified! You are inside authorized office geofence "${matchingAuthorized.location.name}" (${matchingAuthorized.distance}m from center, radius: ${matchingAuthorized.location.radiusMeters}m).`,
      accuracyAlert: coords.accuracy > 50 ? `GPS Accuracy is ±${Math.round(coords.accuracy)}m. Sky visibility is clear.` : undefined,
    };
  }

  if (matchingUnauthorized) {
    return {
      isInAllowedGeofence: false,
      nearestLocation: matchingUnauthorized.location,
      distanceToNearestMeters: matchingUnauthorized.distance,
      isAuthorizedLocation: false,
      statusMessage: `Location Restriction: You are at "${matchingUnauthorized.location.name}", but your profile is not assigned to this office. Please ask HR to add this branch to your authorized locations.`,
      accuracyAlert: undefined,
    };
  }

  // Outside all geofences
  const nearestAllowed = locationsWithDist.find((item) => item.isAllowedForEmployee);
  const targetLocation = nearestAllowed || nearest;

  const diffDistance = Math.max(1, targetLocation.distance - targetLocation.location.radiusMeters);
  const distanceFormatted = formatDistance(targetLocation.distance);

  return {
    isInAllowedGeofence: false,
    nearestLocation: targetLocation.location,
    distanceToNearestMeters: targetLocation.distance,
    isAuthorizedLocation: targetLocation.isAllowedForEmployee,
    statusMessage: `Out of Geofence: You are ${distanceFormatted} away from "${targetLocation.location.name}" (Allowed radius: ${targetLocation.location.radiusMeters}m). Move ${formatDistance(diffDistance)} closer or update office GPS coordinates.`,
    accuracyAlert: coords.accuracy > 65 ? `GPS Accuracy is ±${Math.round(coords.accuracy)}m. Ensure Location Services / High Accuracy is enabled.` : undefined,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatTimeHM(dateStr?: string | Date): string {
  if (!dateStr) return '--:--';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeHMS(dateStr?: string | Date): string {
  if (!dateStr) return '--:--:--';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDurationHoursMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function calculateExpectedOutTime(checkInTimeStr?: string, shiftHours: number = 8): string {
  if (!checkInTimeStr) return '—';
  const parts = checkInTimeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '—';
  const outDate = new Date();
  outDate.setHours((parts[0] + shiftHours) % 24, parts[1], parts[2] || 0, 0);
  return outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}
