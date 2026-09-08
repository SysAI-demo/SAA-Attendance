import React, { useState, useRef, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  LeaveType,
  PermissionType,
  LeaveDurationOption,
  LeaveDocumentAttachment,
  LeaveRequest,
  ApprovalStage,
} from '../types';
import { calculateLeaveCycle } from '../utils/leaveAnniversaryUtils';
import {
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  FileText,
  UserCheck,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Paperclip,
  Eye,
  Trash2,
  AlertCircle,
  Coffee,
  HeartPulse,
  Plane,
  SunMedium,
  Moon,
  CalendarDays,
  FileCheck,
  Download,
  Info,
  Award,
  ShieldAlert,
  Bell,
  CheckCheck,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const RequestsManager: React.FC = () => {
  const {
    currentEmployee,
    leaveRequests,
    permissionRequests,
    applyLeave,
    applyPermission,
    reviewLeave,
    reviewLeaveAsManager,
    reviewLeaveAsHR,
    reviewPermission,
    employees,
    leaveDefinitions,
    gradeDefinitions,
    pendingManagerLeaves,
    pendingHRLeaves,
    myNotifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isCurrentHR,
  } = useAttendance();

  const isManager = currentEmployee.role === 'manager' || currentEmployee.role === 'admin' || isCurrentHR;

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'apply_leave' | 'apply_permission' | 'my_requests' | 'manager_approvals'
  >(isManager ? 'manager_approvals' : 'apply_leave');

  // Approvals Subtab: manager_queue, hr_queue, perms
  const [approvalSubTab, setApprovalSubTab] = useState<'manager_queue' | 'hr_queue' | 'permissions'>('manager_queue');

  // Notification Drawer State
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Find Employee Grade and Allowed Leaves for that Grade
  const employeeGrade = gradeDefinitions?.find(
    (g) => g.id === currentEmployee.gradeId || g.gradeCode === currentEmployee.gradeId
  );

  // Filter leave definitions permitted for this employee's grade
  const allowedLeaveDefs = (leaveDefinitions || []).filter((def) => {
    if (!def.isActive) return false;
    if (!employeeGrade || !employeeGrade.allowedLeaveCodes || employeeGrade.allowedLeaveCodes.length === 0) {
      return true;
    }
    return employeeGrade.allowedLeaveCodes.includes(def.code);
  });

  // Leave Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [attachedDoc, setAttachedDoc] = useState<LeaveDocumentAttachment | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match active leave definition
  const activeLeaveDef = leaveDefinitions?.find(
    (d) =>
      (leaveType === 'casual' && d.code === 'CL') ||
      (leaveType === 'sick' && d.code === 'SL') ||
      (leaveType === 'annual' && d.code === 'AL') ||
      (leaveType === 'maternity' && d.code === 'ML') ||
      (leaveType === 'paternity' && d.code === 'PL') ||
      (leaveType === 'bereavement' && d.code === 'BL') ||
      (leaveType === 'unpaid' && (d.code === 'UL' || d.code === 'LOP')) ||
      (leaveType === 'emergency' && (d.code === 'EL' || d.code === 'EML')) ||
      d.name.toLowerCase().includes(leaveType)
  );

  // Synchronize leaveType when employee or allowedLeaveDefs change
  useEffect(() => {
    if (allowedLeaveDefs.length > 0) {
      const isCurrentlyAllowed = allowedLeaveDefs.some((d) => {
        if (leaveType === 'casual' && d.code === 'CL') return true;
        if (leaveType === 'sick' && d.code === 'SL') return true;
        if (leaveType === 'annual' && d.code === 'AL') return true;
        if (leaveType === 'maternity' && d.code === 'ML') return true;
        if (leaveType === 'paternity' && d.code === 'PL') return true;
        if (leaveType === 'bereavement' && d.code === 'BL') return true;
        if (leaveType === 'unpaid' && (d.code === 'UL' || d.code === 'LOP')) return true;
        if (leaveType === 'emergency' && (d.code === 'EL' || d.code === 'EML')) return true;
        return d.name.toLowerCase().includes(leaveType);
      });

      if (!isCurrentlyAllowed) {
        const firstDef = allowedLeaveDefs[0];
        if (firstDef.code === 'CL') setLeaveType('casual');
        else if (firstDef.code === 'SL') setLeaveType('sick');
        else if (firstDef.code === 'AL') setLeaveType('annual');
        else if (firstDef.code === 'ML') setLeaveType('maternity');
        else if (firstDef.code === 'PL') setLeaveType('paternity');
        else if (firstDef.code === 'BL') setLeaveType('bereavement');
        else if (firstDef.code === 'UL' || firstDef.code === 'LOP') setLeaveType('unpaid');
        else if (firstDef.code === 'EL' || firstDef.code === 'EML') setLeaveType('emergency');
        else setLeaveType('casual');
      }
    }
  }, [currentEmployee.id, currentEmployee.gradeId, employeeGrade?.allowedLeaveCodes, allowedLeaveDefs.length]);

  // Permission Form State
  const [permForm, setPermForm] = useState<{
    permissionType: PermissionType;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }>({
    permissionType: 'official',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:30',
    endTime: '11:30',
    reason: '',
  });

  // Manager review comment state
  const [reviewComment, setReviewComment] = useState<{ [id: string]: string }>({});
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Filters for lists
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Document Preview Modal State
  const [previewModalDoc, setPreviewModalDoc] = useState<{
    request: LeaveRequest;
    docName: string;
    docType?: string;
    dataUrl?: string;
  } | null>(null);

  // Calculate leave days based on From Date and To Date
  const calculateDays = (): number => {
    if (!startDate || !endDate) return 1.0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 1.0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  };

  // File Upload Handlers
  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedDoc({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Quick Preset Sample Documents for fast testing
  const attachPresetSample = (presetType: 'medical' | 'travel' | 'event') => {
    if (presetType === 'medical') {
      setAttachedDoc({
        name: 'Medical_Consultation_Certificate.pdf',
        size: 245000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
    } else if (presetType === 'travel') {
      setAttachedDoc({
        name: 'Flight_Confirmation_Itinerary.pdf',
        size: 412000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
    } else {
      setAttachedDoc({
        name: 'Official_Invitation_Document.pdf',
        size: 188000,
        type: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle Leave Submission
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);
    if (!description.trim()) {
      setFormValidationError('Please provide a reason / description for your leave request.');
      return;
    }

    const total = calculateDays();

    // Check policy constraints if defined
    if (activeLeaveDef) {
      // Check grade policy constraint
      if (employeeGrade && employeeGrade.allowedLeaveCodes && employeeGrade.allowedLeaveCodes.length > 0) {
        if (!employeeGrade.allowedLeaveCodes.includes(activeLeaveDef.code)) {
          setFormValidationError(
            `${activeLeaveDef.name} is not permitted for your assigned job grade (${employeeGrade.gradeName}${employeeGrade.gradeNameAr ? ` / ${employeeGrade.gradeNameAr}` : ''}).`
          );
          return;
        }
      }

      const minDays = activeLeaveDef.minDurationDays ?? (activeLeaveDef.halfDayAllowed ? 0.5 : 1);
      const maxDays = activeLeaveDef.maxDurationDays ?? activeLeaveDef.maxConsecutiveDays ?? 365;

      if (total < minDays) {
        setFormValidationError(`Minimum duration allowed for ${activeLeaveDef.name} is ${minDays} day(s).`);
        return;
      }
      if (total > maxDays) {
        setFormValidationError(`Maximum duration allowed for ${activeLeaveDef.name} is ${maxDays} days per request.`);
        return;
      }
      if (activeLeaveDef.attachmentMandatory && !attachedDoc) {
        setFormValidationError(`Supporting document / certificate attachment is mandatory for ${activeLeaveDef.name}. Please upload or attach a file.`);
        return;
      }
    }

    applyLeave({
      leaveType,
      durationOption: total > 1 ? 'multi_day' : 'full_day',
      startDate,
      endDate,
      totalDays: total,
      reason: description.trim(),
      description: description.trim(),
      emergencyContact: emergencyContact.trim() || undefined,
      documentAttachment: attachedDoc || undefined,
      documentName: attachedDoc?.name,
      documentUrl: attachedDoc?.dataUrl,
      documentSize: attachedDoc?.size,
      documentType: attachedDoc?.type,
    });

    setSuccessToast(
      `Leave request (${total} ${total === 1 ? 'day' : 'days'}) submitted successfully! Reviewed by: ${
        activeLeaveDef?.approvalBy === 'both'
          ? 'Reporting Manager & HR'
          : activeLeaveDef?.approvalBy === 'hr_only'
          ? 'HR Department'
          : 'Reporting Manager'
      }.`
    );

    // Reset Form
    setDescription('');
    setEmergencyContact('');
    setAttachedDoc(null);
    setFormValidationError(null);

    setTimeout(() => setSuccessToast(null), 4500);
    setActiveTab('my_requests');
  };

  // Calculate permission hours
  const calculateHours = () => {
    if (!permForm.startTime || !permForm.endTime) return 1;
    const [startH, startM] = permForm.startTime.split(':').map(Number);
    const [endH, endM] = permForm.endTime.split(':').map(Number);
    const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
    return Math.max(0.5, +(totalMinutes / 60).toFixed(1));
  };

  const handlePermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permForm.reason.trim()) return;

    applyPermission({
      permissionType: permForm.permissionType,
      date: permForm.date,
      startTime: permForm.startTime,
      endTime: permForm.endTime,
      durationHours: calculateHours(),
      reason: permForm.reason,
    });

    setSuccessToast('Permission request submitted successfully! Your manager has been notified.');
    setPermForm({
      permissionType: 'official',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:30',
      endTime: '11:30',
      reason: '',
    });
    setTimeout(() => setSuccessToast(null), 4000);
    setActiveTab('my_requests');
  };

  // Filtered lists
  const myLeaves = leaveRequests.filter((r) => r.employeeId === currentEmployee.id);
  const myPerms = permissionRequests.filter((r) => r.employeeId === currentEmployee.id);

  const pendingManagerCount = pendingManagerLeaves.length;
  const pendingHRCount = pendingHRLeaves.length;
  const pendingPermsAll = permissionRequests.filter((r) => r.status === 'pending');
  const pendingTotalCount = pendingManagerCount + pendingHRCount + pendingPermsAll.length;

  // Leave balance badge lookup
  const getLeaveBalanceByType = (type: LeaveType): number | null => {
    if (type === 'casual') return currentEmployee.leaveBalance?.casual ?? 0;
    if (type === 'sick') return currentEmployee.leaveBalance?.sick ?? 0;
    if (type === 'annual') return currentEmployee.leaveBalance?.annual ?? 0;
    return null;
  };

  // Friendly duration label for lists & cards
  const getDurationLabel = (req: LeaveRequest): string => {
    if (req.durationOption === 'half_day_morning') {
      return `Half Day (Morning) • 0.5 Day (${req.startDate})`;
    }
    if (req.durationOption === 'half_day_afternoon') {
      return `Half Day (Afternoon) • 0.5 Day (${req.startDate})`;
    }
    if (req.totalDays === 0.5) {
      return `Half Day • 0.5 Day (${req.startDate})`;
    }
    if (req.startDate === req.endDate || req.totalDays === 1) {
      return `Full Day • 1 Day (${req.startDate})`;
    }
    return `Multi-Day • ${req.totalDays} Days (${req.startDate} to ${req.endDate})`;
  };

  // Permission Category friendly label
  const getPermissionLabel = (type: PermissionType | string): string => {
    switch (type) {
      case 'official':
      case 'official_permission':
      case 'official_duty':
        return 'Official Permission';
      case 'hospital':
      case 'hospital_permission':
      case 'doctor_appointment':
        return 'Hospital Permission';
      case 'personal':
      case 'personal_permission':
      case 'mid_day_personal':
      case 'late_entry':
      case 'early_exit':
        return 'Personal Permission';
      case 'weather':
      case 'weather_permission':
        return 'Weather Permission';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div id="requests-manager-view" className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner / Notification Toast */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header and Tab Selector */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ded4c5] pb-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-stone-800" />
              <span>Requests & Approvals</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Submit leave with 2-stage (Manager &rarr; HR) workflow approval, upload documents, and track sign-off notifications.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setShowNotificationsModal(true)}
              className="relative p-2.5 bg-white border border-[#ded4c5] hover:bg-[#ede4d6] rounded-xl text-stone-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold shadow-2xs"
              title="View approval notifications"
            >
              <Bell className="w-4 h-4 text-stone-800" />
              <span className="hidden sm:inline">Notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Quick Leave Balance Pill & Anniversary Refill */}
            {(() => {
              const cycle = calculateLeaveCycle(currentEmployee.joinedDate);
              return (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 bg-[#ede4d6] border border-[#ded4c5] p-2 rounded-xl text-xs">
                    <div className="text-center px-2.5 border-r border-[#ded4c5]">
                      <span className="text-[10px] text-stone-500 block">Casual</span>
                      <span className="font-bold text-stone-900">{currentEmployee.leaveBalance?.casual ?? 0}d</span>
                    </div>
                    <div className="text-center px-2.5 border-r border-[#ded4c5]">
                      <span className="text-[10px] text-stone-500 block">Sick</span>
                      <span className="font-bold text-stone-900">{currentEmployee.leaveBalance?.sick ?? 0}d</span>
                    </div>
                    <div className="text-center px-2.5">
                      <span className="text-[10px] text-stone-500 block">Annual</span>
                      <span className="font-bold text-stone-900">{currentEmployee.leaveBalance?.annual ?? 0}d</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-700" />
                    <span>Annual refill: <strong>{cycle.nextAnniversaryDate}</strong> (Joined {currentEmployee.joinedDate})</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('apply_leave')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'apply_leave'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apply_permission')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'apply_permission'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Permission Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_requests')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'my_requests'
                ? 'bg-stone-900 text-stone-50 shadow-xs'
                : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Submitted Requests ({myLeaves.length + myPerms.length})</span>
          </button>

          {/* Approvals Desk Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('manager_approvals')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'manager_approvals'
                ? 'bg-amber-900 text-amber-50 shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-700" />
            <span>Approvals Desk</span>
            {pendingTotalCount > 0 && (
              <span className="bg-amber-500 text-stone-950 font-bold px-1.5 py-0.5 rounded-full text-[10px] ml-1">
                {pendingTotalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: APPLY FOR LEAVE (Leave Type, Duration, Document, Desc) */}
      {/* ============================================================ */}
      {activeTab === 'apply_leave' && (
        <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
          <div className="border-b border-[#ded4c5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-stone-700" />
                <span>Leave Application</span>
              </h2>
              <p className="text-xs text-stone-600">
                Select your permitted leave category, set the duration, upload supporting documentation, and provide description details.
              </p>
            </div>

            {/* Assigned Grade & Policy Scope Badge */}
            {employeeGrade && (
              <div className="bg-white border border-[#ded4c5] px-3 py-2 rounded-xl flex items-center gap-2 shrink-0 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: employeeGrade.color || '#0284c7' }} />
                <div className="text-left">
                  <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                    Your Assigned Grade:
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                    <span className="font-mono">{employeeGrade.gradeCode}</span>
                    <span>•</span>
                    <span>{employeeGrade.gradeName}</span>
                    {employeeGrade.gradeNameAr && (
                      <span className="text-[11px] text-stone-600 font-medium" dir="rtl">
                        ({employeeGrade.gradeNameAr})
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full ml-1 whitespace-nowrap">
                  {allowedLeaveDefs.length} Allowed
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleLeaveSubmit} className="space-y-6">
            {/* Form Validation Error Banner */}
            {formValidationError && (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start justify-between gap-2 text-xs text-rose-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formValidationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormValidationError(null)}
                  className="text-rose-500 hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 1. SELECT LEAVE TYPE (Drop Down - Filtered Strictly by Assigned Grade) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label htmlFor="leave-type-select" className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span>1. Select Leave Type</span>
                  <span className="text-rose-600 font-bold">*</span>
                  <span className="text-[10px] font-normal text-stone-500 lowercase">
                    (filtered by grade {employeeGrade?.gradeCode || ''})
                  </span>
                </label>
                {getLeaveBalanceByType(leaveType) !== null && (
                  <span className="text-xs font-semibold text-stone-600 bg-white border border-[#ded4c5] px-2.5 py-0.5 rounded-full">
                    Available Balance:{' '}
                    <strong className="font-mono text-stone-900">
                      {getLeaveBalanceByType(leaveType)} Days
                    </strong>
                  </span>
                )}
              </div>

              {allowedLeaveDefs.length > 0 ? (
                <select
                  id="leave-type-select"
                  value={leaveType}
                  onChange={(e) => {
                    setLeaveType(e.target.value as LeaveType);
                    setFormValidationError(null);
                  }}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden font-medium cursor-pointer shadow-2xs"
                >
                  {allowedLeaveDefs.map((def) => {
                    let optValue: LeaveType = 'casual';
                    if (def.code === 'CL') optValue = 'casual';
                    else if (def.code === 'SL') optValue = 'sick';
                    else if (def.code === 'AL') optValue = 'annual';
                    else if (def.code === 'ML') optValue = 'maternity';
                    else if (def.code === 'PL') optValue = 'paternity';
                    else if (def.code === 'BL') optValue = 'bereavement';
                    else if (def.code === 'UL' || def.code === 'LOP') optValue = 'unpaid';
                    else if (def.code === 'EL' || def.code === 'EML') optValue = 'emergency';

                    const bal = getLeaveBalanceByType(optValue);
                    const balLabel = bal !== null ? ` — ${bal} Days Balance Available` : '';
                    const quotaLabel = !balLabel && def.annualQuotaDays ? ` — ${def.annualQuotaDays} Days / Year Quota` : '';

                    return (
                      <option key={def.id} value={optValue}>
                        {def.code} — {def.name} {def.nameAr ? `(${def.nameAr})` : ''} {balLabel || quotaLabel}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <strong className="block font-bold">No Leave Types Configured for Your Grade</strong>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Your assigned job grade ({employeeGrade?.gradeName || 'Standard'} / {employeeGrade?.gradeCode}) currently has no permitted leave policies enabled. Please ask HR to add allowed leaves under Define Grades.
                    </p>
                  </div>
                </div>
              )}

              {/* Policy Badges for Selected Leave */}
              {activeLeaveDef && (
                <div className="bg-white border border-[#ded4c5] p-2.5 rounded-xl flex flex-wrap items-center gap-2 text-[11px] text-stone-700">
                  <span className="font-semibold text-stone-500">Policy Rules:</span>
                  <span className="bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded-md font-medium">
                    Duration: {activeLeaveDef.minDurationDays ?? 0.5}d min – {activeLeaveDef.maxDurationDays ?? 14}d max
                  </span>
                  <span className="bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded-md font-medium">
                    {activeLeaveDef.allowAfterDays === 0
                      ? 'Eligible: Day 1'
                      : `Eligible after ${activeLeaveDef.allowAfterDays} days`}
                  </span>
                  <span className="bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-semibold">
                    Approval:{' '}
                    {activeLeaveDef.approvalBy === 'both'
                      ? 'Manager & HR'
                      : activeLeaveDef.approvalBy === 'hr_only'
                      ? 'HR Only'
                      : 'Manager Only'}
                  </span>
                  {activeLeaveDef.attachmentMandatory ? (
                    <span className="bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-rose-600" />
                      <span>Proof Mandatory</span>
                    </span>
                  ) : (
                    <span className="text-stone-400">Doc Optional</span>
                  )}
                </div>
              )}
            </div>

            {/* 2. SELECT LEAVE DURATION (From Date and To Date Only) */}
            <div className="space-y-3 pt-2 border-t border-[#ded4c5]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-700" />
                  <span>2. Leave Duration (From & To Date)</span>
                  <span className="text-rose-600 font-bold">*</span>
                </label>
                <span className="text-xs font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-900 px-3 py-0.5 rounded-full font-mono">
                  Duration: {calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* Date Inputs: From Date and To Date */}
              <div className="bg-white border border-[#ded4c5] rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="leave-from-date" className="text-xs font-medium text-stone-700">
                      From Date *
                    </label>
                    <input
                      id="leave-from-date"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setStartDate(newStart);
                        if (endDate < newStart) {
                          setEndDate(newStart);
                        }
                      }}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="leave-to-date" className="text-xs font-medium text-stone-700">
                      To Date *
                    </label>
                    <input
                      id="leave-to-date"
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-lg px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Duration Summary Banner */}
                <div className="p-2.5 bg-[#ede4d6] border border-[#ded4c5] rounded-lg flex items-center justify-between text-xs text-stone-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-700" />
                    <span>Calculated Total Working Days:</span>
                  </span>
                  <strong className="text-stone-900 font-mono text-sm">
                    {calculateDays()} {calculateDays() === 1 ? 'Day' : 'Days'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. ATTACH DOCUMENT FOR LEAVE REQUEST (Drag & Drop + Click to Upload) */}
            <div className="space-y-3 pt-2 border-t border-[#ded4c5]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-stone-700" />
                  <span>3. Attach Document for Leave Request</span>
                  <span className="text-[11px] font-normal normal-case text-stone-500">
                    (Medical slip, ticket, doctor note, or supporting certificate)
                  </span>
                </label>

                {attachedDoc && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-emerald-600" />
                    <span>Document Attached</span>
                  </span>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={onFileInputChange}
                className="hidden"
                id="leave-document-file-input"
              />

              {/* Drag and Drop Zone or Attached File Card */}
              {!attachedDoc ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-stone-800 bg-[#ede4d6]'
                      : 'border-[#ded4c5] bg-white hover:bg-[#fcfaf7]'
                  }`}
                >
                  <div className="max-w-md mx-auto space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#ede4d6] text-stone-800 flex items-center justify-center mx-auto">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-stone-800 font-semibold">
                      Drag and drop your file here, or{' '}
                      <span className="text-stone-950 underline font-bold">browse from computer</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Supports PDF, PNG, JPG, DOCX (Max 15MB)
                    </p>
                  </div>
                </div>
              ) : (
                /* Attached Document Preview Card */
                <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {attachedDoc.name}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2">
                        <span>{formatFileSize(attachedDoc.size)}</span>
                        <span>•</span>
                        <span>{attachedDoc.type || 'Document'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAttachedDoc(null)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove attached document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Sample Presets Bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600 pt-0.5">
                <span className="text-[11px] text-stone-400 font-medium">Quick sample attachments:</span>
                <button
                  type="button"
                  onClick={() => attachPresetSample('medical')}
                  className="bg-white hover:bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded text-[11px] text-stone-700 transition-colors cursor-pointer"
                >
                  + Medical Certificate.pdf
                </button>
                <button
                  type="button"
                  onClick={() => attachPresetSample('travel')}
                  className="bg-white hover:bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded text-[11px] text-stone-700 transition-colors cursor-pointer"
                >
                  + Travel Itinerary.pdf
                </button>
                <button
                  type="button"
                  onClick={() => attachPresetSample('event')}
                  className="bg-white hover:bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded text-[11px] text-stone-700 transition-colors cursor-pointer"
                >
                  + Event Invitation.pdf
                </button>
              </div>
            </div>

            {/* 4. ADD DESCRIPTION & HANDOVER DETAILS */}
            <div className="space-y-3 pt-2 border-t border-[#ded4c5]">
              <label htmlFor="leave-description-field" className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>4. Description & Justification</span>
                  <span className="text-rose-600 font-bold">*</span>
                </span>
                <span className="text-[11px] font-normal normal-case text-stone-400">
                  {description.length} characters
                </span>
              </label>

              <textarea
                id="leave-description-field"
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the detailed purpose for your leave request, key deliverables handover status, and availability during this period..."
                className="w-full bg-white border border-[#ded4c5] rounded-xl p-3 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:border-stone-800 focus:outline-hidden"
              />

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label htmlFor="leave-emergency-input" className="text-xs font-medium text-stone-700">
                    Emergency Phone / Alternate Contact (Optional)
                  </label>
                  <input
                    id="leave-emergency-input"
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+1 (415) 555-0199 (Family / Spouse / Delegate)"
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
                  />
                </div>

                <div className="text-[11px] text-stone-500 bg-[#ede4d6] border border-[#ded4c5] p-2.5 rounded-xl flex items-center gap-2 mt-auto">
                  <AlertCircle className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>
                    Your reporting manager will receive this request along with attached documents for review and sign-off.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-[#ded4c5] flex items-center justify-between">
              <div className="text-xs text-stone-500">
                <span>Selected: </span>
                <strong className="text-stone-900 font-bold uppercase">{leaveType} Leave</strong>
                <span> • {calculateDays()} Days</span>
                {attachedDoc && <span> • 1 Attached Doc</span>}
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Submit Leave Application</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: APPLY FOR PERMISSION (Permission Request) */}
      {/* ============================================================ */}
      {activeTab === 'apply_permission' && (
        <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-[#ded4c5] pb-3 mb-2">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-stone-700" />
              <span>Permission Request</span>
            </h2>
            <p className="text-xs text-stone-600">
              Request short-duration permission (Official, Hospital, Personal, Weather) without deducting from annual PTO.
            </p>
          </div>

          <form onSubmit={handlePermSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Permission Type */}
              <div className="space-y-1.5">
                <label htmlFor="perm-type-select" className="text-xs font-medium text-stone-700">
                  Permission Category *
                </label>
                <select
                  id="perm-type-select"
                  value={permForm.permissionType}
                  onChange={(e) => setPermForm({ ...permForm, permissionType: e.target.value as PermissionType })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden font-medium cursor-pointer"
                >
                  <option value="official">Official Permission</option>
                  <option value="hospital">Hospital Permission</option>
                  <option value="personal">Personal Permission</option>
                  <option value="weather">Weather Permission</option>
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label htmlFor="perm-date" className="text-xs font-medium text-stone-700">Date *</label>
                <input
                  id="perm-date"
                  type="date"
                  required
                  value={permForm.date}
                  onChange={(e) => setPermForm({ ...permForm, date: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label htmlFor="perm-start-time" className="text-xs font-medium text-stone-700">From Time *</label>
                <input
                  id="perm-start-time"
                  type="time"
                  required
                  value={permForm.startTime}
                  onChange={(e) => setPermForm({ ...permForm, startTime: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label htmlFor="perm-end-time" className="text-xs font-medium text-stone-700">To Time *</label>
                <input
                  id="perm-end-time"
                  type="time"
                  required
                  value={permForm.endTime}
                  onChange={(e) => setPermForm({ ...permForm, endTime: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-stone-800 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Total Duration Banner */}
            <div className="p-3 bg-[#ede4d6] border border-[#ded4c5] rounded-xl flex items-center justify-between text-xs text-stone-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-700" />
                <span>Requested Duration:</span>
              </span>
              <strong className="text-stone-900 font-mono text-sm">{calculateHours()} Hours</strong>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label htmlFor="perm-reason" className="text-xs font-medium text-stone-700">Description / Reason *</label>
              <textarea
                id="perm-reason"
                required
                rows={3}
                value={permForm.reason}
                onChange={(e) => setPermForm({ ...permForm, reason: e.target.value })}
                placeholder="Explain the necessity for short-duration permission..."
                className="w-full bg-white border border-[#ded4c5] rounded-xl p-3 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:border-stone-800 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Submit Permission Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MY SUBMITTED REQUESTS HISTORY */}
      {/* ============================================================ */}
      {activeTab === 'my_requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Your Request History</h2>
            <div className="flex items-center gap-1 bg-[#ede4d6] border border-[#ded4c5] p-1 rounded-xl text-xs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    statusFilter === st ? 'bg-stone-900 text-stone-50 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Leaves Section */}
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-700" />
              <span>Leave Applications ({myLeaves.length})</span>
            </h3>

            {myLeaves.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No leave applications submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {myLeaves
                  .filter((l) => statusFilter === 'all' || l.status === statusFilter)
                  .map((leave) => {
                    const reqWorkflow = leave.approvalRequired || 'manager_only';
                    const isTwoStage = reqWorkflow === 'both';

                    return (
                      <div
                        key={leave.id}
                        className="bg-white border border-[#ded4c5] rounded-xl p-4 space-y-3 text-xs shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-stone-900 uppercase text-xs">
                                {leave.leaveType} Leave
                              </span>
                              <span className="bg-[#ede4d6] text-stone-800 font-mono text-[11px] px-2.5 py-0.5 rounded border border-[#ded4c5]">
                                {getDurationLabel(leave)}
                              </span>
                              <span className="text-[10px] text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full font-medium">
                                {isTwoStage
                                  ? 'Workflow: Manager → HR'
                                  : reqWorkflow === 'hr_only'
                                  ? 'Workflow: HR Only'
                                  : 'Workflow: Manager Only'}
                              </span>
                            </div>
                            <p className="text-stone-700 pt-0.5 leading-relaxed">
                              {leave.description || leave.reason}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] tracking-wide ${
                                leave.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : leave.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                  : leave.currentStage === 'pending_hr'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {leave.status === 'approved'
                                ? 'Fully Approved'
                                : leave.status === 'rejected'
                                ? `Declined (${leave.rejectionStage === 'hr' ? 'HR' : 'Manager'})`
                                : leave.currentStage === 'pending_hr'
                                ? 'Stage 2: In HR Final Review'
                                : 'Stage 1: In Manager Review'}
                            </span>
                          </div>
                        </div>

                        {/* Visual 2-Stage Progress Pipeline */}
                        {isTwoStage && (
                          <div className="bg-[#faf7f2] border border-[#ded4c5] p-3 rounded-xl space-y-2">
                            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                              Approval Pipeline & Status
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* Step 1: Manager Endorsement */}
                              <div
                                className={`p-2.5 rounded-lg border text-xs ${
                                  leave.managerApproval?.status === 'approved'
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                    : leave.managerApproval?.status === 'rejected'
                                    ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                                    : 'bg-amber-50/70 border-amber-300 text-amber-950'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[11px]">
                                  <span>1. Manager Review</span>
                                  {leave.managerApproval?.status === 'approved' ? (
                                    <span className="text-emerald-700 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Approved
                                    </span>
                                  ) : leave.managerApproval?.status === 'rejected' ? (
                                    <span className="text-rose-700 flex items-center gap-1">
                                      <X className="w-3 h-3" /> Rejected
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 flex items-center gap-1">
                                      <Clock className="w-3 h-3 animate-spin" /> Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] mt-1 text-stone-600">
                                  {leave.managerApproval?.reviewedBy ? (
                                    <span>
                                      By: <strong>{leave.managerApproval.reviewedBy}</strong> ({leave.managerApproval.reviewedAt?.split('T')[0]})
                                      {leave.managerApproval.comments && (
                                        <div className="italic text-stone-700 mt-0.5">
                                          &ldquo;{leave.managerApproval.comments}&rdquo;
                                        </div>
                                      )}
                                    </span>
                                  ) : (
                                    <span>Awaiting manager endorsement</span>
                                  )}
                                </div>
                              </div>

                              {/* Step 2: HR Final Sign-off */}
                              <div
                                className={`p-2.5 rounded-lg border text-xs ${
                                  leave.hrApproval?.status === 'approved'
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                    : leave.hrApproval?.status === 'rejected'
                                    ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                                    : leave.currentStage === 'pending_hr'
                                    ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                                    : 'bg-stone-50 border-stone-200 text-stone-500 opacity-80'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[11px]">
                                  <span>2. HR Final Sign-off</span>
                                  {leave.hrApproval?.status === 'approved' ? (
                                    <span className="text-emerald-700 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Approved
                                    </span>
                                  ) : leave.hrApproval?.status === 'rejected' ? (
                                    <span className="text-rose-700 flex items-center gap-1">
                                      <X className="w-3 h-3" /> Rejected
                                    </span>
                                  ) : leave.currentStage === 'pending_hr' ? (
                                    <span className="text-blue-700 flex items-center gap-1">
                                      <Clock className="w-3 h-3 animate-spin" /> In HR Queue
                                    </span>
                                  ) : (
                                    <span className="text-stone-400">Waiting Step 1</span>
                                  )}
                                </div>
                                <div className="text-[11px] mt-1 text-stone-600">
                                  {leave.hrApproval?.reviewedBy ? (
                                    <span>
                                      By: <strong>{leave.hrApproval.reviewedBy}</strong> ({leave.hrApproval.reviewedAt?.split('T')[0]})
                                      {leave.hrApproval.comments && (
                                        <div className="italic text-stone-700 mt-0.5">
                                          &ldquo;{leave.hrApproval.comments}&rdquo;
                                        </div>
                                      )}
                                    </span>
                                  ) : leave.currentStage === 'pending_hr' ? (
                                    <span className="text-blue-800 font-medium">
                                      Manager approved & forwarded &rarr; HR will grant final sign-off
                                    </span>
                                  ) : (
                                    <span>Will be sent to HR once manager endorses</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Single Stage details for manager_only or hr_only */}
                        {!isTwoStage && (leave.managerComments || leave.reviewerComments) && (
                          <div className="bg-[#f2ebdF] border border-[#ded4c5] p-2.5 rounded-lg text-[11px] text-stone-700 flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-stone-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-stone-900">
                                {leave.reviewedBy ? `${leave.reviewedBy}: ` : 'Reviewer Note: '}
                              </span>
                              <span>&ldquo;{leave.managerComments || leave.reviewerComments}&rdquo;</span>
                            </div>
                          </div>
                        )}

                        {/* Attached Document Pill if available */}
                        {(leave.documentName || leave.documentAttachment?.name) && (
                          <div className="pt-1 flex items-center justify-between border-t border-[#f0eae1]">
                            <div className="flex items-center gap-2 text-stone-600 text-[11px]">
                              <Paperclip className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="font-mono text-stone-900 font-semibold truncate max-w-xs">
                                {leave.documentName || leave.documentAttachment?.name}
                              </span>
                              {(leave.documentSize || leave.documentAttachment?.size) && (
                                <span className="text-stone-400">
                                  ({formatFileSize(leave.documentSize || leave.documentAttachment?.size || 0)})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModalDoc({
                                  request: leave,
                                  docName: leave.documentName || leave.documentAttachment?.name || 'Document.pdf',
                                  docType: leave.documentType || leave.documentAttachment?.type,
                                  dataUrl: leave.documentUrl || leave.documentAttachment?.dataUrl,
                                })
                              }
                              className="text-stone-900 hover:text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview Document</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Permissions Section */}
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-700" />
              <span>Permission Requests ({myPerms.length})</span>
            </h3>

            {myPerms.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No permission requests submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {myPerms
                  .filter((p) => statusFilter === 'all' || p.status === statusFilter)
                  .map((perm) => (
                    <div
                      key={perm.id}
                      className="bg-white border border-[#ded4c5] rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 uppercase text-xs">
                              {getPermissionLabel(perm.permissionType)}
                            </span>
                            <span className="bg-[#ede4d6] text-stone-800 font-mono text-[11px] px-2 py-0.5 rounded border border-[#ded4c5]">
                              {perm.date} • {perm.startTime} - {perm.endTime} ({perm.durationHours} hrs)
                            </span>
                          </div>
                          <p className="text-stone-600 mt-1">{perm.reason}</p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] tracking-wide shrink-0 ${
                            perm.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : perm.status === 'rejected'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {perm.status}
                        </span>
                      </div>

                      {perm.managerComments && (
                        <div className="bg-[#f2ebdF] border border-[#ded4c5] p-2 rounded text-[11px] text-stone-700 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                          <span>Manager ({perm.reviewedBy}): &ldquo;{perm.managerComments}&rdquo;</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: APPROVALS DESK (MANAGER & HR QUEUES) */}
      {/* ============================================================ */}
      {activeTab === 'manager_approvals' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-900">
              <UserCheck className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold block text-sm">Approval Operations Desk</span>
                <span className="text-amber-800">
                  Review employee leave applications in 2-stage workflow (Manager Review &rarr; HR Final Sign-off).
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white border border-amber-300 px-3 py-1.5 rounded-xl font-mono text-amber-900 font-bold shadow-xs">
                {pendingTotalCount} Total Pending
              </div>
            </div>
          </div>

          {/* Subtabs for Manager Queue vs HR Final Queue vs Permissions */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#ded4c5] pb-2">
            <button
              type="button"
              onClick={() => setApprovalSubTab('manager_queue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                approvalSubTab === 'manager_queue'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Manager Review Queue</span>
              {pendingManagerCount > 0 && (
                <span className="bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {pendingManagerCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setApprovalSubTab('hr_queue')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                approvalSubTab === 'hr_queue'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>2. HR Final Sign-Off Queue</span>
              {pendingHRCount > 0 && (
                <span className="bg-blue-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {pendingHRCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setApprovalSubTab('permissions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                approvalSubTab === 'permissions'
                  ? 'bg-stone-900 text-stone-50 shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-[#ede4d6] border border-[#ded4c5]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>3. Permissions ({pendingPermsAll.length})</span>
            </button>
          </div>

          {/* SUBTAB 1: MANAGER REVIEW QUEUE */}
          {approvalSubTab === 'manager_queue' && (
            <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-stone-700" />
                  <span>Stage 1: Awaiting Manager Review ({pendingManagerLeaves.length})</span>
                </h3>
                <span className="text-[11px] text-stone-500">
                  Reviews submitted directly to reporting manager
                </span>
              </div>

              {pendingManagerLeaves.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-xs bg-white rounded-xl border border-[#ded4c5]">
                  ✓ No leave requests currently awaiting manager endorsement.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingManagerLeaves.map((req) => {
                    const emp = employees.find((e) => e.id === req.employeeId);
                    const hasDoc = !!(req.documentName || req.documentAttachment?.name);
                    const isTwoStage = req.approvalRequired === 'both';

                    return (
                      <div
                        key={req.id}
                        className="bg-white border border-[#ded4c5] rounded-xl p-4 space-y-3 text-xs shadow-xs"
                      >
                        {/* Employee Info & Leave Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={req.employeeName}
                              className="w-10 h-10 rounded-full object-cover border border-stone-300"
                            />
                            <div>
                              <div className="font-bold text-stone-900 text-sm">{req.employeeName}</div>
                              <span className="text-stone-500 text-[11px]">
                                {req.department} • {req.employeeCode}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-[#ede4d6] text-stone-800 border border-[#ded4c5] px-2.5 py-1 rounded-lg uppercase font-bold text-[10px]">
                              {req.leaveType} Leave
                            </span>
                            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                              {isTwoStage ? 'Step 1 of 2 (Manager &rarr; HR)' : 'Single Stage (Manager Only)'}
                            </span>
                          </div>
                        </div>

                        {/* Request Details Grid */}
                        <div className="bg-[#f8f5ef] p-3 rounded-xl border border-[#ded4c5] space-y-2 text-stone-700">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                                Duration & Dates
                              </span>
                              <strong className="text-stone-900 font-mono">
                                {getDurationLabel(req)}
                              </strong>
                            </div>
                            {req.emergencyContact && (
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                                  Emergency Contact
                                </span>
                                <span className="text-stone-900 font-mono">{req.emergencyContact}</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                              Description / Reason
                            </span>
                            <p className="text-stone-900 leading-relaxed pt-0.5">
                              {req.description || req.reason}
                            </p>
                          </div>

                          {/* Attached Document Card in Manager View */}
                          {hasDoc && (
                            <div className="pt-2 border-t border-[#ded4c5] flex items-center justify-between bg-white p-2.5 rounded-lg border">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-stone-700 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-stone-900 block truncate text-xs">
                                    {req.documentName || req.documentAttachment?.name}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    {req.documentSize || req.documentAttachment?.size
                                      ? formatFileSize(req.documentSize || req.documentAttachment?.size || 0)
                                      : 'Supporting Attachment'}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalDoc({
                                    request: req,
                                    docName: req.documentName || req.documentAttachment?.name || 'Document.pdf',
                                    docType: req.documentType || req.documentAttachment?.type,
                                    dataUrl: req.documentUrl || req.documentAttachment?.dataUrl,
                                  })
                                }
                                className="px-3 py-1 bg-[#ede4d6] hover:bg-[#e4d9c7] text-stone-900 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Document</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Optional Review Comment Input */}
                        {activeCommentId === req.id && (
                          <input
                            type="text"
                            value={reviewComment[req.id] || ''}
                            onChange={(e) => setReviewComment({ ...reviewComment, [req.id]: e.target.value })}
                            placeholder="Optional feedback note to employee..."
                            className="w-full bg-white border border-[#ded4c5] rounded-lg px-3 py-1.5 text-xs text-stone-900"
                          />
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => setActiveCommentId(activeCommentId === req.id ? null : req.id)}
                            className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{activeCommentId === req.id ? 'Close note' : '+ Add review note'}</span>
                          </button>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                reviewLeaveAsManager(req.id, 'rejected', reviewComment[req.id] || 'Declined by manager');
                                setSuccessToast(`Rejected leave request for ${req.employeeName}`);
                                setTimeout(() => setSuccessToast(null), 3500);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                reviewLeaveAsManager(req.id, 'approved', reviewComment[req.id] || 'Manager approved');
                                setSuccessToast(
                                  isTwoStage
                                    ? `Manager endorsed request for ${req.employeeName}. Sent to HR queue!`
                                    : `Approved leave request for ${req.employeeName}. Employee notified!`
                                );
                                setTimeout(() => setSuccessToast(null), 3500);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {isTwoStage ? 'Endorse & Forward to HR' : 'Approve Leave (Final)'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 2: HR FINAL SIGN-OFF QUEUE */}
          {approvalSubTab === 'hr_queue' && (
            <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-stone-700" />
                  <span>Stage 2: HR Final Sign-Off Queue ({pendingHRLeaves.length})</span>
                </h3>
                <span className="text-[11px] text-stone-500">
                  Requests endorsed by manager or requiring HR sign-off
                </span>
              </div>

              {pendingHRLeaves.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-xs bg-white rounded-xl border border-[#ded4c5]">
                  ✓ No leave requests currently waiting in HR final sign-off queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingHRLeaves.map((req) => {
                    const emp = employees.find((e) => e.id === req.employeeId);
                    const hasDoc = !!(req.documentName || req.documentAttachment?.name);

                    return (
                      <div
                        key={req.id}
                        className="bg-white border border-[#ded4c5] rounded-xl p-4 space-y-3 text-xs shadow-xs"
                      >
                        {/* Employee Info & Leave Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={req.employeeName}
                              className="w-10 h-10 rounded-full object-cover border border-stone-300"
                            />
                            <div>
                              <div className="font-bold text-stone-900 text-sm">{req.employeeName}</div>
                              <span className="text-stone-500 text-[11px]">
                                {req.department} • {req.employeeCode}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-[#ede4d6] text-stone-800 border border-[#ded4c5] px-2.5 py-1 rounded-lg uppercase font-bold text-[10px]">
                              {req.leaveType} Leave
                            </span>
                            <span className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                              Stage 2: HR Final Sign-off
                            </span>
                          </div>
                        </div>

                        {/* Manager Endorsement Banner if applicable */}
                        {req.managerApproval && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>
                                <strong>Manager Endorsed:</strong> Approved by{' '}
                                <strong className="text-emerald-900">{req.managerApproval.reviewedBy}</strong> on{' '}
                                {req.managerApproval.reviewedAt?.split('T')[0]}
                                {req.managerApproval.comments && ` — "${req.managerApproval.comments}"`}
                              </span>
                            </div>
                            <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-bold text-[10px]">
                              STAGE 1 PASSED
                            </span>
                          </div>
                        )}

                        {/* Request Details Grid */}
                        <div className="bg-[#f8f5ef] p-3 rounded-xl border border-[#ded4c5] space-y-2 text-stone-700">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                                Duration & Dates
                              </span>
                              <strong className="text-stone-900 font-mono">
                                {getDurationLabel(req)}
                              </strong>
                            </div>
                            {req.emergencyContact && (
                              <div>
                                <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                                  Emergency Contact
                                </span>
                                <span className="text-stone-900 font-mono">{req.emergencyContact}</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-stone-500 block text-[10px] uppercase font-semibold">
                              Description / Reason
                            </span>
                            <p className="text-stone-900 leading-relaxed pt-0.5">
                              {req.description || req.reason}
                            </p>
                          </div>

                          {/* Attached Document Card in HR View */}
                          {hasDoc && (
                            <div className="pt-2 border-t border-[#ded4c5] flex items-center justify-between bg-white p-2.5 rounded-lg border">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-stone-700 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-bold text-stone-900 block truncate text-xs">
                                    {req.documentName || req.documentAttachment?.name}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-mono">
                                    {req.documentSize || req.documentAttachment?.size
                                      ? formatFileSize(req.documentSize || req.documentAttachment?.size || 0)
                                      : 'Supporting Attachment'}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalDoc({
                                    request: req,
                                    docName: req.documentName || req.documentAttachment?.name || 'Document.pdf',
                                    docType: req.documentType || req.documentAttachment?.type,
                                    dataUrl: req.documentUrl || req.documentAttachment?.dataUrl,
                                  })
                                }
                                className="px-3 py-1 bg-[#ede4d6] hover:bg-[#e4d9c7] text-stone-900 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Document</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Optional HR Review Comment Input */}
                        {activeCommentId === req.id && (
                          <input
                            type="text"
                            value={reviewComment[req.id] || ''}
                            onChange={(e) => setReviewComment({ ...reviewComment, [req.id]: e.target.value })}
                            placeholder="Optional HR feedback note to employee..."
                            className="w-full bg-white border border-[#ded4c5] rounded-lg px-3 py-1.5 text-xs text-stone-900"
                          />
                        )}

                        {/* HR Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => setActiveCommentId(activeCommentId === req.id ? null : req.id)}
                            className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{activeCommentId === req.id ? 'Close note' : '+ Add HR review note'}</span>
                          </button>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                reviewLeaveAsHR(req.id, 'rejected', reviewComment[req.id] || 'Declined by HR department');
                                setSuccessToast(`Declined leave request for ${req.employeeName} as HR.`);
                                setTimeout(() => setSuccessToast(null), 3500);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject as HR</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                reviewLeaveAsHR(req.id, 'approved', reviewComment[req.id] || 'HR final approval granted');
                                setSuccessToast(
                                  `HR final approval granted for ${req.employeeName}! Employee has been notified.`
                                );
                                setTimeout(() => setSuccessToast(null), 3500);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                            >
                              <CheckCheck className="w-4 h-4" />
                              <span>Grant Final HR Approval</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: PENDING PERMISSION REQUESTS */}
          {approvalSubTab === 'permissions' && (
            <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <span>Pending Permission Requests for Review ({pendingPermsAll.length})</span>
              </h3>

              {pendingPermsAll.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-xs bg-white rounded-xl border border-[#ded4c5]">
                  ✓ All permission requests have been reviewed.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPermsAll.map((req) => {
                    const emp = employees.find((e) => e.id === req.employeeId);
                    return (
                      <div
                        key={req.id}
                        className="bg-white border border-[#ded4c5] rounded-xl p-4 space-y-3 text-xs shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={req.employeeName}
                              className="w-10 h-10 rounded-full object-cover border border-stone-300"
                            />
                            <div>
                              <div className="font-bold text-stone-900 text-sm">{req.employeeName}</div>
                              <span className="text-stone-500 text-[11px]">
                                {req.department} • {req.employeeCode}
                              </span>
                            </div>
                          </div>

                          <span className="bg-[#ede4d6] text-stone-800 border border-[#ded4c5] px-2.5 py-1 rounded-lg uppercase font-bold text-[10px]">
                            {getPermissionLabel(req.permissionType)}
                          </span>
                        </div>

                        <div className="bg-[#f8f5ef] p-3 rounded-lg border border-[#ded4c5] grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
                          <div>
                            <span className="text-stone-500 block text-[10px]">Time Slot & Date</span>
                            <strong className="text-stone-900 font-mono">{req.date}</strong> ({req.startTime} - {req.endTime}, {req.durationHours}h)
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Reason</span>
                            <span>{req.reason}</span>
                          </div>
                        </div>

                        {/* Optional Review Comment Input */}
                        {activeCommentId === req.id && (
                          <input
                            type="text"
                            value={reviewComment[req.id] || ''}
                            onChange={(e) => setReviewComment({ ...reviewComment, [req.id]: e.target.value })}
                            placeholder="Optional feedback note..."
                            className="w-full bg-white border border-[#ded4c5] rounded-lg px-3 py-1.5 text-xs text-stone-900"
                          />
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveCommentId(activeCommentId === req.id ? null : req.id)}
                            className="text-[11px] text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{activeCommentId === req.id ? 'Close note' : '+ Add review note'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => reviewPermission(req.id, 'rejected', reviewComment[req.id] || 'Declined')}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewPermission(req.id, 'approved', reviewComment[req.id] || 'Approved')}
                              className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Permission</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* NOTIFICATIONS MODAL DRAWER */}
      {/* ============================================================ */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ded4c5] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Notifications Center
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {myNotifications.length} updates for {currentEmployee.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-[#ede4d6] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification items list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {myNotifications.length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-xs">
                  <Bell className="w-8 h-8 mx-auto text-stone-400 mb-2 opacity-60" />
                  <p className="font-semibold">No notifications yet</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Leave approvals and workflow updates will appear here in real-time.
                  </p>
                </div>
              ) : (
                myNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1 ${
                      notif.isRead
                        ? 'bg-[#fbf9f5] border-[#ded4c5] text-stone-700'
                        : 'bg-amber-50/70 border-amber-300 text-amber-950 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        {!notif.isRead && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#ded4c5] flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ============================================================ */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ded4c5] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Supporting Document Preview
                  </h3>
                  <p className="text-[11px] text-stone-500 truncate max-w-xs font-mono">
                    {previewModalDoc.docName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewModalDoc(null)}
                className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-[#ede4d6] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Details & Rendered Preview */}
            <div className="space-y-3">
              <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Applicant:</span>
                  <strong className="text-stone-900 font-semibold">{previewModalDoc.request.employeeName}</strong>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Leave Category:</span>
                  <span className="font-bold uppercase text-stone-900">{previewModalDoc.request.leaveType} Leave</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Duration:</span>
                  <span className="font-mono text-stone-800">{getDurationLabel(previewModalDoc.request)}</span>
                </div>
              </div>

              {/* Document Visual Viewer */}
              <div className="border border-[#ded4c5] rounded-xl p-4 bg-[#fcfaf7] min-h-[160px] flex flex-col items-center justify-center text-center space-y-2">
                {previewModalDoc.dataUrl && previewModalDoc.docType?.startsWith('image/') ? (
                  <img
                    src={previewModalDoc.dataUrl}
                    alt="Document preview"
                    className="max-h-64 object-contain rounded-lg border shadow-xs"
                  />
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#ede4d6] border border-[#ded4c5] flex items-center justify-center mx-auto text-stone-800">
                      <FileCheck className="w-7 h-7 text-emerald-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        {previewModalDoc.docName}
                      </div>
                      <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                        Verified Official Attachment ({previewModalDoc.docType || 'application/pdf'})
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ready for Manager Verification</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#ded4c5] flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Uploaded {new Date(previewModalDoc.request.appliedAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Simulate document download or print
                    setSuccessToast(`Downloaded ${previewModalDoc.docName} to device`);
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="px-3 py-1.5 bg-[#ede4d6] hover:bg-[#e4d9c7] text-stone-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalDoc(null)}
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
