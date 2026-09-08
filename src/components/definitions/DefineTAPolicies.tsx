import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { TAPolicyDefinition } from '../../types';
import {
  SlidersHorizontal,
  Clock,
  MapPin,
  Car,
  DollarSign,
  Receipt,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

export const DefineTAPolicies: React.FC = () => {
  const { taPolicy, updateTAPolicy, resetTAPolicy } = useAttendance();

  const [formData, setFormData] = useState<TAPolicyDefinition>({ ...taPolicy });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTAPolicy(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    resetTAPolicy();
    setResetConfirm(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <form id="define-ta-policies-form" onSubmit={handleSave} className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-900">Time, Attendance & Travel Allowance (TA) Policies</h2>
          <p className="text-xs text-stone-600">
            Configure system-wide attendance thresholds, geofence strictness, grace periods, and outstation travel allowances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            id="save-ta-policies-btn"
            className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save TA Policies</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>TA Policy settings updated and saved to system definitions successfully.</span>
        </div>
      )}

      {/* Section 1: Time & Attendance Rules in List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#ede4d6] border-b border-[#ded4c5]">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Time & Attendance Policy Parameters</h3>
            <p className="text-[11px] text-stone-600">Punctuality tolerance, working hour thresholds, and GPS strictness</p>
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-[#ded4c5]">
          {/* Row 1: Grace Period */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">Late Arrival Grace Period</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  {formData.gracePeriodMinutes} mins
                </span>
              </div>
              <p className="text-xs text-stone-600">Allowed check-in buffer after shift start without being marked Late.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={formData.gracePeriodMinutes}
                onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                className="flex-1 accent-stone-900 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-stone-800 w-16 text-right">{formData.gracePeriodMinutes}m</span>
            </div>
          </div>

          {/* Row 2: Late Marks Penalty */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">Late Marks Penalty Rule</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {formData.lateMarkPenaltyCount} Lates = 0.5 Day
                </span>
              </div>
              <p className="text-xs text-stone-600">Consecutive late marks that trigger half-day salary or leave deduction.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={formData.lateMarkPenaltyCount}
                onChange={(e) => setFormData({ ...formData, lateMarkPenaltyCount: Number(e.target.value) })}
                className="flex-1 accent-stone-900 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-stone-800 w-16 text-right">{formData.lateMarkPenaltyCount} times</span>
            </div>
          </div>

          {/* Row 3: GPS Accuracy Tolerance */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">GPS Accuracy Threshold</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  ≤ {formData.gpsAccuracyToleranceMeters}m
                </span>
              </div>
              <p className="text-xs text-stone-600">Maximum allowable mobile GPS drift before requesting re-calibration.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={150}
                step={10}
                value={formData.gpsAccuracyToleranceMeters}
                onChange={(e) => setFormData({ ...formData, gpsAccuracyToleranceMeters: Number(e.target.value) })}
                className="flex-1 accent-stone-900 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-stone-800 w-16 text-right">±{formData.gpsAccuracyToleranceMeters}m</span>
            </div>
          </div>

          {/* Row 4: Half-Day Minimum Hours */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Minimum Hours for Half-Day</span>
              <p className="text-xs text-stone-600">Required logged duration to avoid full day absent mark.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min={2}
                max={6}
                value={formData.halfDayMinimumHours}
                onChange={(e) => setFormData({ ...formData, halfDayMinimumHours: Number(e.target.value) })}
                className="w-24 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs font-semibold text-stone-600">Hours required</span>
            </div>
          </div>

          {/* Row 5: Full-Day Minimum Hours */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Minimum Hours for Full-Day</span>
              <p className="text-xs text-stone-600">Full shift net working hours requirement.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min={6}
                max={12}
                value={formData.fullDayMinimumHours}
                onChange={(e) => setFormData({ ...formData, fullDayMinimumHours: Number(e.target.value) })}
                className="w-24 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs font-semibold text-stone-600">Hours required</span>
            </div>
          </div>

          {/* Row 6: Overtime Minimum Minutes */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Overtime (OT) Activation Threshold</span>
              <p className="text-xs text-stone-600">Minutes past shift end before overtime starts accruing.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <input
                type="number"
                step="15"
                min={15}
                max={180}
                value={formData.overtimeMinMinutes}
                onChange={(e) => setFormData({ ...formData, overtimeMinMinutes: Number(e.target.value) })}
                className="w-24 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs font-semibold text-stone-600">Minutes past shift end</span>
            </div>
          </div>

          {/* Row 7: System Attendance Toggles */}
          <div className="p-4 sm:p-5 space-y-3 bg-white/60">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">Operational Enforcement Rules</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between bg-white border border-[#ded4c5] rounded-xl p-3 cursor-pointer hover:bg-[#f8f5ef] transition-colors">
                <div className="pr-3">
                  <span className="block font-bold text-stone-900 text-xs">Strict Geofence Enforcement</span>
                  <span className="text-[11px] text-stone-500">Block check-in if user is outside allowed perimeter</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.strictGeofenceEnforcement}
                  onChange={(e) => setFormData({ ...formData, strictGeofenceEnforcement: e.target.checked })}
                  className="w-5 h-5 accent-stone-900 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between bg-white border border-[#ded4c5] rounded-xl p-3 cursor-pointer hover:bg-[#f8f5ef] transition-colors">
                <div className="pr-3">
                  <span className="block font-bold text-stone-900 text-xs">Auto Check-Out at Midnight</span>
                  <span className="text-[11px] text-stone-500">Automatically close open sessions at 23:59:59</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoCheckoutAtMidnight}
                  onChange={(e) => setFormData({ ...formData, autoCheckoutAtMidnight: e.target.checked })}
                  className="w-5 h-5 accent-stone-900 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between bg-white border border-[#ded4c5] rounded-xl p-3 cursor-pointer hover:bg-[#f8f5ef] transition-colors">
                <div className="pr-3">
                  <span className="block font-bold text-stone-900 text-xs">Auto Comp-Off on Weekend Attendance</span>
                  <span className="text-[11px] text-stone-500">Credit 1 Compensatory leave balance for weekend work</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.weekendWorkAutoCompOff}
                  onChange={(e) => setFormData({ ...formData, weekendWorkAutoCompOff: e.target.checked })}
                  className="w-5 h-5 accent-stone-900 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between bg-white border border-[#ded4c5] rounded-xl p-3 cursor-pointer hover:bg-[#f8f5ef] transition-colors">
                <div className="pr-3">
                  <span className="block font-bold text-stone-900 text-xs">Biometric / Kiosk Bypass Allowed</span>
                  <span className="text-[11px] text-stone-500">Allow direct punch via authorized office tablet terminal</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowBiometricBypass}
                  onChange={(e) => setFormData({ ...formData, allowBiometricBypass: e.target.checked })}
                  className="w-5 h-5 accent-stone-900 cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Travel & Daily Allowance (TA/DA) Rules in List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#ede4d6] border-b border-[#ded4c5]">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center">
            <Car className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Travel & Daily Allowance (TA / DA) Rates & Claims</h3>
            <p className="text-[11px] text-stone-600">Official outstation travel, daily per diems, mileage reimbursement, and claim parameters</p>
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-[#ded4c5]">
          {/* Row 1: Metro Per Diem */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Daily Per Diem (Metro / Tier 1)</span>
              <p className="text-xs text-stone-600">Major metropolitan cities (NYC, SF, London, Tokyo).</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <span className="text-stone-400 font-bold">$</span>
              <input
                type="number"
                min={0}
                value={formData.dailyAllowanceMetro}
                onChange={(e) => setFormData({ ...formData, dailyAllowanceMetro: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">per day</span>
            </div>
          </div>

          {/* Row 2: Non-Metro Per Diem */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Daily Per Diem (Non-Metro / Tier 2)</span>
              <p className="text-xs text-stone-600">Standard regional cities and town visits.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <span className="text-stone-400 font-bold">$</span>
              <input
                type="number"
                min={0}
                value={formData.dailyAllowanceNonMetro}
                onChange={(e) => setFormData({ ...formData, dailyAllowanceNonMetro: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">per day</span>
            </div>
          </div>

          {/* Row 3: Vehicle Mileage */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Vehicle Mileage Reimbursement</span>
              <p className="text-xs text-stone-600">Fuel & vehicle wear/tear rate per mile / km.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <span className="text-stone-400 font-bold">$</span>
              <input
                type="number"
                step="0.05"
                min={0}
                value={formData.mileageRatePerKm}
                onChange={(e) => setFormData({ ...formData, mileageRatePerKm: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">per mile</span>
            </div>
          </div>

          {/* Row 4: Food Allowance */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Daily Food & Meal Allowance</span>
              <p className="text-xs text-stone-600">Per person daily breakfast, lunch, and dinner reimbursement.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <span className="text-stone-400 font-bold">$</span>
              <input
                type="number"
                min={0}
                value={formData.foodAllowancePerDay}
                onChange={(e) => setFormData({ ...formData, foodAllowancePerDay: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">per day</span>
            </div>
          </div>

          {/* Row 5: Expense Receipt Threshold & Claim Window */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Receipt Attachment Requirement Threshold</span>
              <p className="text-xs text-stone-600">Expense receipts required for any voucher amount exceeding this threshold.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <span className="text-stone-400 font-bold">$</span>
              <input
                type="number"
                min={0}
                value={formData.requireExpenseReceiptsAbove}
                onChange={(e) => setFormData({ ...formData, requireExpenseReceiptsAbove: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">and above</span>
            </div>
          </div>

          {/* Row 6: Claim Submission Window */}
          <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="md:w-1/2 space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Claim Submission Window</span>
              <p className="text-xs text-stone-600">Post-travel deadline for staff to file expense vouchers.</p>
            </div>
            <div className="md:w-1/2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={formData.claimSubmissionWindowDays}
                onChange={(e) => setFormData({ ...formData, claimSubmissionWindowDays: Number(e.target.value) })}
                className="w-28 bg-white border border-[#ded4c5] rounded-xl px-3 py-1.5 font-bold text-stone-900 text-sm focus:outline-hidden focus:border-stone-800"
              />
              <span className="text-xs text-stone-600 font-medium">Days from trip return</span>
            </div>
          </div>

          {/* Row 7: Outstation Advance Allowed Toggle */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#f1ebe0]/60 transition-colors">
            <div className="space-y-0.5">
              <span className="font-bold text-stone-900 text-sm">Outstation Travel Advance</span>
              <p className="text-xs text-stone-600">Allow employees to request cash advances prior to scheduled business travel.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.outstationAdvanceAllowed}
              onChange={(e) => setFormData({ ...formData, outstationAdvanceAllowed: e.target.checked })}
              className="w-5 h-5 accent-stone-900 cursor-pointer shrink-0"
            />
          </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-stone-900">Reset TA Policies?</h4>
              <p className="text-xs text-stone-600">
                This will reset all attendance tolerance parameters and travel allowance rates back to corporate factory defaults.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="flex-1 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-xs"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
