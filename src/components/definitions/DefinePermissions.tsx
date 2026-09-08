import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { PermissionDefinition } from '../../types';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  X,
  UserCheck,
  DollarSign,
} from 'lucide-react';

export const DefinePermissions: React.FC = () => {
  const {
    permissionDefinitions,
    updatePermissionDefinition,
    addPermissionDefinition,
    deletePermissionDefinition,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<PermissionDefinition, 'id'>>({
    code: '',
    name: '',
    maxPerMonth: 2,
    maxHoursPerInstance: 2.0,
    monthlyHoursCap: 4.0,
    requiresManagerApproval: true,
    isPaid: true,
    allowedTimeWindow: 'any',
    description: '',
    isActive: true,
  });

  const filteredPerms = permissionDefinitions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      maxPerMonth: 2,
      maxHoursPerInstance: 2.0,
      monthlyHoursCap: 4.0,
      requiresManagerApproval: true,
      isPaid: true,
      allowedTimeWindow: 'any',
      description: '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (perm: PermissionDefinition) => {
    setEditingPermission(perm);
    setFormData({
      code: perm.code,
      name: perm.name,
      maxPerMonth: perm.maxPerMonth,
      maxHoursPerInstance: perm.maxHoursPerInstance,
      monthlyHoursCap: perm.monthlyHoursCap,
      requiresManagerApproval: perm.requiresManagerApproval,
      isPaid: perm.isPaid,
      allowedTimeWindow: perm.allowedTimeWindow,
      description: perm.description,
      isActive: perm.isActive,
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;
    addPermissionDefinition({
      ...formData,
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermission || !formData.name.trim() || !formData.code.trim()) return;
    updatePermissionDefinition({
      ...editingPermission,
      ...formData,
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
    });
    setEditingPermission(null);
  };

  const handleToggleActive = (perm: PermissionDefinition) => {
    updatePermissionDefinition({
      ...perm,
      isActive: !perm.isActive,
    });
  };

  const getTimeWindowLabel = (win: string) => {
    switch (win) {
      case 'start_of_day':
        return 'Morning / Shift Start';
      case 'mid_day':
        return 'Mid-Day Working Hours';
      case 'end_of_day':
        return 'Evening / Shift End';
      default:
        return 'Any Shift Window';
    }
  };

  return (
    <div id="define-permissions-module" className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Permission Categories</p>
          <p className="text-2xl font-bold text-stone-900">{permissionDefinitions.length}</p>
          <p className="text-[11px] text-stone-600 font-medium">{permissionDefinitions.filter((p) => p.isActive).length} Active policies</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Average Monthly Limit</p>
          <p className="text-2xl font-bold text-blue-700">2–3 <span className="text-sm font-normal text-stone-600">slips/mo</span></p>
          <p className="text-[11px] text-stone-600 font-medium">Standard employee quota</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Manager Approval</p>
          <p className="text-2xl font-bold text-amber-700">
            {permissionDefinitions.filter((p) => p.requiresManagerApproval).length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Require supervisor signoff</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Paid Short Leaves</p>
          <p className="text-2xl font-bold text-emerald-700">
            {permissionDefinitions.filter((p) => p.isPaid).length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">No payroll deductions</p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-3.5 sm:p-4 rounded-2xl">
        <div className="flex-1 min-w-[260px]">
          <input
            id="perm-search-input"
            type="text"
            placeholder="Search permission by name, duty code, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800"
          />
        </div>

        <button
          type="button"
          id="add-permission-type-btn"
          onClick={handleOpenAdd}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Define Permission Policy</span>
        </button>
      </div>

      {/* Permission Types List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        {/* Table / List Header for Desktop */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3 bg-[#ede4d6] border-b border-[#ded4c5] text-[11px] font-bold text-stone-700 uppercase tracking-wider items-center">
          <div className="col-span-3">Permission Code & Name</div>
          <div className="col-span-2">Type & Compensation</div>
          <div className="col-span-2">Monthly Limit & Cap</div>
          <div className="col-span-3">Shift Window & Approval</div>
          <div className="col-span-2 text-right">Status & Actions</div>
        </div>

        {/* List Rows */}
        <div className="divide-y divide-[#ded4c5]">
          {filteredPerms.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              No permission definitions found matching your search.
            </div>
          ) : (
            filteredPerms.map((perm) => (
              <div
                key={perm.id}
                className={`p-4 sm:p-5 transition-colors hover:bg-[#f1ebe0] ${
                  !perm.isActive ? 'opacity-60 bg-stone-100/60' : 'bg-transparent'
                }`}
              >
                {/* Desktop Row View */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                  {/* Col 1: Code & Name */}
                  <div className="col-span-3 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-2.5 py-1 rounded-lg shrink-0">
                      {perm.code}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 text-sm truncate">{perm.name}</h4>
                      <p className="text-[11px] text-stone-500 truncate" title={perm.description}>
                        {perm.description}
                      </p>
                    </div>
                  </div>

                  {/* Col 2: Type / Paid */}
                  <div className="col-span-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                        perm.isPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${perm.isPaid ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {perm.isPaid ? 'Paid Pass' : 'Unpaid (LOP)'}
                    </span>
                  </div>

                  {/* Col 3: Limits */}
                  <div className="col-span-2 space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-stone-900">{perm.maxPerMonth}</span>
                      <span className="text-xs text-stone-600 font-medium">slips / mo</span>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Max {perm.maxHoursPerInstance}h / slip (Cap: {perm.monthlyHoursCap}h/mo)
                    </p>
                  </div>

                  {/* Col 4: Time Window & Approval */}
                  <div className="col-span-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-stone-800 font-medium">
                      <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      <span className="truncate">{getTimeWindowLabel(perm.allowedTimeWindow)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                          perm.requiresManagerApproval
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        {perm.requiresManagerApproval ? 'Manager Signoff Required' : 'Auto-Approved Pass'}
                      </span>
                    </div>
                  </div>

                  {/* Col 5: Status Toggle & Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(perm)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                        perm.isActive
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-stone-500 bg-stone-200 hover:bg-stone-300 border border-stone-300'
                      }`}
                      title={perm.isActive ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                    >
                      {perm.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{perm.isActive ? 'Active' : 'Disabled'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(perm)}
                      className="p-1.5 bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer transition-colors"
                      title="Edit Policy"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(perm.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile / Tablet Card-Row View */}
                <div className="lg:hidden space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-2 py-0.5 rounded-md">
                          {perm.code}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                            perm.isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {perm.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm">{perm.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(perm)}
                        className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          perm.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 bg-stone-200'
                        }`}
                      >
                        {perm.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(perm)}
                        className="p-1.5 bg-white border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(perm.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600">{perm.description}</p>

                  <div className="flex flex-wrap gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-[#ded4c5]">
                    <span className="font-semibold text-stone-800">{perm.maxPerMonth} slips/mo</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-600">Max {perm.maxHoursPerInstance}h / slip</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-600">{getTimeWindowLabel(perm.allowedTimeWindow)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PERMISSION DEFINITION */}
      {/* ========================================================= */}
      {(isAddModalOpen || editingPermission) && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingPermission ? `Edit: ${editingPermission.name}` : 'Define Permission Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPermission(null);
                }}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingPermission ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Permission Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Official Duty / Client Visit"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="PERM_CLIENT"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-mono font-bold uppercase focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Max Slips / Mo</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.maxPerMonth}
                    onChange={(e) => setFormData({ ...formData, maxPerMonth: Number(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Max Hrs / Pass</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={8}
                    value={formData.maxHoursPerInstance}
                    onChange={(e) => setFormData({ ...formData, maxHoursPerInstance: Number(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Monthly Cap (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={24}
                    value={formData.monthlyHoursCap}
                    onChange={(e) => setFormData({ ...formData, monthlyHoursCap: Number(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Allowed Shift Window</label>
                  <select
                    value={formData.allowedTimeWindow}
                    onChange={(e) => setFormData({ ...formData, allowedTimeWindow: e.target.value as any })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-800 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="any">Any Time During Shift</option>
                    <option value="start_of_day">Beginning of Shift (Late Arrival)</option>
                    <option value="mid_day">Mid-Day (Intermittent Exit)</option>
                    <option value="end_of_day">End of Shift (Early Departure)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Pay Treatment</label>
                  <select
                    value={formData.isPaid ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.value === 'true' })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-800 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="true">Paid Permission (No Salary Deduction)</option>
                    <option value="false">Unpaid Pass (Pro-rata Deduction)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#ded4c5] space-y-2.5">
                <label className="flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer">
                  <span>Require Reporting Manager Approval</span>
                  <input
                    type="checkbox"
                    checked={formData.requiresManagerApproval}
                    onChange={(e) => setFormData({ ...formData, requiresManagerApproval: e.target.checked })}
                    className="w-4 h-4 accent-stone-900 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-stone-800 text-xs">Description & Guidelines</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details on what triggers or qualifies for this permission category..."
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingPermission(null);
                  }}
                  className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {editingPermission ? 'Save Changes' : 'Create Policy'}
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
              <h4 className="font-bold text-stone-900">Delete Permission Category?</h4>
              <p className="text-xs text-stone-600">
                Are you sure you want to remove this permission policy? Existing records remain preserved.
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
                  deletePermissionDefinition(deleteConfirmId);
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
