import React, { useState, useEffect, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { Employee, UserRole } from '../types';
import {
  calculateLeaveCycle,
  getEmployeeAnnualQuota,
} from '../utils/leaveAnniversaryUtils';
import {
  Users,
  Building2,
  Mail,
  Phone,
  Search,
  Check,
  Edit2,
  CheckCircle2,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  UserCheck,
  Calendar,
  Lock,
  ArrowRight,
  Shield,
  Briefcase,
  Layers,
  AlertCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  Upload,
  Image as ImageIcon,
  Key,
  AtSign,
  Eye,
  EyeOff,
  Power,
  UserX,
  CheckCircle,
  RotateCcw,
  Gift,
  RefreshCw,
  Smartphone,
  Unlock,
  Ban,
  ShieldOff,
  Laptop,
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const EmployeeDirectory: React.FC = () => {
  const {
    employees,
    officeLocations,
    updateEmployeeLocations,
    setCurrentEmployeeId,
    currentEmployee,
    isCurrentHR,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    gradeDefinitions,
    leaveDefinitions,
    refillEmployeeLeavesForAnniversary,
    runAnniversaryLeaveRefills,
    toggleEmployeeLoginAccess,
    resetEmployeeDeviceBinding,
  } = useAttendance();

  // HR Toggle System Login Access for an Employee
  const handleToggleLoginAccess = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = toggleEmployeeLoginAccess(emp.id);
    showToast(res.message);
  };

  // HR Reset 1-Device Hardware Binding
  const handleResetDeviceBinding = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = resetEmployeeDeviceBinding(emp.id);
    showToast(res.message);
  };

  // Manual Trigger for Employee Anniversary Refill
  const handleRefillEmployeeLeaves = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = refillEmployeeLeavesForAnniversary(emp.id);
    showToast(res.message);
  };

  // Run Batch Anniversary Refill Check
  const [isCheckingRefills, setIsCheckingRefills] = useState(false);
  const handleRunBatchRefills = () => {
    setIsCheckingRefills(true);
    setTimeout(() => {
      const res = runAnniversaryLeaveRefills();
      showToast(res.message);
      setIsCheckingRefills(false);
    }, 400);
  };

  // Search & Filter State (HR)
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // View Mode & Pagination State (HR)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 12;

  // Modals State (HR)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [locationAssignModalEmp, setLocationAssignModalEmp] = useState<Employee | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [deleteConfirmEmpId, setDeleteConfirmEmpId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form password visibility & image upload state
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Adding / Editing Employee
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    isActive: true,
    canLogin: true,
    avatar: AVATAR_PRESETS[0],
    employeeCode: '',
    role: 'employee' as UserRole,
    department: 'Engineering',
    designation: '',
    gradeId: 'gr_e1',
    phone: '+1 (415) 555-0100',
    joinedDate: new Date().toISOString().split('T')[0],
    managerId: 'emp_02',
    allowedLocationIds: ['loc_hq'],
    casualLeave: 10,
    sickLeave: 10,
    annualLeave: 18,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find user's reporting manager
  const userManager = employees.find(
    (e) => e.id === currentEmployee.managerId || (e.role === 'manager' && e.id !== currentEmployee.id)
  ) || employees.find((e) => e.role === 'manager');

  // Filtered employees for HR Directory
  const departments = ['all', ...Array.from(new Set(employees.map((e) => e.department)))];

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      (emp.username && emp.username.toLowerCase().includes(q)) ||
      emp.email.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q);

    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
    const isEmpActive = emp.isActive !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isEmpActive) ||
      (statusFilter === 'inactive' && !isEmpActive);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredEmployees.length);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // File Upload Helper
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select a valid image format (PNG, JPG, JPEG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadError('Image size should be below 5MB.');
      return;
    }

    setAvatarUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({ ...prev, avatar: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-suggest username helper
  const handleAutoSuggestUsername = (name: string) => {
    if (!name) return;
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
    setFormData((prev) => ({ ...prev, username: clean }));
  };

  // Generate random password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Pass#';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  // Quick 1-click Toggle Employee Active Status
  const handleToggleEmployeeActive = (emp: Employee, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = emp.isActive === false ? true : false;
    const updated: Employee = {
      ...emp,
      isActive: newStatus,
    };
    updateEmployee(updated);
    showToast(
      newStatus
        ? `${emp.name} account activated successfully!`
        : `${emp.name} account deactivated (login disabled).`
    );
  };

  // Open Add Employee Modal
  const handleOpenAddModal = () => {
    const nextCodeNum = 1000 + employees.length + 1;
    const defaultGrade = gradeDefinitions.find((g) => g.isActive)?.id || gradeDefinitions[0]?.id || 'gr_e1';
    setAvatarUploadError(null);
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      username: '',
      password: 'password123',
      isActive: true,
      canLogin: true,
      avatar: AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)],
      employeeCode: `EMP-${nextCodeNum}`,
      role: 'employee',
      department: 'Engineering',
      designation: '',
      gradeId: defaultGrade,
      phone: '+1 (415) 555-0' + Math.floor(100 + Math.random() * 899),
      joinedDate: new Date().toISOString().split('T')[0],
      managerId: userManager ? userManager.id : 'emp_02',
      allowedLocationIds: ['loc_hq'],
      casualLeave: 10,
      sickLeave: 10,
      annualLeave: 18,
    });
    setIsAddModalOpen(true);
  };

  // Submit Add Employee
  const handleSaveNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.designation.trim()) {
      alert('Please fill in employee name, email, and designation.');
      return;
    }

    const derivedUsername =
      formData.username.trim() ||
      formData.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');

    addEmployee({
      name: formData.name.trim(),
      email: formData.email.trim(),
      username: derivedUsername,
      password: formData.password.trim() || 'password123',
      isActive: formData.isActive,
      canLogin: formData.canLogin !== false,
      avatar: formData.avatar,
      employeeCode: formData.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
      role: formData.role,
      department: formData.department,
      designation: formData.designation.trim(),
      gradeId: formData.gradeId,
      phone: formData.phone,
      joinedDate: formData.joinedDate,
      allowedLocationIds: formData.allowedLocationIds.length > 0 ? formData.allowedLocationIds : ['loc_hq'],
      managerId: formData.managerId,
      todayStatus: 'absent',
      leaveBalance: {
        casual: Number(formData.casualLeave) || 10,
        sick: Number(formData.sickLeave) || 10,
        annual: Number(formData.annualLeave) || 18,
        permissionsCountThisMonth: 0,
      },
    });

    setIsAddModalOpen(false);
    showToast(`Successfully registered ${formData.name} (Username: @${derivedUsername})!`);
  };

  // Open Edit Employee Modal
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setAvatarUploadError(null);
    setShowPassword(false);
    setFormData({
      name: emp.name,
      email: emp.email,
      username: emp.username || emp.employeeCode.toLowerCase().replace('-', ''),
      password: emp.password || 'password123',
      isActive: emp.isActive !== false,
      canLogin: emp.canLogin !== false,
      avatar: emp.avatar,
      employeeCode: emp.employeeCode,
      role: emp.role,
      department: emp.department,
      designation: emp.designation,
      gradeId: emp.gradeId || gradeDefinitions[0]?.id || 'gr_e1',
      phone: emp.phone,
      joinedDate: emp.joinedDate,
      managerId: emp.managerId || 'emp_02',
      allowedLocationIds: emp.allowedLocationIds,
      casualLeave: emp.leaveBalance.casual,
      sickLeave: emp.leaveBalance.sick,
      annualLeave: emp.leaveBalance.annual,
    });
  };

  // Submit Edit Employee
  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const updated: Employee = {
      ...editingEmployee,
      name: formData.name.trim() || editingEmployee.name,
      email: formData.email.trim() || editingEmployee.email,
      username: formData.username.trim() || editingEmployee.username,
      password: formData.password.trim() || editingEmployee.password || 'password123',
      isActive: formData.isActive,
      canLogin: formData.canLogin !== false,
      avatar: formData.avatar || editingEmployee.avatar,
      employeeCode: formData.employeeCode || editingEmployee.employeeCode,
      role: formData.role,
      department: formData.department,
      designation: formData.designation.trim() || editingEmployee.designation,
      gradeId: formData.gradeId,
      phone: formData.phone || editingEmployee.phone,
      joinedDate: formData.joinedDate || editingEmployee.joinedDate,
      managerId: formData.managerId,
      allowedLocationIds: formData.allowedLocationIds,
      leaveBalance: {
        ...editingEmployee.leaveBalance,
        casual: Number(formData.casualLeave),
        sick: Number(formData.sickLeave),
        annual: Number(formData.annualLeave),
      },
    };

    updateEmployee(updated);
    setEditingEmployee(null);
    showToast(`Updated employee profile and credentials for ${updated.name}!`);
  };

  // Quick Geofence Location Assignment
  const handleOpenAssignModal = (emp: Employee) => {
    setLocationAssignModalEmp(emp);
    setSelectedLocationIds(emp.allowedLocationIds);
  };

  const handleToggleLocation = (locId: string) => {
    if (selectedLocationIds.includes(locId)) {
      if (selectedLocationIds.length > 1) {
        setSelectedLocationIds(selectedLocationIds.filter((id) => id !== locId));
      }
    } else {
      setSelectedLocationIds([...selectedLocationIds, locId]);
    }
  };

  const handleSaveLocations = () => {
    if (!locationAssignModalEmp) return;
    updateEmployeeLocations(locationAssignModalEmp.id, selectedLocationIds);
    showToast(`Updated allowed offices for ${locationAssignModalEmp.name}!`);
    setLocationAssignModalEmp(null);
  };

  const handleDeleteEmployee = (empId: string) => {
    deleteEmployee(empId);
    setDeleteConfirmEmpId(null);
    showToast('Employee removed successfully.');
  };

  // =========================================================================
  // VIEW 1: NORMAL USER (NON-HR) - ONLY SEE MY INFO & MY MANAGER
  // =========================================================================
  if (!isCurrentHR) {
    const userAllowedOffices = officeLocations.filter((loc) =>
      currentEmployee.allowedLocationIds.includes(loc.id)
    );

    return (
      <div id="employee-profile-self-view" className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Access Notice Banner */}
        <div className="bg-[#ede4d6] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">Standard Employee View</h3>
                <span className="text-[10px] font-bold uppercase bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                  Self & Manager Only
                </span>
              </div>
              <p className="text-xs text-stone-600">
                The full company employee directory is reserved for HR personnel. You have access to your personal employee file and reporting manager information.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="switch-to-hr-demo-btn"
            onClick={() => {
              const hrUser = employees.find((e) => e.role === 'hr' || e.department.toLowerCase().includes('hr'));
              if (hrUser) setCurrentEmployeeId(hrUser.id);
            }}
            className="text-xs bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Switch to HR Profile (Priya Sharma)</span>
          </button>
        </div>

        {/* 2-Column Grid: My Information & My Reporting Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: MY PERSONAL DATA (Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ded4c5] pb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={currentEmployee.avatar}
                    alt={currentEmployee.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-stone-800 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-stone-900">{currentEmployee.name}</h1>
                      <span className="text-xs font-mono bg-[#ede4d6] text-stone-800 px-2 py-0.5 rounded-lg border border-[#ded4c5] font-semibold">
                        {currentEmployee.employeeCode}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 font-medium">{currentEmployee.designation}</p>
                    <p className="text-xs text-stone-500">{currentEmployee.department} Department</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                      currentEmployee.todayStatus === 'present'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : currentEmployee.todayStatus === 'on_leave'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : currentEmployee.todayStatus === 'on_permission'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}
                  >
                    Status: {currentEmployee.todayStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-600" />
                    <span>Official Email</span>
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900 truncate">
                    {currentEmployee.email}
                  </p>
                </div>

                <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-600" />
                    <span>Phone Number</span>
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900 truncate">
                    {currentEmployee.phone}
                  </p>
                </div>

                <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-600" />
                    <span>Date of Joining</span>
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900">
                    {currentEmployee.joinedDate}
                  </p>
                </div>

                <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-stone-600" />
                    <span>System Role & Clearance</span>
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-stone-900 capitalize">
                    {currentEmployee.role === 'manager' ? 'Reporting Manager' : 'Standard Employee'}
                  </p>
                </div>
              </div>

              {/* Leave Balances Breakdown */}
              <div className="space-y-2 pt-2 border-t border-[#ded4c5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-700" />
                  <span>My Active Leave Quotas & Balances</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-[#ded4c5] p-3 rounded-xl text-center">
                    <span className="text-lg sm:text-xl font-bold text-stone-900 block">
                      {currentEmployee.leaveBalance.casual}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium uppercase">Casual Days</span>
                  </div>
                  <div className="bg-white border border-[#ded4c5] p-3 rounded-xl text-center">
                    <span className="text-lg sm:text-xl font-bold text-stone-900 block">
                      {currentEmployee.leaveBalance.sick}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium uppercase">Sick Days</span>
                  </div>
                  <div className="bg-white border border-[#ded4c5] p-3 rounded-xl text-center">
                    <span className="text-lg sm:text-xl font-bold text-stone-900 block">
                      {currentEmployee.leaveBalance.annual}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium uppercase">Annual PTO</span>
                  </div>
                </div>
              </div>

              {/* My Authorized Geofence Offices */}
              <div className="space-y-2 pt-2 border-t border-[#ded4c5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-700" />
                  <span>My Authorized Office Check-In Locations</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {userAllowedOffices.map((loc) => (
                    <div
                      key={loc.id}
                      className="bg-white border border-[#ded4c5] p-3 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
                          <span>{loc.name}</span>
                        </span>
                        <span className="text-[10px] font-mono bg-[#ede4d6] text-stone-700 px-1.5 py-0.5 rounded">
                          {loc.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">{loc.address}</p>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        ✓ Authorized Geofence ({loc.radiusMeters}m radius)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: MY REPORTING MANAGER CARD (Span 1) */}
          <div className="space-y-6">
            <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-[#ded4c5] pb-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                  Reporting Hierarchy
                </span>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2 mt-0.5">
                  <UserCheck className="w-4 h-4 text-stone-800" />
                  <span>My Reporting Manager</span>
                </h2>
              </div>

              {userManager ? (
                <div className="space-y-4">
                  {/* Manager Header */}
                  <div className="flex items-center gap-3">
                    <img
                      src={userManager.avatar}
                      alt={userManager.name}
                      className="w-12 h-12 rounded-full object-cover border border-stone-300"
                    />
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                        {userManager.name}
                      </h3>
                      <p className="text-xs text-stone-700 font-medium">{userManager.designation}</p>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-900 border border-blue-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        Direct Approver
                      </span>
                    </div>
                  </div>

                  {/* Manager Details */}
                  <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-2 text-xs text-stone-700">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate font-medium">{userManager.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{userManager.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{userManager.department}</span>
                    </div>
                  </div>

                  <div className="bg-[#ede4d6] border border-[#ded4c5] p-3 rounded-xl text-xs text-stone-700 space-y-1">
                    <span className="font-bold block text-stone-900">Manager Responsibilities:</span>
                    <p className="text-[11px] text-stone-600">
                      Reviews your leave applications, evaluates permission requests, and oversees daily shift authorizations.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-500">No designated reporting manager assigned.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: HR EMPLOYEE VIEW - FULL DIRECTORY + ADD / EDIT / DELETE CAPABILITIES
  // =========================================================================
  return (
    <div id="hr-employee-directory-view" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & HR Controls */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ded4c5] pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-stone-800" />
                <span>Employees & Staff Directory</span>
              </h1>
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>HR Admin Privileges</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Add new staff members, edit roles and designations, adjust leave quotas, and manage geofence office permissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
            {/* Auto-Refill Anniversaries Check Button */}
            <button
              type="button"
              id="hr-check-anniversary-refills-btn"
              onClick={handleRunBatchRefills}
              disabled={isCheckingRefills}
              className="bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 font-semibold px-3.5 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50"
              title="Checks work anniversaries for all employees and automatically refills leave balances without carryover"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-700 ${isCheckingRefills ? 'animate-spin' : ''}`} />
              <span>Check Anniversaries</span>
            </button>

            {/* "+ Add New Employee" HR Action */}
            <button
              type="button"
              id="hr-add-new-employee-btn"
              onClick={handleOpenAddModal}
              className="bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Employee</span>
            </button>
          </div>
        </div>

        {/* HR Filters, Search Bar & View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="hr-employee-search-input"
                type="text"
                placeholder="Search by name, code, dept, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#ded4c5] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800"
              />
            </div>

            <select
              id="hr-department-filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            <select
              id="hr-role-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="employee">Standard Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR Specialist</option>
              <option value="admin">Administrator</option>
            </select>

            <select
              id="hr-status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* View Mode Toggle: Tile View vs List View */}
            <div className="flex items-center bg-white border border-[#ded4c5] p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                id="view-mode-tile-btn"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#ede4d6]/60'
                }`}
                title="Tile / Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tile View</span>
              </button>
              <button
                type="button"
                id="view-mode-list-btn"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#ede4d6]/60'
                }`}
                title="Table / List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            <span className="text-xs bg-[#ede4d6] border border-[#ded4c5] px-3 py-2 rounded-xl font-mono text-stone-800 font-semibold whitespace-nowrap">
              {filteredEmployees.length} Staff
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-base font-bold text-stone-900">No matching employees found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search query, department filter, or role filter to see staff records.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDepartmentFilter('all');
              setRoleFilter('all');
            }}
            className="text-xs font-semibold bg-stone-900 text-stone-50 px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TILE / GRID VIEW (12 PER PAGE) */}
      {/* ============================================================ */}
      {filteredEmployees.length > 0 && viewMode === 'grid' && (
        <div id="employees-tile-view" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEmployees.map((emp) => {
            const allowedOffices = officeLocations.filter((loc) =>
              emp.allowedLocationIds.includes(loc.id)
            );
            const isCurrentUser = emp.id === currentEmployee.id;
            const isEmpActive = emp.isActive !== false;

            return (
              <div
                key={emp.id}
                className={`bg-[#f8f5ef] border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors relative flex flex-col justify-between ${
                  !isEmpActive
                    ? 'border-rose-300/80 bg-rose-50/20'
                    : isCurrentUser
                    ? 'border-stone-800 ring-1 ring-stone-800'
                    : 'border-[#ded4c5] hover:border-stone-400'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Profile Top */}
                  <div className="flex items-start gap-3 justify-between">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className={`w-12 h-12 rounded-full object-cover border ${
                            isEmpActive ? 'border-stone-300' : 'border-rose-400 grayscale'
                          }`}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isEmpActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={isEmpActive ? 'Active Employee' : 'Inactive / Account Disabled'}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                            {emp.name}
                          </h3>
                          <span className="text-[10px] font-mono bg-[#ede4d6] text-stone-700 px-1.5 py-0.5 rounded border border-[#ded4c5]">
                            {emp.employeeCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-stone-600">
                          <AtSign className="w-3 h-3 text-stone-400" />
                          <span>{emp.username || emp.employeeCode.toLowerCase().replace('-', '')}</span>
                        </div>
                        <p className="text-xs text-stone-700 font-medium">{emp.designation}</p>
                        <p className="text-[11px] text-stone-500">{emp.department}</p>
                        {(() => {
                          const g = gradeDefinitions.find((gd) => gd.id === emp.gradeId || gd.gradeCode === emp.gradeId);
                          if (!g) return null;
                          return (
                            <div className="pt-0.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white border border-[#ded4c5] text-stone-800 px-1.5 py-0.5 rounded shadow-2xs"
                                title={`${g.gradeName} ${g.gradeNameAr ? `(${g.gradeNameAr})` : ''}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.color || '#0284c7' }} />
                                <span>{g.gradeCode} • {g.gradeName}</span>
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Role & Status Tags */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                          emp.role === 'hr'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : emp.role === 'manager'
                            ? 'bg-blue-100 text-blue-900 border-blue-200'
                            : emp.role === 'admin'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {emp.role}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                          isEmpActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
                        }`}
                      >
                        {isEmpActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 text-rose-600" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Security: HR Login Permission & 1-Device Hardware Binding Card */}
                  <div className="bg-stone-100/70 border border-[#ded4c5] rounded-xl p-2.5 space-y-2 text-[11px]">
                    {/* Login Access Toggle */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stone-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                        <span>System Login:</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleLoginAccess(emp, e)}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] border flex items-center gap-1 transition-all cursor-pointer ${
                          emp.canLogin !== false
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                        }`}
                        title={emp.canLogin !== false ? 'Click to disable system login' : 'Click to enable system login'}
                      >
                        {emp.canLogin !== false ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>Allowed</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3 text-rose-700" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 1-Device Hardware Binding */}
                    <div className="pt-1.5 border-t border-[#ded4c5]/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Smartphone className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <div className="min-w-0">
                          {emp.deviceId ? (
                            <span className="font-semibold text-stone-800 truncate block text-[10px]" title={emp.deviceBinding?.deviceName || emp.deviceId}>
                              {emp.deviceBinding?.deviceName || '1 Device Bound'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500 italic block">
                              No device registered (auto-binds on login)
                            </span>
                          )}
                        </div>
                      </div>

                      {emp.deviceId && (
                        <button
                          type="button"
                          onClick={(e) => handleResetDeviceBinding(emp, e)}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
                          title="Reset device binding to allow this user to log in from a new device"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          <span>Reset Device</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact, Joining Date & Anniversary Info */}
                  <div className="bg-white/90 rounded-xl p-2.5 space-y-1.5 text-[11px] text-stone-600 border border-[#ded4c5]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                    
                    {/* Joining Date */}
                    <div className="pt-1.5 border-t border-[#ded4c5]/60 flex items-center justify-between text-[11px] text-stone-700">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>Joined: <strong>{emp.joinedDate}</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Authorized Geofence Offices */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-stone-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-600" />
                        <span>Authorized Offices:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(emp)}
                        className="text-stone-800 hover:text-stone-950 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Geofences</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {allowedOffices.map((loc) => (
                        <span
                          key={loc.id}
                          className="text-[10px] bg-white border border-[#ded4c5] px-2 py-0.5 rounded-lg text-stone-800 flex items-center gap-1 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: loc.color }}></span>
                          <span>{loc.name.split(' ')[0]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* HR Card Actions (Edit, Status Toggle, Refill Leaves, Delete, Switch) */}
                <div className="pt-2.5 border-t border-[#ded4c5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(emp)}
                      className="text-xs bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <Edit2 className="w-3 h-3 text-stone-600" />
                      <span>Edit</span>
                    </button>

                    {/* Manual Leave Refill Action */}
                    <button
                      type="button"
                      onClick={(e) => handleRefillEmployeeLeaves(emp, e)}
                      className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-medium"
                      title="Refill leave balances to full annual quota based on work anniversary"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Refill</span>
                    </button>

                    {/* Quick Active/Inactive Toggle Button */}
                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleEmployeeActive(emp, e)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 font-medium ${
                          isEmpActive
                            ? 'bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 border-[#ded4c5] hover:border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                        }`}
                        title={isEmpActive ? 'Click to deactivate employee login' : 'Click to activate employee login'}
                      >
                        <Power className={`w-3 h-3 ${isEmpActive ? 'text-stone-500' : 'text-emerald-600'}`} />
                        <span>{isEmpActive ? 'Disable' : 'Enable'}</span>
                      </button>
                    )}

                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmEmpId(emp.id)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!isCurrentUser && isEmpActive && (
                    <button
                      type="button"
                      onClick={() => setCurrentEmployeeId(emp.id)}
                      className="text-xs bg-stone-900 hover:bg-stone-800 text-stone-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium flex items-center gap-1"
                    >
                      <span>Test As</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  {!isCurrentUser && !isEmpActive && (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Locked
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="text-[10px] font-bold text-stone-500 uppercase">You (HR)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. LIST / TABLE VIEW (12 PER PAGE) */}
      {/* ============================================================ */}
      {filteredEmployees.length > 0 && viewMode === 'list' && (
        <div id="employees-list-view" className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#ede4d6] border-b border-[#ded4c5] text-[10.5px] font-bold uppercase tracking-wider text-stone-700">
                  <th className="py-2.5 px-3.5 w-[25%]">Employee</th>
                  <th className="py-2.5 px-3 w-[25%]">Department</th>
                  <th className="py-2.5 px-3 w-[15%]">Joining Date</th>
                  <th className="py-2.5 px-3 w-[20%]">Mobile Device</th>
                  <th className="py-2.5 px-3.5 text-right w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ded4c5]/70 text-stone-800">
                {paginatedEmployees.map((emp) => {
                  const isCurrentUser = emp.id === currentEmployee.id;
                  const isEmpActive = emp.isActive !== false;

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        !isEmpActive
                          ? 'bg-rose-50/25 opacity-75'
                          : isCurrentUser
                          ? 'bg-amber-50/60 font-medium'
                          : 'hover:bg-white/70'
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <img
                              src={emp.avatar}
                              alt={emp.name}
                              className={`w-8 h-8 rounded-full object-cover border ${
                                isEmpActive ? 'border-stone-300' : 'border-rose-400 grayscale'
                              }`}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isEmpActive ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 leading-tight">
                              <span className="font-bold text-stone-900 text-xs truncate max-w-[140px]" title={emp.name}>
                                {emp.name}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[8px] bg-stone-900 text-stone-100 font-bold px-1 py-0.1 rounded uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-stone-500 font-semibold">
                                {emp.employeeCode}
                              </span>
                              <span
                                className={`text-[8.5px] font-extrabold uppercase px-1 py-0.1 rounded border leading-none ${
                                  emp.role === 'hr'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : emp.role === 'manager'
                                    ? 'bg-blue-100 text-blue-900 border-blue-200'
                                    : emp.role === 'admin'
                                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                                    : 'bg-stone-100 text-stone-700 border-stone-200'
                                }`}
                              >
                                {emp.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5 leading-tight">
                          <p className="font-bold text-stone-900 text-[11.5px] truncate max-w-[180px]" title={emp.department}>
                            {emp.department}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-stone-600 flex-wrap">
                            <span>{emp.designation}</span>
                            {(() => {
                              const g = gradeDefinitions.find((gd) => gd.id === emp.gradeId || gd.gradeCode === emp.gradeId);
                              if (!g) return null;
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-1 py-0.1 rounded"
                                  title={`${g.gradeName} ${g.gradeNameAr ? `(${g.gradeNameAr})` : ''}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: g.color || '#0284c7' }} />
                                  <span>{g.gradeCode}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-stone-800 font-semibold text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>{emp.joinedDate}</span>
                        </div>
                      </td>

                      {/* Mobile Device */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {emp.deviceId ? (
                            <div className="flex items-center gap-1 text-[9.5px] bg-white border border-[#ded4c5] px-2 py-1 rounded-md text-stone-800 max-w-[170px]">
                              <Smartphone className="w-3 h-3 text-stone-500 shrink-0" />
                              <span className="font-semibold truncate" title={emp.deviceBinding?.deviceName || emp.deviceId}>
                                {emp.deviceBinding?.deviceName || '1 Phone Bound'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleResetDeviceBinding(emp, e)}
                                className="text-amber-800 hover:text-amber-950 font-bold ml-auto pl-1 hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                                title="Reset mobile device lock"
                              >
                                <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                                <span>Reset</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[9.5px] text-stone-500 italic">
                              <Smartphone className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>Auto-binds on 1st login</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="text-[11px] bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 font-semibold shadow-2xs"
                          >
                            <Edit2 className="w-2.5 h-2.5 text-stone-600" />
                            <span>Edit</span>
                          </button>

                          {/* Quick Anniversary Leave Refill Action */}
                          <button
                            type="button"
                            onClick={(e) => handleRefillEmployeeLeaves(emp, e)}
                            className="text-[11px] bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-2xs"
                            title="Refill leave quota"
                          >
                            <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                            <span>Refill</span>
                          </button>

                          {/* Quick Toggle Active Status */}
                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleEmployeeActive(emp, e)}
                              className={`text-[11px] px-1.5 py-0.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
                                isEmpActive
                                  ? 'bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-700 border-[#ded4c5]'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                              }`}
                              title={isEmpActive ? 'Disable Employee' : 'Enable Employee'}
                            >
                              <Power className={`w-2.5 h-2.5 ${isEmpActive ? 'text-stone-400' : 'text-emerald-600'}`} />
                              <span>{isEmpActive ? 'Disable' : 'Enable'}</span>
                            </button>
                          )}

                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmEmpId(emp.id)}
                              className="p-1 rounded-md text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PAGINATION CONTROLS (12 EMPLOYEES PER PAGE) */}
      {/* ============================================================ */}
      {filteredEmployees.length > 0 && (
        <div id="employees-pagination-controls" className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="text-xs text-stone-600 font-medium">
            Showing <span className="font-bold text-stone-900">{startIndex + 1}</span>–
            <span className="font-bold text-stone-900">{endIndex}</span> of{' '}
            <span className="font-bold text-stone-900">{filteredEmployees.length}</span> staff members
            <span className="text-stone-400 ml-1.5 font-mono">(12 per page)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="pagination-prev-btn"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-[#ded4c5] bg-white text-xs font-semibold text-stone-700 hover:bg-[#ede4d6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  id={`pagination-page-${pageNum}-btn`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    safeCurrentPage === pageNum
                      ? 'bg-stone-900 text-stone-50 shadow-xs'
                      : 'bg-white text-stone-700 border border-[#ded4c5] hover:bg-[#ede4d6]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="pagination-next-btn"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-[#ded4c5] bg-white text-xs font-semibold text-stone-700 hover:bg-[#ede4d6] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD NEW EMPLOYEE (HR) */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#ded4c5] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-stone-800" />
                  <span>Register New Employee</span>
                </h3>
                <p className="text-xs text-stone-600">
                  Create a new staff profile with login credentials, active status, and leave allowances.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewEmployee} className="space-y-4">
              {/* Profile Image & Upload Section */}
              <div className="bg-white/80 border border-[#ded4c5] rounded-xl p-3.5 space-y-3">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-stone-600" />
                  <span>Profile Photo & Avatar</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={formData.avatar}
                      alt="Employee preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-stone-800 shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                        formData.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={addFileInputRef}
                        onChange={handleImageFileSelect}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        className="text-xs font-semibold bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>Upload Photo</span>
                      </button>
                      <span className="text-[10px] text-stone-500">Max 5MB (PNG, JPG, WebP)</span>
                    </div>

                    {avatarUploadError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{avatarUploadError}</span>
                      </p>
                    )}

                    {/* Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 block">Or pick a quick avatar preset:</span>
                      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                        {AVATAR_PRESETS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Preset avatar"
                            onClick={() => setFormData({ ...formData, avatar: url })}
                            className={`w-8 h-8 rounded-full object-cover cursor-pointer border-2 transition-all shrink-0 ${
                              formData.avatar === url
                                ? 'border-stone-900 ring-2 ring-stone-800 scale-105'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active / Inactive Employment Status Switch */}
              <div
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  formData.isActive
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {formData.isActive ? (
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <UserX className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="text-xs font-bold">
                      {formData.isActive ? 'Active Employee Status' : 'Inactive / Deactivated Status'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    {formData.isActive
                      ? 'Employee is allowed to log into the mobile app and record geofenced attendance.'
                      : 'Account is locked. Employee cannot log in or submit requests.'}
                  </p>
                </div>

                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    formData.isActive ? 'bg-emerald-600' : 'bg-stone-400'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      formData.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* System Login Access Permission Toggle */}
              <div
                onClick={() => setFormData({ ...formData, canLogin: !formData.canLogin })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  formData.canLogin !== false
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {formData.canLogin !== false ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Ban className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="text-xs font-bold">
                      {formData.canLogin !== false ? 'System Login Allowed' : 'System Login Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    {formData.canLogin !== false
                      ? 'Employee is authorized to log in to SAATA.'
                      : 'Employee cannot log in or use the system until enabled by HR.'}
                  </p>
                </div>

                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    formData.canLogin !== false ? 'bg-emerald-600' : 'bg-stone-400'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      formData.canLogin !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="bg-white/80 border border-[#ded4c5] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#ded4c5]/60 pb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-stone-600" />
                    <span>Login Credentials & Password</span>
                  </label>
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2 py-0.5 rounded">
                    Employee Sign-in
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">Username *</label>
                      {formData.name && (
                        <button
                          type="button"
                          onClick={() => handleAutoSuggestUsername(formData.name)}
                          className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>Suggest</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            username: e.target.value.toLowerCase().replace(/\s+/g, '.'),
                          })
                        }
                        placeholder="e.g. jordan.miller"
                        className="w-full bg-white border border-[#ded4c5] rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">Password *</label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span>Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter login password"
                        className="w-full bg-white border border-[#ded4c5] rounded-xl pl-8 pr-9 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name: newName,
                        username: prev.username || newName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.'),
                      }));
                    }}
                    placeholder="e.g. Jordan Miller"
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jordan.m@company.com"
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Engineering & Product">Engineering & Product</option>
                    <option value="Product Design">Product Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Enterprise Sales">Enterprise Sales</option>
                    <option value="Finance & Legal">Finance & Legal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Job Title / Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Backend Software Engineer"
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              {/* Assigned Job Grade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>Assigned Job Grade *</span>
                  <span className="text-[10px] text-stone-500 font-normal">Controls permitted leave types for this employee</span>
                </label>
                <select
                  value={formData.gradeId}
                  onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer font-medium"
                >
                  {gradeDefinitions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gradeCode} — {g.gradeName} {g.gradeNameAr ? `(${g.gradeNameAr})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role & Reporting Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Role & Access Type</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="employee">Standard Employee</option>
                    <option value="manager">Manager (Approver)</option>
                    <option value="hr">HR Employee (Directory Admin)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Reporting Manager</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    {employees
                      .filter((e) => e.role === 'manager' || e.role === 'admin' || e.role === 'hr')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.department})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date of Joining & Work Anniversary Refill Configuration */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>Date of Joining (Annual Refill Anchor) *</span>
                  </label>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded">
                    Auto-Refill Every Year
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  Every year on this exact date (the employee's work anniversary), their leaves will <strong>automatically refill</strong> to their grade quota without carry-over.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <input
                      type="date"
                      required
                      value={formData.joinedDate}
                      onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                  {formData.joinedDate && (
                    <div className="bg-white/80 border border-amber-200 rounded-xl px-3 py-1.5 flex flex-col justify-center text-[11px] text-amber-950">
                      {(() => {
                        const cycle = calculateLeaveCycle(formData.joinedDate);
                        return (
                          <div>
                            <div className="font-semibold text-amber-900">
                              Next Anniversary Refill: <span className="font-mono text-stone-900">{cycle.nextAnniversaryDate}</span>
                            </div>
                            <div className="text-[10px] text-stone-600">
                              Upcoming Cycle: Year {cycle.yearsOfService + 1}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Quotas */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-stone-700">Initial Leave Balances (Days)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Casual</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.casualLeave}
                      onChange={(e) => setFormData({ ...formData, casualLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Sick</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.sickLeave}
                      onChange={(e) => setFormData({ ...formData, sickLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Annual PTO</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.annualLeave}
                      onChange={(e) => setFormData({ ...formData, annualLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#ede4d6] text-stone-700 border border-[#ded4c5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs cursor-pointer"
                >
                  Save & Register Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT EMPLOYEE PROFILE (HR) */}
      {/* ============================================================ */}
      {editingEmployee && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[#ded4c5] pb-3">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-stone-800" />
                <span>Edit Employee: {editingEmployee.name}</span>
              </h3>
              <p className="text-xs text-stone-600">
                Update personnel records, login credentials, active employment status, and leave allowances.
              </p>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-4">
              {/* Profile Image & Upload Section */}
              <div className="bg-white/80 border border-[#ded4c5] rounded-xl p-3.5 space-y-3">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-stone-600" />
                  <span>Profile Photo & Avatar</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={formData.avatar}
                      alt="Employee preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-stone-800 shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                        formData.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleImageFileSelect}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="text-xs font-semibold bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-stone-600" />
                        <span>Upload New Photo</span>
                      </button>
                      <span className="text-[10px] text-stone-500">Max 5MB (PNG, JPG, WebP)</span>
                    </div>

                    {avatarUploadError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{avatarUploadError}</span>
                      </p>
                    )}

                    {/* Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-stone-500 block">Or select an avatar preset:</span>
                      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                        {AVATAR_PRESETS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Preset avatar"
                            onClick={() => setFormData({ ...formData, avatar: url })}
                            className={`w-8 h-8 rounded-full object-cover cursor-pointer border-2 transition-all shrink-0 ${
                              formData.avatar === url
                                ? 'border-stone-900 ring-2 ring-stone-800 scale-105'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active / Inactive Employment Status Switch */}
              <div
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  formData.isActive
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {formData.isActive ? (
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <UserX className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="text-xs font-bold">
                      {formData.isActive ? 'Active Employee Status' : 'Inactive / Suspended Status'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    {formData.isActive
                      ? 'Employee is currently active in the organization directory.'
                      : 'Account is locked. Employee cannot log in or record attendance.'}
                  </p>
                </div>

                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    formData.isActive ? 'bg-emerald-600' : 'bg-stone-400'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      formData.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* System Login Access Permission Toggle */}
              <div
                onClick={() => setFormData({ ...formData, canLogin: !formData.canLogin })}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  formData.canLogin !== false
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {formData.canLogin !== false ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Ban className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="text-xs font-bold">
                      {formData.canLogin !== false ? 'System Login Allowed' : 'System Login Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    {formData.canLogin !== false
                      ? 'Employee is authorized to log in and access SAATA.'
                      : 'Employee cannot log in or use the system until enabled by HR.'}
                  </p>
                </div>

                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    formData.canLogin !== false ? 'bg-emerald-600' : 'bg-stone-400'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      formData.canLogin !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* 1-Device Hardware Binding Management */}
              <div className="bg-stone-100/70 border border-[#ded4c5] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-stone-600" />
                    <span>1-Device Hardware Binding</span>
                  </label>
                  <span className="text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded">
                    Strict 1:1 Security
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Each employee account is locked to a single physical device. If the employee switches devices, HR must reset this lock.
                </p>
                <div className="bg-white rounded-lg p-2.5 border border-[#ded4c5] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-stone-900">
                      {editingEmployee.deviceId ? (
                        <span>Bound Device: <strong>{editingEmployee.deviceBinding?.deviceName || editingEmployee.deviceId}</strong></span>
                      ) : (
                        <span className="text-stone-500 italic">No hardware device bound yet (will auto-bind on next login)</span>
                      )}
                    </div>
                    {editingEmployee.deviceBinding?.boundAt && (
                      <div className="text-[10px] text-stone-500 font-mono">
                        Bound on: {new Date(editingEmployee.deviceBinding.boundAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {editingEmployee.deviceId && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = resetEmployeeDeviceBinding(editingEmployee.id);
                        showToast(res.message);
                        setEditingEmployee({ ...editingEmployee, deviceId: null, deviceBinding: null });
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Reset Device Lock</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="bg-white/80 border border-[#ded4c5] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#ded4c5]/60 pb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-stone-600" />
                    <span>Login Credentials & Password</span>
                  </label>
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2 py-0.5 rounded">
                    Employee Access
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">Username *</label>
                      {formData.name && (
                        <button
                          type="button"
                          onClick={() => handleAutoSuggestUsername(formData.name)}
                          className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          <span>Suggest</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            username: e.target.value.toLowerCase().replace(/\s+/g, '.'),
                          })
                        }
                        placeholder="e.g. jordan.miller"
                        className="w-full bg-white border border-[#ded4c5] rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">Password</label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span>Reset/Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter new password"
                        className="w-full bg-white border border-[#ded4c5] rounded-xl pl-8 pr-9 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Official Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Engineering & Product">Engineering & Product</option>
                    <option value="Product Design">Product Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Enterprise Sales">Enterprise Sales</option>
                    <option value="Finance & Legal">Finance & Legal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              {/* Assigned Job Grade */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>Assigned Job Grade *</span>
                  <span className="text-[10px] text-stone-500 font-normal">Controls permitted leave types for this employee</span>
                </label>
                <select
                  value={formData.gradeId}
                  onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer font-medium"
                >
                  {gradeDefinitions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gradeCode} — {g.gradeName} {g.gradeNameAr ? `(${g.gradeNameAr})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Role & Access Type</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="employee">Standard Employee</option>
                    <option value="manager">Manager (Approver)</option>
                    <option value="hr">HR Employee (Directory Admin)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Reporting Manager</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    {employees
                      .filter((e) => e.id !== editingEmployee.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role === 'manager' ? 'Manager' : m.department})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date of Joining & Work Anniversary Configuration */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>Date of Joining (Annual Refill Anchor) *</span>
                  </label>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded">
                    Anniversary Engine
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  Every year on this date, this employee's leaves automatically refill to their grade quota with <strong>no carry-over</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <input
                      type="date"
                      required
                      value={formData.joinedDate}
                      onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 font-medium focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                  {formData.joinedDate && (
                    <div className="bg-white/80 border border-amber-200 rounded-xl px-3 py-1.5 flex flex-col justify-center text-[11px] text-amber-950">
                      {(() => {
                        const cycle = calculateLeaveCycle(formData.joinedDate);
                        return (
                          <div>
                            <div className="font-semibold text-amber-900">
                              Next Anniversary: <span className="font-mono text-stone-900">{cycle.nextAnniversaryDate}</span>
                            </div>
                            <div className="text-[10px] text-stone-600">
                              Tenure: {cycle.yearsOfService} {cycle.yearsOfService === 1 ? 'year' : 'years'} completed
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Balances Adjustments & Manual Refill */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Leave Balances (Days)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const quota = getEmployeeAnnualQuota(
                        { ...editingEmployee, gradeId: formData.gradeId },
                        gradeDefinitions,
                        leaveDefinitions
                      );
                      setFormData({
                        ...formData,
                        casualLeave: quota.casual,
                        sickLeave: quota.sick,
                        annualLeave: quota.annual,
                      });
                      showToast(`Reset leave inputs to Grade annual quota!`);
                    }}
                    className="text-[11px] text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-700" />
                    <span>Reset to Annual Quota</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Casual</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.casualLeave}
                      onChange={(e) => setFormData({ ...formData, casualLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Sick</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.sickLeave}
                      onChange={(e) => setFormData({ ...formData, sickLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-medium">Annual PTO</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.annualLeave}
                      onChange={(e) => setFormData({ ...formData, annualLeave: Number(e.target.value) })}
                      className="w-full bg-white border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#ede4d6] text-stone-700 border border-[#ded4c5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ASSIGN GEOFENCES MODAL (HR) */}
      {/* ============================================================ */}
      {locationAssignModalEmp && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="border-b border-[#ded4c5] pb-3">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-stone-800" />
                <span>Assign Authorized Offices</span>
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Select which office locations <strong>{locationAssignModalEmp.name}</strong> is permitted to mark mobile attendance at.
              </p>
            </div>

            {/* Office Location Checkboxes */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {officeLocations.map((loc) => {
                const isSelected = selectedLocationIds.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleToggleLocation(loc.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 border-stone-800 text-stone-50 shadow-xs'
                        : 'bg-white border-[#ded4c5] text-stone-700 hover:bg-[#ede4d6]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }}></span>
                        <span>{loc.name}</span>
                      </div>
                      <span className={`text-[11px] block ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>{loc.address}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-stone-400' : 'text-stone-500'}`}>Geofence Radius: {loc.radiusMeters}m</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-white border-white text-stone-900' : 'border-stone-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ded4c5]">
              <button
                type="button"
                onClick={() => setLocationAssignModalEmp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#ede4d6] text-stone-700 border border-[#ded4c5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLocations}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs transition-colors cursor-pointer"
              >
                Save Authorization Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: DELETE CONFIRMATION */}
      {/* ============================================================ */}
      {deleteConfirmEmpId && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Remove Employee?</h3>
                <p className="text-xs text-stone-600">This action will remove the employee from active records.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ded4c5]">
              <button
                type="button"
                onClick={() => setDeleteConfirmEmpId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-stone-700 border border-[#ded4c5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEmployee(deleteConfirmEmpId)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
