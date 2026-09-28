import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
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
  Sparkles,
} from 'lucide-react';
import { EmployeeDeviceBinding } from '../types';
import { useDeviceType } from '../hooks/useDeviceType';
import { BiometricAuthModal } from './BiometricAuthModal';
import { getDeviceBiometricInfo, isIPhoneDevice } from '../utils/biometricUtils';

interface EmployeeLoginProps {
  onLoginSuccess?: () => void;
  isMobileScreen?: boolean;
}

export const EmployeeLogin: React.FC<EmployeeLoginProps> = ({
  onLoginSuccess,
  isMobileScreen: propIsMobile,
}) => {
  const { t, isRTL } = useLanguage();
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
  const [pendingLoginEmp, setPendingLoginEmp] = useState<{
    id: string;
    username: string;
    password: string;
    name: string;
    employeeCode: string;
    department?: string;
  } | null>(null);
  const [selectedBiometricUsername, setSelectedBiometricUsername] = useState<string>(() => {
    return localStorage.getItem('saata_biometric_user') || 'danish';
  });

  const bioInfo = getDeviceBiometricInfo();
  const isIPhone = bioInfo.isIPhone;

  // Trigger One-Touch Biometric Sign-In on mobile
  const handleBiometricLoginTrigger = () => {
    setError(null);
    setDeviceMismatchInfo(null);

    const savedUser = localStorage.getItem('saata_biometric_user') || username.trim() || selectedBiometricUsername || employees[0]?.username || 'admin';
    const cleanSaved = savedUser.toLowerCase();
    const targetEmp = employees.find((e) =>
      e.username?.toLowerCase() === cleanSaved ||
      e.email?.toLowerCase() === cleanSaved ||
      e.employeeCode?.toLowerCase() === cleanSaved ||
      (cleanSaved === 'danish' && e.name.toLowerCase().includes('danish')) ||
      (cleanSaved === 'admin' && e.role === 'admin')
    ) || employees[0];

    if (!targetEmp) {
      setError('No employee account available for biometric login.');
      return;
    }

    setPendingLoginEmp({
      id: targetEmp.id,
      username: targetEmp.username || targetEmp.email || 'user',
      password: targetEmp.password || 'password123',
      name: targetEmp.name,
      employeeCode: targetEmp.employeeCode || targetEmp.id,
      department: targetEmp.department,
    });
    setShowBiometricModal(true);
  };

  // Form submit: on mobile, biometric verification is mandatory before session access
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      setDeviceMismatchInfo(null);
      return;
    }

    setError(null);
    setDeviceMismatchInfo(null);

    // If mobile platform, authenticate credentials then require hardware biometric verification
    if (selectedPlatform === 'mobile') {
      const cleanU = username.trim().toLowerCase();
      const matchedEmp = employees.find((e) =>
        e.username?.toLowerCase() === cleanU ||
        e.email?.toLowerCase() === cleanU ||
        e.employeeCode?.toLowerCase() === cleanU ||
        (cleanU === 'danish' && e.name.toLowerCase().includes('danish')) ||
        (cleanU === 'admin' && e.role === 'admin')
      );
      if (!matchedEmp) {
        setError('Invalid username or account not found.');
        return;
      }
      if (matchedEmp.password && matchedEmp.password !== password) {
        setError('Incorrect password. Please verify your credentials.');
        return;
      }

      // Valid credentials: trigger mandatory phone biometric verification (Face ID for iPhone, Fingerprint for others)
      setPendingLoginEmp({
        id: matchedEmp.id,
        username: username.trim(),
        password: password,
        name: matchedEmp.name,
        employeeCode: matchedEmp.employeeCode || matchedEmp.id,
        department: matchedEmp.department,
      });
      setShowBiometricModal(true);
      return;
    }

    // Desktop platform: standard direct password sign-in
    setLoading(true);
    setTimeout(() => {
      const res = login(username.trim(), password, { forcePlatform: 'desktop' });
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

  // Callback when biometric verification succeeds in modal
  const handleBiometricSuccess = (verifiedBioType: 'face' | 'fingerprint') => {
    if (!pendingLoginEmp) return;

    const res = login(pendingLoginEmp.username, pendingLoginEmp.password, { forcePlatform: 'mobile' });
    if (res.success) {
      const loggedEmp = employees.find((e) => e.username === pendingLoginEmp.username);
      if (loggedEmp) {
        localStorage.setItem(`saata_biometric_enabled_${loggedEmp.id}`, 'true');
      }
      localStorage.setItem('saata_biometric_enabled', 'true');
      localStorage.setItem('saata_biometric_user', pendingLoginEmp.username);
      localStorage.setItem('saata_biometric_pass', pendingLoginEmp.password);
      localStorage.setItem('saata_biometric_type', verifiedBioType);

      setShowBiometricModal(false);
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setShowBiometricModal(false);
      setError(res.message || 'Biometric authentication failed or device mismatch.');
      if (res.isDeviceMismatch) {
        setDeviceMismatchInfo({
          registered: res.registeredDevice,
          current: res.currentDevice,
        });
      }
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center font-sans select-none px-4 py-8 bg-[#07090E]">
      {/* Heritage Desert Oasis Line Art Background in Dark Theme */}
      <DesertOasisBackground theme="dark" />

      {/* Main Glassmorphic Login Card */}
      <div className={`relative z-10 w-full max-w-[385px] sm:max-w-[430px] bg-[#121622]/92 border border-[#C5A265]/35 rounded-3xl shadow-2xl shadow-black/80 p-6 sm:p-8 backdrop-blur-xl transition-all flex flex-col items-center ${isRTL ? 'font-arabic' : ''}`}>
        
        {/* Language Switcher bar at top of card */}
        <div className="w-full mb-5">
          <LanguageSwitcher variant="login" theme="dark" />
        </div>

        {/* Brand Logo & Header */}
        <div className="mb-4 flex flex-col items-center text-center">
          {/* Logo in top container */}
          <div className="p-3.5 rounded-2xl bg-[#1A202F]/90 border border-[#C5A265]/30 shadow-inner flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="SAA Time and Attendance Logo"
              className="h-16 w-auto max-w-[170px] object-contain drop-shadow-2xs"
            />
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-stone-100">
              SAA Time & Attendance
            </h1>
          </div>
        </div>

        {/* 1-Device Mobile Policy Security Alert */}
        {deviceMismatchInfo && (
          <div className="w-full mb-4 p-3.5 bg-rose-950/70 border border-rose-800 rounded-2xl text-rose-100 text-xs shadow-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-300 font-extrabold text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>1-Mobile-Device Policy Enforced</span>
            </div>
            <p className="text-[11px] text-rose-200 leading-relaxed font-medium">
              Mobile application access is strictly restricted to <strong>1 authorized mobile phone</strong>. This employee profile is already mapped to another phone.
            </p>
            <div className="bg-rose-900/40 border border-rose-700/50 rounded-xl p-2.5 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-rose-200">
                <span className="font-semibold text-rose-300">Registered Phone:</span>
                <span className="font-mono text-white font-bold truncate max-w-[170px]">
                  {deviceMismatchInfo.registered?.deviceName || 'Authorized Mobile Device'}
                </span>
              </div>
              <div className="flex items-center justify-between text-rose-300/80">
                <span>Attempted Phone:</span>
                <span className="font-mono truncate max-w-[170px] text-rose-300 font-bold">
                  {currentDevice?.deviceName || 'This Browser'}
                </span>
              </div>
            </div>
            <div className="bg-[#1A1814] border border-amber-700/50 rounded-xl p-2 text-[10px] text-amber-300 font-medium space-y-1">
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
          <div className="w-full mb-4 p-3 bg-rose-950/80 border border-rose-800/90 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[12px] font-medium leading-snug">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Standard Corporate Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {/* USERNAME Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="text-[11px] font-extrabold text-stone-300 uppercase tracking-wider block"
            >
              Username
            </label>
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400">
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
                placeholder="Enter username"
                autoComplete="off"
                className="w-full bg-[#171D2B]/90 border border-[#2B3549] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 font-medium pl-10 pr-3 py-2.5 focus:outline-hidden transition-all shadow-inner"
              />
            </div>
          </div>

          {/* PASSWORD Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="text-[11px] font-extrabold text-stone-300 uppercase tracking-wider block"
            >
              Password
            </label>
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400">
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
                className="w-full bg-[#171D2B]/90 border border-[#2B3549] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 font-medium pl-10 pr-10 py-2.5 focus:outline-hidden transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-300 cursor-pointer p-1 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* LOGIN SUBMIT & BIOMETRIC BUTTONS */}
          <div className="pt-2 space-y-2">
            {selectedPlatform === 'mobile' && (
              /* Dedicated Mobile Hardware Biometric Sign-In Button */
              <button
                type="button"
                id="login-biometric-btn"
                onClick={handleBiometricLoginTrigger}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 border ${
                  isIPhone
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-stone-950 border-amber-300 shadow-amber-950/30'
                    : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-800 text-white border-emerald-400 shadow-emerald-950/30'
                }`}
              >
                {isIPhone ? <ScanFace className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                <span>
                  {isIPhone ? 'One-Touch Sign In with Face ID' : 'One-Touch Sign In with Fingerprint'}
                </span>
              </button>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 active:from-amber-700 active:to-amber-900 text-stone-950 py-2.5 rounded-xl text-xs sm:text-sm font-black tracking-wider uppercase shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>
                    {selectedPlatform === 'desktop'
                      ? 'Sign In to Workspace'
                      : isIPhone
                      ? 'Verify Credentials & Scan Face ID'
                      : 'Verify Credentials & Scan Fingerprint'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-stone-950" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Current Detected Hardware Tag & Biometric Notice */}
        <div className="w-full mt-3 px-3 py-2.5 bg-[#161C2A]/90 border border-[#2B3549] rounded-xl flex items-center justify-between text-[10px] text-stone-300">
          <div className="flex items-center gap-1.5 truncate">
            {selectedPlatform === 'mobile' ? (
              isIPhone ? (
                <ScanFace className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )
            ) : (
              <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="truncate">
              {selectedPlatform === 'mobile'
                ? isIPhone
                  ? 'Apple iPhone: Face ID Required'
                  : 'Mobile Phone: Fingerprint Required'
                : `Client: ${currentDevice.deviceName}`}
            </span>
          </div>
          <span
            className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
              selectedPlatform === 'mobile'
                ? isIPhone
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80'
                : 'bg-[#242D3D] text-amber-300 border border-amber-500/30'
            }`}
          >
            {selectedPlatform === 'mobile' ? (isIPhone ? ' Face ID' : 'Touch Sensor') : 'Multi-Terminal'}
          </span>
        </div>

      </div>

      {/* Device-Specific Biometric Verification Modal */}
      <BiometricAuthModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccess={handleBiometricSuccess}
        actionType="login"
        employeeName={pendingLoginEmp?.name || employees[0]?.name || 'Employee'}
        employeeCode={pendingLoginEmp?.employeeCode || employees[0]?.employeeCode}
        department={pendingLoginEmp?.department || employees[0]?.department}
        customTitle={isIPhone ? 'Apple Face ID Sign-In' : 'Mobile Biometric Sign-In'}
        customSubtitle={
          isIPhone
            ? 'Look directly at your iPhone screen to verify Apple Face ID before session grant'
            : 'Touch and hold your phone fingerprint sensor to verify identity'
        }
      />
    </div>
  );
};

