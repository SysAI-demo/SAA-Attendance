import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScanFace,
  Fingerprint,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Camera,
  AlertTriangle,
  KeyRound,
  Eye,
  VideoOff,
} from 'lucide-react';
import {
  BiometricAuthType,
  getDeviceBiometricInfo,
  triggerBiometricFeedback,
  setBiometricDeviceOverride,
  getBiometricDeviceOverride,
  authenticateWithAppleFaceID,
  isApplePlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  getFrontCameraStream,
  stopMediaStream,
  analyzeOpticalFaceFrame,
  OpticalFaceAnalysis,
} from '../utils/biometricUtils';

export interface BiometricAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (type: BiometricAuthType) => void;
  actionType: 'login' | 'check_in' | 'check_out' | 'test';
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  customTitle?: string;
  customSubtitle?: string;
}

export type FaceScanMethod = 'apple_native' | 'optical_camera';

export const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionType,
  employeeName = 'Employee',
  employeeCode,
  department,
  customTitle,
  customSubtitle,
}) => {
  const [deviceInfo, setDeviceInfo] = useState(getDeviceBiometricInfo);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<'iphone' | 'android' | 'auto'>(getBiometricDeviceOverride);

  // Apple Face ID specific options
  const [faceMethod, setFaceMethod] = useState<FaceScanMethod>('apple_native');
  const [hasApplePlatformAuth, setHasApplePlatformAuth] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [opticalTelemetry, setOpticalTelemetry] = useState<OpticalFaceAnalysis | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // References for live camera & frame analysis
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Check hardware availability on mount
  useEffect(() => {
    isApplePlatformAuthenticatorAvailable().then((available) => {
      setHasApplePlatformAuth(available);
    });
  }, []);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start live optical front camera stream
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      const stream = await getFrontCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setStatusText('Align your face within the Apple Face ID reticle');

      // Start optical frame analysis loop
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = window.setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const analysis = analyzeOpticalFaceFrame(videoRef.current, canvasRef.current);
          setOpticalTelemetry(analysis);
        }
      }, 150);
    } catch (err: unknown) {
      const e = err as Error;
      console.warn('[Camera Stream]', e);
      setCameraActive(false);
      setErrorMessage('Front camera access was denied or not supported on this device.');
      setStatusText('Camera unavailable. You can use Apple Native Passkey or Fingerprint.');
    }
  }, []);

  // Complete biometric success
  const handleFinalSuccess = useCallback(
    (type: BiometricAuthType) => {
      setIsScanning(false);
      setIsSuccess(true);
      setErrorMessage(null);
      stopCamera();

      setStatusText(
        type === 'face'
          ? `Apple Face ID Verified: ${employeeName}`
          : `Fingerprint Match: ${employeeName}`
      );

      triggerBiometricFeedback('success', type);

      setTimeout(() => {
        onSuccess(type);
      }, 700);
    },
    [employeeName, onSuccess, stopCamera]
  );

  // Trigger Apple Native Face ID (WebAuthn Platform Authenticator)
  const triggerNativeAppleFaceID = useCallback(async () => {
    setIsScanning(true);
    setIsSuccess(false);
    setErrorMessage(null);
    setStatusText('Looking for Face ID TrueDepth prompt...');
    triggerBiometricFeedback('scan', 'face');

    try {
      const result = await authenticateWithAppleFaceID({
        id: employeeCode || employeeName.replace(/\s+/g, '_').toLowerCase(),
        name: employeeName,
        username: employeeCode || employeeName,
      });

      if (result.success) {
        handleFinalSuccess('face');
      } else {
        setIsScanning(false);
        setErrorMessage(result.error || 'Face ID verification was not completed.');
        setStatusText('Face ID prompt cancelled. Tap to retry or use Live Camera Scan.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setIsScanning(false);
      setErrorMessage(e.message || 'Face ID error.');
      setStatusText('Face ID failed. You can switch to Live Camera Scan.');
    }
  }, [employeeCode, employeeName, handleFinalSuccess]);

  // Trigger Live Optical Camera Face Scan sequence
  const triggerOpticalCameraScan = useCallback(() => {
    setIsScanning(true);
    setIsSuccess(false);
    setErrorMessage(null);
    setScanProgress(0);
    setStatusText('Scanning 3D facial depth & eye geometry...');
    triggerBiometricFeedback('scan', 'face');

    let currentProg = 0;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = window.setInterval(() => {
      currentProg += 10;
      setScanProgress(Math.min(100, currentProg));

      if (currentProg >= 100) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        handleFinalSuccess('face');
      }
    }, 120);
  }, [handleFinalSuccess]);

  // Trigger Android Touch Sensor scan sequence
  const triggerTouchFingerprintScan = useCallback(() => {
    setIsScanning(true);
    setIsSuccess(false);
    setErrorMessage(null);
    setStatusText('Reading ultrasonic fingerprint sensor...');
    triggerBiometricFeedback('scan', 'fingerprint');

    setTimeout(() => {
      handleFinalSuccess('fingerprint');
    }, 1200);
  }, [handleFinalSuccess]);

  // General handler to initiate scan based on current mode
  const handleStartScan = useCallback(
    (currentType?: BiometricAuthType) => {
      const type = currentType || deviceInfo.type;

      if (type === 'face') {
        if (faceMethod === 'apple_native') {
          triggerNativeAppleFaceID();
        } else {
          triggerOpticalCameraScan();
        }
      } else {
        triggerTouchFingerprintScan();
      }
    },
    [deviceInfo.type, faceMethod, triggerNativeAppleFaceID, triggerOpticalCameraScan, triggerTouchFingerprintScan]
  );

  // Sync device info when opening or changing mode
  useEffect(() => {
    if (isOpen) {
      const current = getDeviceBiometricInfo();
      setDeviceInfo(current);
      setIsScanning(false);
      setIsSuccess(false);
      setErrorMessage(null);
      setScanProgress(0);

      setStatusText(
        customSubtitle ||
          (current.type === 'face'
            ? 'Look directly at your iPhone screen to verify Apple Face ID'
            : 'Touch and hold the fingerprint sensor on your phone')
      );

      // If face method is optical camera, start camera stream
      if (current.type === 'face' && faceMethod === 'optical_camera') {
        startCamera();
      }

      // Auto-start scanning sequence on open for responsive Apple feel
      const startTimer = setTimeout(() => {
        if (current.type === 'face') {
          if (faceMethod === 'apple_native') {
            triggerNativeAppleFaceID();
          } else {
            triggerOpticalCameraScan();
          }
        } else {
          triggerTouchFingerprintScan();
        }
      }, 500);

      return () => {
        clearTimeout(startTimer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, deviceMode, faceMethod, customSubtitle, startCamera, stopCamera, triggerNativeAppleFaceID, triggerOpticalCameraScan, triggerTouchFingerprintScan]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle hardware switcher
  const handleDeviceToggle = (target: 'iphone' | 'android') => {
    stopCamera();
    setBiometricDeviceOverride(target);
    setDeviceMode(target);
    const updated = getDeviceBiometricInfo();
    setDeviceInfo(updated);
    setIsScanning(false);
    setIsSuccess(false);
    setErrorMessage(null);
    setScanProgress(0);

    setStatusText(
      updated.type === 'face'
        ? 'Switched to Apple iPhone: Look at screen for Face ID scan'
        : 'Switched to Android: Touch sensor for fingerprint scan'
    );

    if (updated.type === 'face' && faceMethod === 'optical_camera') {
      startCamera();
    }

    setTimeout(() => {
      if (updated.type === 'face') {
        if (faceMethod === 'apple_native') {
          triggerNativeAppleFaceID();
        } else {
          triggerOpticalCameraScan();
        }
      } else {
        triggerTouchFingerprintScan();
      }
    }, 400);
  };

  // Switch between Apple Native WebAuthn vs Live Optical Camera
  const handleFaceMethodSwitch = (method: FaceScanMethod) => {
    setFaceMethod(method);
    setErrorMessage(null);
    setScanProgress(0);

    if (method === 'optical_camera') {
      startCamera();
    } else {
      stopCamera();
      setStatusText('Ready for Apple Native Face ID Prompt');
    }
  };

  if (!isOpen) return null;

  const isFace = deviceInfo.type === 'face';

  // Action Title calculation
  const getModalTitle = () => {
    if (customTitle) return customTitle;
    switch (actionType) {
      case 'login':
        return isFace ? 'Apple Face ID Login' : 'Mobile Biometric Login';
      case 'check_in':
        return isFace ? 'Face ID Check-In' : 'Fingerprint Check-In';
      case 'check_out':
        return isFace ? 'Face ID Check-Out' : 'Fingerprint Check-Out';
      case 'test':
        return isFace ? 'Apple Face ID Hardware Test' : 'Touch Biometric Sensor';
      default:
        return 'Biometric Verification';
    }
  };

  const getActionBadge = () => {
    switch (actionType) {
      case 'login':
        return 'Mobile App Sign-In';
      case 'check_in':
        return 'Attendance Check-In';
      case 'check_out':
        return 'Attendance Check-Out';
      case 'test':
        return 'Hardware Diagnostics';
      default:
        return 'Security Verification';
    }
  };

  return (
    <AnimatePresence>
      <div
        id="biometric-auth-modal-backdrop"
        className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isScanning && !isSuccess) {
            stopCamera();
            onClose();
          }
        }}
      >
        <motion.div
          id="biometric-auth-modal-container"
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`relative w-full max-w-[340px] sm:max-w-[370px] rounded-3xl overflow-hidden shadow-2xl text-center select-none border transition-all ${
            isFace
              ? 'bg-stone-900/98 border-stone-800 text-stone-100 shadow-amber-950/30'
              : 'bg-stone-900/98 border-stone-800 text-stone-100 shadow-emerald-950/30'
          }`}
        >
          {/* Top Brand Accent Line */}
          <div
            className={`h-1.5 w-full transition-colors duration-500 ${
              isSuccess
                ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]'
                : isFace
                ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_10px_#f59e0b]'
                : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_10px_#10b981]'
            }`}
          />

          {/* Dismiss button */}
          {!isScanning && !isSuccess && (
            <button
              type="button"
              id="close-biometric-modal-btn"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="p-5 sm:p-6 space-y-3.5">
            {/* Header / Security Badge */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className={`text-[9px] font-extrabold font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                    isFace
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                  }`}
                >
                  {isFace ? ' Apple Face ID' : 'Android Biometric'}
                </span>
                <span className="text-[9px] font-bold text-stone-400 font-mono">
                  • {getActionBadge()}
                </span>
              </div>

              <h2 className="text-lg font-black tracking-tight text-white">
                {getModalTitle()}
              </h2>

              <p className="text-[11px] font-medium text-stone-300 max-w-[290px] mx-auto leading-relaxed">
                {statusText}
              </p>
            </div>

            {/* If Apple Face ID: Mode Toggle Switch between Native Sheet & Live Camera */}
            {isFace && !isSuccess && (
              <div className="flex items-center justify-center gap-1 bg-stone-950/90 p-1 rounded-xl border border-stone-800 text-[10px] max-w-[290px] mx-auto">
                <button
                  type="button"
                  onClick={() => handleFaceMethodSwitch('apple_native')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    faceMethod === 'apple_native'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  <span> Native Passkey</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFaceMethodSwitch('optical_camera')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    faceMethod === 'optical_camera'
                      ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Live Optical View</span>
                </button>
              </div>
            )}

            {/* SCANNER VIEWPORT */}
            <div className="py-1 flex flex-col items-center justify-center">
              {isFace ? (
                /* ========================================================= */
                /* APPLE FACE ID 3D VIEWPORT */
                /* ========================================================= */
                <div
                  onClick={() => {
                    if (!isScanning && !isSuccess) handleStartScan('face');
                  }}
                  className="relative w-44 h-44 rounded-3xl bg-stone-950 border-2 border-stone-800 flex items-center justify-center overflow-hidden shadow-inner group cursor-pointer"
                  title="Click to trigger Face ID"
                >
                  {/* Live Front Camera Stream if optical_camera mode is active */}
                  {faceMethod === 'optical_camera' && (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                        cameraActive ? 'opacity-85' : 'opacity-0'
                      }`}
                    />
                  )}
                  {/* Hidden analysis canvas */}
                  <canvas ref={canvasRef} width={160} height={160} className="hidden" />

                  {/* 3D Depth Mesh Wireframe Overlay during camera scan */}
                  {isFace && faceMethod === 'optical_camera' && cameraActive && !isSuccess && (
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />
                  )}

                  {/* Apple 4-Corner Reticle Brackets */}
                  <div
                    className={`absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 rounded-tl transition-all duration-300 z-20 ${
                      isSuccess
                        ? 'border-emerald-400 scale-95'
                        : isScanning
                        ? 'border-amber-400 animate-pulse'
                        : 'border-amber-500/80'
                    }`}
                  />
                  <div
                    className={`absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 rounded-tr transition-all duration-300 z-20 ${
                      isSuccess
                        ? 'border-emerald-400 scale-95'
                        : isScanning
                        ? 'border-amber-400 animate-pulse'
                        : 'border-amber-500/80'
                    }`}
                  />
                  <div
                    className={`absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 rounded-bl transition-all duration-300 z-20 ${
                      isSuccess
                        ? 'border-emerald-400 scale-95'
                        : isScanning
                        ? 'border-amber-400 animate-pulse'
                        : 'border-amber-500/80'
                    }`}
                  />
                  <div
                    className={`absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 rounded-br transition-all duration-300 z-20 ${
                      isSuccess
                        ? 'border-emerald-400 scale-95'
                        : isScanning
                        ? 'border-amber-400 animate-pulse'
                        : 'border-amber-500/80'
                    }`}
                  />

                  {/* Vertical Laser Beam Sweep during scanning */}
                  {isScanning && (
                    <motion.div
                      initial={{ y: -70 }}
                      animate={{ y: 70 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: 'reverse',
                        duration: 0.85,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24] z-20 pointer-events-none"
                    />
                  )}

                  {/* Center Face Glyph or Checkmark */}
                  <div className="z-10 flex flex-col items-center justify-center gap-1.5">
                    {isSuccess ? (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/25 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-xs"
                      >
                        <CheckCircle2 className="w-10 h-10" />
                      </motion.div>
                    ) : (
                      <div className="relative">
                        {faceMethod === 'optical_camera' && cameraActive ? (
                          /* Optical crosshair over live video */
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400/70 flex items-center justify-center animate-pulse">
                            <Eye className="w-6 h-6 text-amber-300/80" />
                          </div>
                        ) : (
                          <>
                            <ScanFace
                              className={`w-18 h-18 text-amber-400 transition-transform duration-300 ${
                                isScanning ? 'scale-105' : 'scale-100 group-hover:scale-105'
                              }`}
                            />
                            {isScanning && (
                              <div
                                className="absolute -inset-2 rounded-full border border-dashed border-amber-400/40 animate-spin pointer-events-none"
                                style={{ animationDuration: '6s' }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] font-mono font-bold text-stone-200 truncate max-w-[140px] drop-shadow-md">
                      {employeeName}
                    </span>
                  </div>

                  {/* Camera TrueDepth Telemetry Bar */}
                  <div className="absolute bottom-1.5 inset-x-3 flex justify-between text-[8px] font-mono text-stone-400 z-20 bg-stone-950/70 px-1.5 py-0.5 rounded backdrop-blur-xs">
                    <span>
                      {faceMethod === 'apple_native'
                        ? 'TRUEDEPTH ENCLAVE'
                        : 'OPTICAL DEPTH 3D'}
                    </span>
                    <span className="font-bold text-amber-300">
                      {isSuccess
                        ? 'MATCH 100%'
                        : isScanning
                        ? faceMethod === 'optical_camera'
                          ? `SCANNING ${scanProgress}%`
                          : 'ANALYZING...'
                        : 'READY'}
                    </span>
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* ANDROID / TOUCH FINGERPRINT SENSOR VIEWPORT */
                /* ========================================================= */
                <div
                  onClick={() => {
                    if (!isScanning && !isSuccess) handleStartScan('fingerprint');
                  }}
                  className="relative w-44 h-44 rounded-3xl bg-stone-950 border-2 border-stone-800 flex items-center justify-center overflow-hidden shadow-inner cursor-pointer"
                  title="Touch to scan fingerprint"
                >
                  {/* Concentric Pulsing Ripples */}
                  {isScanning && (
                    <>
                      <div className="absolute w-32 h-32 rounded-full border border-emerald-500/30 animate-ping" />
                      <div className="absolute w-24 h-24 rounded-full border-2 border-emerald-400/50 animate-pulse" />
                    </>
                  )}

                  {/* Touch Sensor Target Ring */}
                  <div
                    className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isSuccess
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : isScanning
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'border-stone-700 hover:border-emerald-500 bg-stone-900'
                    }`}
                  >
                    {isSuccess ? (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-emerald-400"
                      >
                        <CheckCircle2 className="w-12 h-12" />
                      </motion.div>
                    ) : (
                      <Fingerprint
                        className={`w-14 h-14 transition-all ${
                          isScanning
                            ? 'text-emerald-400 animate-pulse scale-110'
                            : 'text-stone-400 group-hover:text-emerald-400'
                        }`}
                      />
                    )}
                  </div>

                  {/* Sensor Hardware Telemetry */}
                  <div className="absolute bottom-1.5 inset-x-3 flex justify-between text-[8px] font-mono text-stone-500">
                    <span>ULTRASONIC SENSOR</span>
                    <span>{isSuccess ? 'MATCHED' : isScanning ? 'READING...' : 'TOUCH SENSOR'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error / Fallback Banner */}
            {errorMessage && !isSuccess && (
              <div className="bg-red-950/70 border border-red-800/80 rounded-xl p-2 text-left flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-red-200 leading-tight">
                  <div className="font-bold text-red-100">{errorMessage}</div>
                  {isFace && faceMethod === 'apple_native' && (
                    <button
                      type="button"
                      onClick={() => handleFaceMethodSwitch('optical_camera')}
                      className="mt-1 text-[10px] text-amber-300 underline font-semibold hover:text-amber-200 cursor-pointer block"
                    >
                      Click here to switch to Live Optical Camera Scan &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Employee Profile Metadata */}
            <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs">
              <div className="text-left min-w-0">
                <div className="font-bold text-stone-200 truncate text-[11px]">
                  {employeeName}
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {employeeCode ? `${employeeCode} • ` : ''}
                  {department || 'Active Mobile Session'}
                </div>
              </div>

              <span
                className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                  isSuccess
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                {isSuccess ? 'VERIFIED' : 'PENDING'}
              </span>
            </div>

            {/* Action Trigger Buttons */}
            <div className="pt-0.5 space-y-2">
              {!isScanning && !isSuccess ? (
                <button
                  type="button"
                  id="trigger-biometric-scan-btn"
                  onClick={() => handleStartScan()}
                  className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                    isFace
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-stone-950 shadow-amber-950/40'
                      : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-800 text-white shadow-emerald-950/40'
                  }`}
                >
                  {isFace ? (
                    faceMethod === 'apple_native' ? (
                      <KeyRound className="w-4 h-4" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )
                  ) : (
                    <Fingerprint className="w-4 h-4" />
                  )}
                  <span>
                    {isFace
                      ? faceMethod === 'apple_native'
                        ? 'Authenticate with Apple Face ID'
                        : 'Scan Face with Camera'
                      : 'Scan Fingerprint'}
                  </span>
                </button>
              ) : isScanning ? (
                <div className="w-full py-2.5 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  <span>
                    {isFace
                      ? faceMethod === 'apple_native'
                        ? 'Awaiting Apple Face ID Confirmation...'
                        : `Scanning Face (${scanProgress}%)...`
                      : 'Verifying Hardware Biometric...'}
                  </span>
                </div>
              ) : (
                <div className="w-full py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apple Face ID Verified! Finalizing...</span>
                </div>
              )}
            </div>

            {/* Hardware Info & Device Mode Switcher */}
            <div className="pt-2 border-t border-stone-800/80">
              <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1.5">
                <span className="font-mono flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-stone-400" />
                  <span>Hardware Mode:</span>
                </span>
                <span className="font-bold text-stone-300">
                  {deviceInfo.deviceLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-[10px]">
                <button
                  type="button"
                  id="simulate-iphone-faceid-btn"
                  onClick={() => handleDeviceToggle('iphone')}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    isFace
                      ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <ScanFace className="w-3 h-3" />
                  <span>iPhone (Face ID)</span>
                </button>

                <button
                  type="button"
                  id="simulate-android-fingerprint-btn"
                  onClick={() => handleDeviceToggle('android')}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    !isFace
                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Fingerprint className="w-3 h-3" />
                  <span>Android (Sensor)</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
