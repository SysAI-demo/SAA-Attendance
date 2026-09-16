import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Timer,
  CalendarCheck,
  X,
  LogIn,
  LogOut,
  Sparkles,
  ScanFace,
  Fingerprint,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import { PunchActionResult } from '../context/AttendanceContext';
import { isHapticsSupported, hapticTap } from '../utils/haptics';

export interface PunchFeedbackState extends PunchActionResult {
  type: 'success' | 'error';
}

interface PunchFeedbackCardProps {
  feedback: PunchFeedbackState | null;
  onDismiss: () => void;
}

export const PunchFeedbackCard: React.FC<PunchFeedbackCardProps> = ({
  feedback,
  onDismiss,
}) => {
  if (!feedback) return null;

  const isCheckIn = feedback.punchType === 'check_in';
  const isSuccess = feedback.type === 'success';
  const punchTime = feedback.punchTimeFormatted || feedback.punchTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const locationName = feedback.locationName || 'Authorized Office';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onDismiss}
      >
        <motion.div
          id="punch-feedback-notification"
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-[#ded4c5] rounded-3xl p-5 shadow-2xl max-w-xs sm:max-w-sm w-full space-y-4 text-center relative overflow-hidden"
        >
          {/* Top Colored Bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              !isSuccess ? 'bg-rose-500' : isCheckIn ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
          />

          <button
            type="button"
            id="dismiss-punch-feedback-btn"
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="flex justify-center pt-2">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                !isSuccess
                  ? 'bg-rose-100 text-rose-600 border-2 border-rose-300'
                  : isCheckIn
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                  : 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              }`}
            >
              {!isSuccess ? (
                <AlertTriangle className="w-7 h-7" />
              ) : isCheckIn ? (
                <LogIn className="w-7 h-7" />
              ) : (
                <LogOut className="w-7 h-7" />
              )}
            </div>
          </div>

          {/* Title & Headline */}
          <div className="space-y-1">
            <h3 className="text-base font-black text-stone-900 tracking-tight">
              {!isSuccess
                ? 'Punch Failed'
                : isCheckIn
                ? 'Check-IN Successful'
                : 'Check-OUT Successful'}
            </h3>
            <p className="text-xs text-stone-600 font-medium px-2">
              {isSuccess
                ? `Logged successfully at ${locationName} at ${punchTime}.`
                : feedback.message}
            </p>
          </div>

          {/* Location & Time Info Box */}
          {isSuccess && (
            <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-2xl p-3 grid grid-cols-2 gap-2 text-left text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  <span>Location</span>
                </span>
                <span className="font-extrabold text-stone-900 block truncate text-[11px]" title={locationName}>
                  {locationName}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-stone-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" />
                  <span>Time Logged</span>
                </span>
                <span className="font-mono font-extrabold text-stone-900 block text-[11px]">
                  {punchTime}
                </span>
              </div>
            </div>
          )}

          {/* Offline Saved Badge */}
          {isSuccess && feedback.isOfflineQueued && (
            <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 text-white rounded-xl text-[11px] font-bold shadow-xs">
              <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>Saved Offline &bull; Will auto-sync when online</span>
            </div>
          )}

          {/* Biometric Verification Badge */}
          {isSuccess && feedback.biometricVerified && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-900 shadow-2xs">
              {feedback.biometricType === 'face' ? (
                <ScanFace className="w-4 h-4 text-amber-700" />
              ) : (
                <Fingerprint className="w-4 h-4 text-amber-700" />
              )}
              <span>
                Verified via {feedback.biometricType === 'face' ? 'Face ID' : 'Fingerprint'} Biometrics
              </span>
            </div>
          )}

          {/* Action Close Button */}
          <button
            type="button"
            onClick={() => {
              hapticTap();
              onDismiss();
            }}
            className={`w-full py-2.5 rounded-xl font-extrabold text-xs text-white shadow-sm transition-all cursor-pointer active:scale-98 ${
              !isSuccess
                ? 'bg-rose-600 hover:bg-rose-700'
                : isCheckIn
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            OK, Got it
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
