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

  // Calculate distance to all locations
  const locationsWithDist = allLocations.map((loc) => {
    const dist = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      loc.latitude,
      loc.longitude
    );
    const isInsideRadius = dist <= loc.radiusMeters;
    const isAllowedForEmployee = allowedLocationIds.includes(loc.id);

    return {
      location: loc,
      distance: dist,
      isInsideRadius,
      isAllowedForEmployee,
    };
  });

  // Sort by nearest distance
  locationsWithDist.sort((a, b) => a.distance - b.distance);
  const nearest = locationsWithDist[0];

  // Check if inside any authorized location
  const matchingAuthorized = locationsWithDist.find(
    (item) => item.isInsideRadius && item.isAllowedForEmployee && item.location.isActive
  );

  // Check if inside an unauthorized location
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
      statusMessage: `Verified! You are inside authorized office geofence "${matchingAuthorized.location.name}" (${matchingAuthorized.distance}m from center point, allowed radius: ${matchingAuthorized.location.radiusMeters}m).`,
      accuracyAlert: coords.accuracy > 50 ? `GPS Accuracy is ±${Math.round(coords.accuracy)}m. Ensure you have clear sky visibility.` : undefined,
    };
  }

  if (matchingUnauthorized) {
    return {
      isInAllowedGeofence: false,
      nearestLocation: matchingUnauthorized.location,
      distanceToNearestMeters: matchingUnauthorized.distance,
      isAuthorizedLocation: false,
      statusMessage: `Location Restriction: You are at "${matchingUnauthorized.location.name}", but your profile is NOT authorized to mark attendance at this office. Please check your assigned branch locations.`,
      accuracyAlert: undefined,
    };
  }

  // Outside all geofences
  const nearestAllowed = locationsWithDist.find(item => item.isAllowedForEmployee);
  const targetLocation = nearestAllowed || nearest;

  const diffDistance = targetLocation.distance - targetLocation.location.radiusMeters;
  const distanceFormatted = formatDistance(targetLocation.distance);

  return {
    isInAllowedGeofence: false,
    nearestLocation: targetLocation.location,
    distanceToNearestMeters: targetLocation.distance,
    isAuthorizedLocation: targetLocation.isAllowedForEmployee,
    statusMessage: `Out of Geofence: You are ${distanceFormatted} away from "${targetLocation.location.name}" (Allowed radius: ${targetLocation.location.radiusMeters}m). You need to be ${formatDistance(Math.max(1, diffDistance))} closer to mark attendance.`,
    accuracyAlert: coords.accuracy > 70 ? `GPS Accuracy is ±${Math.round(coords.accuracy)}m. GPS signal might be weak.` : undefined,
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
