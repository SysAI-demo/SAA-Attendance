import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { DesertOasisBackground } from './DesertOasisBackground';
import {
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  ShieldAlert,
  Laptop,
  Monitor,
  CheckCircle2,
  Fingerprint,
  ScanFace,
  X,
} from 'lucide-react';
import { EmployeeDeviceBinding } from '../types';
import { useDeviceType } from '../hooks/useDeviceType';

interface EmployeeLoginProps {
  onLoginSuccess?: () => void;
  isMobileScreen?: boolean;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({
  onLoginSuccess,
  isMobileScreen: propIsMobile,
}) => {
  const detectedDevice = useDeviceType();
  const isMobile = propIsMobile !== undefined ? propIsMobile : detectedDevice.isMobile;
  const selectedPlatform: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

  const {
    login,
    employees,
    currentDevice,
  } = useAttendance();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deviceMismatchInfo, setDeviceMismatchInfo] = useState<{
    registered?: EmployeeDeviceBinding | null;
    current?: EmployeeDeviceBinding;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Biometric Auth Modal State
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [biometricStatusMsg, setBiometricStatusMsg] = useState('');

  const handleBiometricLoginTrigger = () => {
    setError(null);
    setDeviceMismatchInfo(null);
    setShowBiometricModal(true);
    setBiometricScanning(false);
    setBiometricSuccess(false);
    setBiometricStatusMsg('Touch fingerprint sensor or present face for SAATA Mobile Auth.');
  };

  const handleExecuteBiometricScan = (type: 'fingerprint' | 'face') => {
    setBiometricScanning(true);
    setBiometricSuccess(false);
    setBiometricStatusMsg(type === 'fingerprint' ? 'Scanning fingerprint sensor...' : 'Authenticating Face ID geometry...');

    setTimeout(() => {
      const savedUser = localStorage.getItem('saata_biometric_user') || username.trim();
      const savedPass = localStorage.getItem('saata_biometric_pass') || password.trim();

      if (!savedUser) {
        setBiometricScanning(false);
        setShowBiometricModal(false);
        setError('No saved biometric user found. Please login with password first.');
        return;
      }

      const res = login(savedUser, savedPass, { forcePlatform: 'mobile' });

      if (res.success) {
        setBiometricScanning(false);
        setBiometricSuccess(true);
        setBiometricStatusMsg(`Biometric Verified! Authenticated as ${savedUser}.`);
        setTimeout(() => {
          setShowBiometricModal(false);
          if (onLoginSuccess) onLoginSuccess();
        }, 600);
      } else {
        setBiometricScanning(false);
        setShowBiometricModal(false);
        setError(res.message || 'Biometric authentication failed or device mismatch.');
        if (res.isDeviceMismatch) {
          setDeviceMismatchInfo({
            registered: res.registeredDevice,
            current: res.currentDevice,
          });
        }
      }
    }, 1300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      setDeviceMismatchInfo(null);
      return;
    }

    setError(null);
    setDeviceMismatchInfo(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(username.trim(), password, { forcePlatform: selectedPlatform });
      setLoading(false);
      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(res.message || 'Invalid username or password.');
        if (res.isDeviceMismatch) {
          setDeviceMismatchInfo({
            registered: res.registeredDevice,
            current: res.currentDevice,
          });
        }
      }
    }, 280);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center font-sans select-none px-4 py-8">
      {/* Heritage Desert Oasis Line Art Background */}
      <DesertOasisBackground />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[385px] sm:max-w-[430px] bg-[#FAF6EE]/95 border border-[#CDBE9F] rounded-3xl shadow-2xl shadow-[#785E2D]/15 p-6 sm:p-8 backdrop-blur-md transition-all flex flex-col items-center">
        
        {/* Brand Logo & Header */}
        <div className="mb-4 flex flex-col items-center text-center">
          {/* Logo in top container */}
          <div className="p-3.5 rounded-2xl bg-white/90 border border-[#D5C7AA] shadow-sm flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="SAATA Logo"
              className="h-16 w-auto max-w-[170px] object-contain drop-shadow-2xs"
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight text-stone-900">
              SAATA
            </h1>
            <p className="text-[11px] font-bold text-[#8A6E3B] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unified Enterprise Access</span>
            </p>
          </div>
        </div>

        {/* Platform Indicator Banner */}
        <div className="w-full mb-4 px-3.5 py-2.5 bg-white/80 border border-[#D9CEBA] rounded-2xl flex items-center justify-between shadow-2xs">
          {selectedPlatform === 'desktop' ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center shrink-0">
                <Laptop className="w-3.5 h-3.5 text-stone-200" />
              </div>
              <div className="text-stone-700 leading-tight">
                <div className="font-extrabold text-stone-900">Desktop Portal</div>
                <div className="text-[10px] text-stone-500">Full workstation desk access</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div className="text-stone-700 leading-tight">
                <div className="font-extrabold text-stone-900">Mobile Application</div>
                <div className="text-[10px] text-stone-500">1-Device hardware binding active</div>
              </div>
            </div>
          )}

          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
            {selectedPlatform === 'desktop' ? 'Desktop' : 'Mobile'}
          </span>
        </div>

        {/* 1-Device Mobile Policy Security Alert */}
        {deviceMismatchInfo && (
          <div className="w-full mb-4 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-stone-800 text-xs shadow-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>1-Mobile-Device Policy Enforced</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
              Mobile application access is strictly restricted to <strong>1 authorized mobile phone</strong>. This employee profile is already mapped to another phone.
            </p>
            <div className="bg-white/90 border border-rose-200 rounded-xl p-2.5 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-semibold text-rose-900">Registered Phone:</span>
                <span className="font-mono text-stone-800 font-bold truncate max-w-[170px]">
                  {deviceMismatchInfo.registered?.deviceName || 'Authorized Mobile Device'}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-500">
                <span>Attempted Phone:</span>
                <span className="font-mono truncate max-w-[170px] text-rose-700 font-bold">
                  {currentDevice?.deviceName || 'This Browser'}
                </span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10px] text-amber-900 font-medium space-y-1">
              <p>
                ✦ <strong>Need to use desktop?</strong> Switch to the <em>Desktop Desk</em> tab above to sign in without restriction.
              </p>
              <p>
                ✦ <strong>New phone?</strong> Request HR to click <em>"Reset Mobile Device"</em> in the HR Directory.
              </p>
            </div>
          </div>
        )}

        {/* General Error Notification */}
        {error && !deviceMismatchInfo && (
          <div className="w-full mb-4 p-3 bg-rose-50/95 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-[12px] font-medium leading-snug">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Standard Corporate Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {/* USERNAME / EMAIL / EMPLOYEE CODE Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider block"
            >
              Username / Employee Code / Email
            </label>
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6E3B]">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                  if (deviceMismatchInfo) setDeviceMismatchInfo(null);
                }}
                placeholder="e.g. admin or EMP-001"
                autoComplete="off"
                className="w-full bg-white/95 border border-[#CDBE9F] focus:border-stone-900 focus:ring-1 focus:ring-stone-900 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 font-medium pl-10 pr-3 py-2.5 focus:outline-hidden transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* PASSWORD Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider block"
            >
              Password
            </label>
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6E3B]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                  if (deviceMismatchInfo) setDeviceMismatchInfo(null);
                }}
                placeholder="••••••••"
                autoComplete="off"
                className="w-full bg-white/95 border border-[#CDBE9F] focus:border-stone-900 focus:ring-1 focus:ring-stone-900 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 font-medium pl-10 pr-10 py-2.5 focus:outline-hidden transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* LOGIN SUBMIT Button */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-stone-50 py-3 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>{selectedPlatform === 'desktop' ? 'Sign In to Workspace' : 'Sign In to Mobile App'}</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>

            {/* Mobile Biometric Login Shortcut */}
            {selectedPlatform === 'mobile' && (
              <button
                type="button"
                id="login-biometric-btn"
                onClick={handleBiometricLoginTrigger}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-stone-950 py-2.5 rounded-xl text-xs font-black tracking-wide shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 border border-amber-400"
              >
                <Fingerprint className="w-4 h-4 text-stone-950" />
                <span>Login with Fingerprint / Face ID</span>
              </button>
            )}
          </div>
        </form>

        {/* Current Detected Hardware Tag */}
        <div className="w-full mt-3 px-3 py-2 bg-stone-100/80 border border-[#D9CEBA] rounded-xl flex items-center justify-between text-[10px] text-stone-600">
          <div className="flex items-center gap-1.5 truncate">
            {selectedPlatform === 'mobile' ? (
              <Smartphone className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            )}
            <span className="truncate">Client: <strong>{currentDevice.deviceName}</strong></span>
          </div>
          <span className="font-mono text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold shrink-0">
            {selectedPlatform === 'mobile' ? '1-Phone Policy' : 'Multi-Terminal'}
          </span>
        </div>

      </div>

      {/* Biometric Verification Modal */}
      {showBiometricModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowBiometricModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6EE] border border-[#CDBE9F] rounded-3xl p-6 shadow-2xl max-w-xs sm:max-w-sm w-full space-y-4 text-center relative overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowBiometricModal(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Title */}
            <div className="space-y-1 pt-1">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-900 border-2 border-amber-300 flex items-center justify-center shadow-md">
                <Fingerprint className="w-8 h-8 text-amber-800" />
              </div>
              <h3 className="text-base font-black text-stone-900 tracking-tight pt-1">
                Biometric Login
              </h3>
              <p className="text-xs text-stone-600 font-medium px-1">
                {biometricStatusMsg}
              </p>
            </div>

            {/* Scanner Visual Container */}
            <div className="py-3 flex flex-col items-center justify-center">
              {biometricScanning ? (
                <div className="relative flex items-center justify-center w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-amber-800 animate-spin" />
                  <div className="w-16 h-16 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-800 animate-pulse">
                    <ScanFace className="w-10 h-10" />
                  </div>
                </div>
              ) : biometricSuccess ? (
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center shadow-md animate-in zoom-in-75 duration-200">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              ) : (
                <div className="flex gap-2.5 justify-center w-full">
                  <button
                    type="button"
                    onClick={() => handleExecuteBiometricScan('fingerprint')}
                    className="flex-1 py-3 px-2 bg-white hover:bg-amber-100/70 border border-[#CDBE9F] hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
                  >
                    <Fingerprint className="w-7 h-7 text-amber-800 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-extrabold text-stone-900">Touch Sensor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteBiometricScan('face')}
                    className="flex-1 py-3 px-2 bg-white hover:bg-amber-100/70 border border-[#CDBE9F] hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-2xs"
                  >
                    <ScanFace className="w-7 h-7 text-amber-800 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-extrabold text-stone-900">Scan Face ID</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cancel Action */}
            {!biometricScanning && !biometricSuccess && (
              <button
                type="button"
                onClick={() => setShowBiometricModal(false)}
                className="w-full py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Use Username & Password
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

