import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Bell, Clock, ArrowRight, X, Sparkles, Navigation } from 'lucide-react';
import { hapticCheckInClick } from '../utils/haptics';

export const GeofenceProximityBanner: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const {
    proximityAlert,
    dismissProximityAlert,
    markCheckIn,
    todayRecord,
    currentEmployee,
  } = useAttendance();

  if (!proximityAlert || (todayRecord && todayRecord.checkInTime)) {
    return null;
  }

  const { location, distanceMeters } = proximityAlert;

  const handleQuickCheckIn = () => {
    hapticCheckInClick();
    const res = markCheckIn('50m Geofence Proximity Alert Quick Punch-In');
    if (res.success) {
      dismissProximityAlert();
    }
  };

  return (
    <div className={`relative z-50 w-full mb-4 animate-bounce-subtle ${isRTL ? 'font-arabic' : ''}`}>
      <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white rounded-2xl p-4 shadow-xl border border-emerald-500/40 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
        {/* Radar Pulse Icon */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 flex items-center justify-center w-11 h-11 bg-emerald-500/20 border border-emerald-400/50 rounded-xl overflow-hidden">
            <span className="absolute inset-0 rounded-xl bg-emerald-400/20 animate-ping" />
            <Navigation className="w-5 h-5 text-emerald-400 relative z-10 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {t('prox.tag', '50m Geofence Nearby')}
              </span>
              <span className="text-xs text-stone-300 font-mono font-bold bg-stone-800/80 px-1.5 py-0.5 rounded">
                {distanceMeters}m away
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">
              {t('prox.title', 'Approaching Office:')} {location.name}
            </h4>
            <p className="text-xs text-stone-300 mt-0.5">
              {t('prox.desc', 'You are within 50 meters of your assigned office. Don\'t forget to record your attendance!')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-800/60 justify-end">
          <button
            type="button"
            onClick={handleQuickCheckIn}
            className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Clock className="w-4 h-4 text-stone-950" />
            <span>{t('action.punch_in', 'Punch In Now')}</span>
          </button>
          <button
            type="button"
            onClick={dismissProximityAlert}
            title={t('action.cancel', 'Dismiss')}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
