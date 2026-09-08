import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Info,
  Building2,
  Compass,
  ExternalLink,
} from 'lucide-react';

interface LocationPermissionPromptProps {
  variant?: 'card' | 'banner' | 'modal' | 'compact';
  onLocationGranted?: () => void;
  title?: string;
  description?: string;
}

export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({
  variant = 'card',
  onLocationGranted,
  title = 'Allow Device Location Access',
  description = 'SAATA Attendance requires access to your live device GPS coordinates to verify check-ins inside authorized office geofences.',
}) => {
  const {
    locationPermissionStatus,
    hasAcquiredRealGPS,
    isLocating,
    requestLocationPermission,
    currentCoords,
    gpsError,
    officeLocations,
    setManualLocation,
    isUsingRealGPS,
  } = useAttendance();

  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);

  const handleAllowLocation = async () => {
    setRequestMsg(null);
    const res = await requestLocationPermission();
    if (res.success) {
      setRequestMsg(`Location granted! Live GPS accuracy: ±${Math.round(res.coords?.accuracy || 10)}m`);
      if (onLocationGranted) onLocationGranted();
      setTimeout(() => setRequestMsg(null), 4000);
    } else {
      setRequestMsg(res.error || 'Permission not granted. Please check browser settings.');
    }
  };

  // 1. Compact Badge Variant (When granted)
  if (variant === 'compact' && locationPermissionStatus === 'granted' && hasAcquiredRealGPS) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-medium shadow-2xs">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold">Live Device GPS Active</span>
        <span className="text-emerald-700 font-mono text-[10px]">
          ({currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)})
        </span>
      </div>
    );
  }

  // 2. Banner Variant (Top alert)
  if (variant === 'banner') {
    if (locationPermissionStatus === 'granted' && hasAcquiredRealGPS) {
      return null; // Don't show banner if location is active and acquired
    }

    return (
      <div className="bg-amber-500 text-stone-950 border-b border-amber-600 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin className="w-4 h-4 text-stone-950 shrink-0 animate-bounce" />
          <div className="min-w-0">
            <span className="font-extrabold block truncate">Location Access Needed for Geofencing</span>
            <span className="text-[11px] text-stone-900 truncate block">
              {locationPermissionStatus === 'denied'
                ? 'Location access is blocked in browser settings. Please allow location to check in.'
                : 'Please grant device location access to verify your office check-in.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAllowLocation}
            disabled={isLocating}
            className="px-3 py-1 bg-stone-950 hover:bg-stone-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            {isLocating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>{locationPermissionStatus === 'denied' ? 'Retry Access' : 'Allow Location'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 3. Card / Default Variant
  return (
    <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white rounded-2xl p-4 sm:p-5 border border-stone-800 shadow-lg space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white">{title}</h3>
              {locationPermissionStatus === 'granted' && hasAcquiredRealGPS && (
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  GPS Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 leading-snug mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Permission Status Feedback */}
      {locationPermissionStatus === 'granted' && hasAcquiredRealGPS ? (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Live Device GPS Connected</span>
            </span>
            <span className="font-mono text-[11px] text-emerald-200">
              ±{Math.round(currentCoords.accuracy)}m precision
            </span>
          </div>
          <div className="text-[11px] text-stone-300 font-mono pt-1 border-t border-emerald-900/50 flex items-center justify-between">
            <span>Lat: {currentCoords.latitude.toFixed(5)}</span>
            <span>Lng: {currentCoords.longitude.toFixed(5)}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Status Message / Error Alert */}
          {gpsError && (
            <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-amber-100">Location Access Attention</span>
                <p className="text-[11px] leading-relaxed">{gpsError}</p>
              </div>
            </div>
          )}

          {requestMsg && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{requestMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              id="btn-allow-device-location"
              onClick={handleAllowLocation}
              disabled={isLocating}
              className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Acquiring Device GPS...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 fill-stone-950" />
                  <span>
                    {locationPermissionStatus === 'denied'
                      ? 'Retry Location Access'
                      : '📍 Allow Device Location Access'}
                  </span>
                </>
              )}
            </button>

            {/* Quick Preset Teleport for Testing / Desktop */}
            {officeLocations.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const target = officeLocations[0];
                  setManualLocation(target.latitude, target.longitude, 5);
                }}
                className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Set location to primary office for testing"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Primary Office</span>
              </button>
            )}
          </div>

          {/* How to enable instructions toggle if denied */}
          {locationPermissionStatus === 'denied' && (
            <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-300 space-y-2">
              <button
                type="button"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>How to allow location in browser / phone settings?</span>
              </button>

              {showTroubleshooting && (
                <div className="bg-stone-850 p-3 rounded-xl border border-stone-700 space-y-1.5 text-[11px] text-stone-300">
                  <p className="font-bold text-white">To grant location access:</p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-300">
                    <li>Look at the address bar at the top of your browser.</li>
                    <li>Click the 🔒 lock icon or site settings button.</li>
                    <li>Find <strong>Location</strong> and change it from Block to <strong>Allow</strong>.</li>
                    <li>Click the <strong>"Retry Location Access"</strong> button above or refresh the page.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
