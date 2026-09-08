import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { LeaveDefinition } from '../../types';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Search,
  UserCheck,
  Users,
  Paperclip,
  Check,
} from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7', // Sky
  '#16a34a', // Green
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#475569', // Slate
];

export const DefineLeaves: React.FC = () => {
  const {
    leaveDefinitions,
    updateLeaveDefinition,
    addLeaveDefinition,
    deleteLeaveDefinition,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'paid' | 'unpaid' | 'statutory'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<LeaveDefinition, 'id'>>({
    code: '',
    name: '',
    category: 'paid',
    annualQuotaDays: 12,
    minDurationDays: 0.5,
    maxDurationDays: 5,
    maxConsecutiveDays: 5,
    allowAfterDays: 0,
    approvalBy: 'manager_only',
    attachmentMandatory: false,
    carryForwardAllowed: true,
    maxCarryForwardDays: 5,
    encashmentAllowed: false,
    minNoticeDays: 2,
    halfDayAllowed: true,
    docRequiredAfterDays: 0,
    color: '#0284c7',
    description: '',
    isActive: true,
  });

  const filteredLeaves = leaveDefinitions.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalQuota = leaveDefinitions
    .filter((l) => l.isActive && l.category === 'paid')
    .reduce((acc, curr) => acc + curr.annualQuotaDays, 0);

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      category: 'paid',
      annualQuotaDays: 12,
      minDurationDays: 0.5,
      maxDurationDays: 5,
      maxConsecutiveDays: 5,
      allowAfterDays: 0,
      approvalBy: 'manager_only',
      attachmentMandatory: false,
      carryForwardAllowed: true,
      maxCarryForwardDays: 5,
      encashmentAllowed: false,
      minNoticeDays: 2,
      halfDayAllowed: true,
      docRequiredAfterDays: 0,
      color: PRESET_COLORS[leaveDefinitions.length % PRESET_COLORS.length] || '#0284c7',
      description: '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (leave: LeaveDefinition) => {
    setEditingLeave(leave);
    setFormData({
      code: leave.code,
      name: leave.name,
      category: leave.category,
      annualQuotaDays: leave.annualQuotaDays,
      minDurationDays: leave.minDurationDays ?? (leave.halfDayAllowed ? 0.5 : 1),
      maxDurationDays: leave.maxDurationDays ?? leave.maxConsecutiveDays ?? 14,
      maxConsecutiveDays: leave.maxDurationDays ?? leave.maxConsecutiveDays ?? 14,
      allowAfterDays: leave.allowAfterDays ?? 0,
      approvalBy: leave.approvalBy ?? 'manager_only',
      attachmentMandatory: leave.attachmentMandatory ?? false,
      carryForwardAllowed: leave.carryForwardAllowed,
      maxCarryForwardDays: leave.maxCarryForwardDays,
      encashmentAllowed: leave.encashmentAllowed,
      minNoticeDays: leave.minNoticeDays,
      halfDayAllowed: leave.halfDayAllowed,
      docRequiredAfterDays: leave.docRequiredAfterDays,
      color: leave.color,
      description: leave.description || '',
      isActive: leave.isActive,
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;
    addLeaveDefinition({
      ...formData,
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      maxConsecutiveDays: formData.maxDurationDays,
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave || !formData.name.trim() || !formData.code.trim()) return;
    updateLeaveDefinition({
      ...editingLeave,
      ...formData,
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      maxConsecutiveDays: formData.maxDurationDays,
    });
    setEditingLeave(null);
  };

  const handleToggleActive = (leave: LeaveDefinition) => {
    updateLeaveDefinition({
      ...leave,
      isActive: !leave.isActive,
    });
  };

  return (
    <div id="define-leaves-module" className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Leave Types</p>
          <p className="text-2xl font-bold text-stone-900">{leaveDefinitions.length}</p>
          <p className="text-[11px] text-stone-600 font-medium">{leaveDefinitions.filter((l) => l.isActive).length} Active policies</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Standard Paid PTO</p>
          <p className="text-2xl font-bold text-emerald-700">{totalQuota} <span className="text-sm font-normal text-stone-600">days/yr</span></p>
          <p className="text-[11px] text-stone-600 font-medium">Cumulative paid allowance</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Mandatory Proof</p>
          <p className="text-2xl font-bold text-amber-700">
            {leaveDefinitions.filter((l) => l.attachmentMandatory).length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Types requiring doc upload</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Dual Approvals</p>
          <p className="text-2xl font-bold text-purple-700">
            {leaveDefinitions.filter((l) => l.approvalBy === 'both').length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Manager & HR multi-level</p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-3.5 sm:p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="leave-search-input"
              type="text"
              placeholder="Search leave name, code (e.g., CL, Sick, Vacation)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#ded4c5] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800"
            />
          </div>

          <select
            id="leave-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="paid">Paid Leaves</option>
            <option value="unpaid">Unpaid (LOP)</option>
            <option value="statutory">Statutory Policies</option>
          </select>
        </div>

        <button
          type="button"
          id="add-leave-type-btn"
          onClick={handleOpenAdd}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Leave Type</span>
        </button>
      </div>

      {/* Leave Types List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        {/* Table / List Header for Desktop */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3.5 bg-[#ede4d6] border-b border-[#ded4c5] text-[11px] font-bold text-stone-700 uppercase tracking-wider items-center">
          <div className="col-span-3">Leave Code & Name</div>
          <div className="col-span-2">Category & Quota</div>
          <div className="col-span-3">Duration Limits & Eligibility</div>
          <div className="col-span-2">Approval & Attachment</div>
          <div className="col-span-2 text-right">Status & Actions</div>
        </div>

        {/* List Rows */}
        <div className="divide-y divide-[#ded4c5]">
          {filteredLeaves.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              No leave definitions found matching the current search or category filter.
            </div>
          ) : (
            filteredLeaves.map((leave) => {
              const minDur = leave.minDurationDays ?? (leave.halfDayAllowed ? 0.5 : 1);
              const maxDur = leave.maxDurationDays ?? leave.maxConsecutiveDays ?? 14;
              const allowAfter = leave.allowAfterDays ?? 0;
              const approval = leave.approvalBy ?? 'manager_only';
              const attachReq = leave.attachmentMandatory ?? false;

              return (
                <div
                  key={leave.id}
                  className={`p-4 sm:p-5 transition-colors hover:bg-[#f1ebe0] ${
                    !leave.isActive ? 'opacity-60 bg-stone-100/60' : 'bg-transparent'
                  }`}
                >
                  {/* Desktop Row View */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                    {/* Col 1: Leave Code & Name */}
                    <div className="col-span-3 flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0"
                        style={{ backgroundColor: leave.color }}
                      >
                        {leave.code}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-900 text-sm truncate">{leave.name}</h4>
                        <p className="text-[11px] text-stone-500 truncate" title={leave.description}>
                          {leave.description || 'No description provided'}
                        </p>
                      </div>
                    </div>

                    {/* Col 2: Category & Annual Quota */}
                    <div className="col-span-2 space-y-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          leave.category === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : leave.category === 'statutory'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          leave.category === 'paid' ? 'bg-emerald-600' : leave.category === 'statutory' ? 'bg-purple-600' : 'bg-rose-600'
                        }`} />
                        {leave.category}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-stone-900">{leave.annualQuotaDays}</span>
                        <span className="text-[11px] text-stone-500 font-medium">days/year</span>
                      </div>
                    </div>

                    {/* Col 3: Duration Limits & Allow After Days */}
                    <div className="col-span-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-stone-800">
                        <span className="font-medium text-stone-500">Duration:</span>
                        <span className="font-bold bg-white border border-[#ded4c5] px-1.5 py-0.5 rounded text-[11px]">
                          Min {minDur}d
                        </span>
                        <span className="text-stone-400">–</span>
                        <span className="font-bold bg-white border border-[#ded4c5] px-1.5 py-0.5 rounded text-[11px]">
                          Max {maxDur}d
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                        <span>
                          {allowAfter === 0 ? (
                            <span className="text-emerald-700 font-semibold">Allowed from Day 1</span>
                          ) : (
                            <span>
                              Allowed after <strong className="text-stone-900">{allowAfter} days</strong> of joining
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Col 4: Approval & Attachment Mandatory */}
                    <div className="col-span-2 space-y-1.5">
                      <div>
                        {approval === 'manager_only' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span>Manager Only</span>
                          </span>
                        )}
                        {approval === 'hr_only' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>HR Only</span>
                          </span>
                        )}
                        {approval === 'both' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md">
                            <Users className="w-3 h-3 text-purple-600" />
                            <span>Both (Mgr & HR)</span>
                          </span>
                        )}
                      </div>

                      <div>
                        {attachReq ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                            <Paperclip className="w-2.5 h-2.5 text-rose-600" />
                            <span>Attachment Mandatory</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">Doc Optional</span>
                        )}
                      </div>
                    </div>

                    {/* Col 5: Status Toggle & Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(leave)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          leave.isActive
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-stone-500 bg-stone-200 hover:bg-stone-300 border border-stone-300'
                        }`}
                        title={leave.isActive ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                      >
                        {leave.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{leave.isActive ? 'Active' : 'Disabled'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(leave)}
                        className="p-1.5 bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(leave.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
                        title="Delete Leave Type"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile / Tablet Card-Row View */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0"
                          style={{ backgroundColor: leave.color }}
                        >
                          {leave.code}
                        </span>
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm leading-snug">{leave.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                leave.category === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : leave.category === 'statutory'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {leave.category}
                            </span>
                            <span className="text-[11px] font-bold text-stone-800">
                              {leave.annualQuotaDays} Days/yr
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(leave)}
                          className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            leave.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 bg-stone-200'
                          }`}
                        >
                          {leave.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(leave)}
                          className="p-1.5 bg-white border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(leave.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600">{leave.description}</p>

                    <div className="bg-white p-2.5 rounded-xl border border-[#ded4c5] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">Duration Limits</span>
                        <span className="font-bold text-stone-900">Min {minDur}d – Max {maxDur}d</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Eligibility</span>
                        <span className="font-medium text-stone-900">
                          {allowAfter === 0 ? 'Day 1' : `After ${allowAfter} days`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="bg-white border border-[#ded4c5] text-stone-700 px-2 py-0.5 rounded-md font-medium">
                        Approval: {approval === 'manager_only' ? 'Manager Only' : approval === 'hr_only' ? 'HR Only' : 'Both (Mgr + HR)'}
                      </span>
                      {attachReq && (
                        <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                          Attachment Mandatory
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT LEAVE DEFINITION */}
      {/* ========================================================= */}
      {(isAddModalOpen || editingLeave) && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingLeave ? `Edit Leave: ${editingLeave.name}` : 'Define New Leave Type'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLeave(null);
                }}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingLeave ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs sm:text-sm">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Leave Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Compensatory Leave"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Code * (e.g. CL)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="CO"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-mono font-bold uppercase focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Leave Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-800 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="paid">Paid Leave</option>
                    <option value="unpaid">Unpaid / Loss of Pay (LOP)</option>
                    <option value="statutory">Statutory / Regulatory</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Badge Accent Color</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          formData.color === c ? 'ring-2 ring-stone-900 scale-110' : 'border-stone-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Quota & Durations (Min, Max, Allow After) */}
              <div className="bg-white rounded-2xl p-4 border border-[#ded4c5] space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-[#ded4c5] pb-1.5">
                  Quota & Duration Constraints
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs">Annual Quota</label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={formData.annualQuotaDays}
                      onChange={(e) => setFormData({ ...formData, annualQuotaDays: Number(e.target.value) })}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                    />
                    <span className="text-[10px] text-stone-400 block">Days per year</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs">Min Duration</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={365}
                      value={formData.minDurationDays}
                      onChange={(e) => setFormData({ ...formData, minDurationDays: Number(e.target.value) })}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                    />
                    <span className="text-[10px] text-stone-400 block">Min days / req</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs">Max Duration</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.maxDurationDays}
                      onChange={(e) => setFormData({ ...formData, maxDurationDays: Number(e.target.value) })}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                    />
                    <span className="text-[10px] text-stone-400 block">Max days / req</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs">Allow After</label>
                    <input
                      type="number"
                      min={0}
                      max={730}
                      value={formData.allowAfterDays}
                      onChange={(e) => setFormData({ ...formData, allowAfterDays: Number(e.target.value) })}
                      className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                    />
                    <span className="text-[10px] text-stone-400 block">Days after joining</span>
                  </div>
                </div>
              </div>

              {/* Approval Authority & Verification (Compact) */}
              <div className="bg-white rounded-xl p-3 border border-[#ded4c5] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#ded4c5] pb-1">
                  <h4 className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Approval Authority & Verification
                  </h4>
                  <span className="text-[10px] text-stone-400">Workflow & docs</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-stone-700 text-[11px]">Approval Workflow</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, approvalBy: 'manager_only' })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.approvalBy === 'manager_only'
                          ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-500 shadow-2xs'
                          : 'bg-[#f8f5ef] border-[#ded4c5] text-stone-700 hover:bg-[#ede4d6]'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">Manager Only</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, approvalBy: 'hr_only' })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.approvalBy === 'hr_only'
                          ? 'bg-amber-50 border-amber-400 text-amber-900 ring-1 ring-amber-500 shadow-2xs'
                          : 'bg-[#f8f5ef] border-[#ded4c5] text-stone-700 hover:bg-[#ede4d6]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">HR Only</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, approvalBy: 'both' })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        formData.approvalBy === 'both'
                          ? 'bg-purple-50 border-purple-400 text-purple-900 ring-1 ring-purple-500 shadow-2xs'
                          : 'bg-[#f8f5ef] border-[#ded4c5] text-stone-700 hover:bg-[#ede4d6]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">Both (Mgr + HR)</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#ded4c5]/60 flex items-center justify-between text-xs cursor-pointer">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-800">
                    <input
                      type="checkbox"
                      checked={formData.attachmentMandatory}
                      onChange={(e) => setFormData({ ...formData, attachmentMandatory: e.target.checked })}
                      className="w-3.5 h-3.5 accent-stone-900 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5 font-medium text-xs">
                      <Paperclip className="w-3.5 h-3.5 text-stone-500" />
                      <span>Attachment / Certificate Mandatory</span>
                    </span>
                  </label>
                  <span className="text-[10px] text-stone-400">Enforce upload</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-stone-800 text-xs">Policy Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain eligibility, restrictions, or company guidelines..."
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLeave(null);
                  }}
                  className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {editingLeave ? 'Save Changes' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-stone-900">Delete Leave Type?</h4>
              <p className="text-xs text-stone-600">
                Are you sure you want to remove this leave policy definition? Employees will no longer be able to select it for new requests.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLeaveDefinition(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
