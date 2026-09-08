import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { GradeDefinition } from '../../types';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Search,
  CalendarCheck,
  Globe,
  Check,
} from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7', // Sky
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#be123c', // Rose
  '#475569', // Slate
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
];

export const DefineGrades: React.FC = () => {
  const {
    gradeDefinitions,
    leaveDefinitions,
    updateGradeDefinition,
    addGradeDefinition,
    deleteGradeDefinition,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<GradeDefinition, 'id'>>({
    gradeCode: '',
    gradeName: '',
    gradeNameAr: '',
    color: '#0284c7',
    description: '',
    isActive: true,
    allowedLeaveCodes: [],
  });

  const filteredGrades = gradeDefinitions.filter(
    (g) =>
      g.gradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.gradeNameAr && g.gradeNameAr.includes(searchQuery)) ||
      g.gradeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = gradeDefinitions.filter((g) => g.isActive).length;
  const inactiveCount = gradeDefinitions.filter((g) => !g.isActive).length;

  // Helper to get default leave codes for all active leave definitions
  const allLeaveCodes = leaveDefinitions.filter((l) => l.isActive).map((l) => l.code);

  const handleOpenAdd = () => {
    setFormData({
      gradeCode: '',
      gradeName: '',
      gradeNameAr: '',
      color: PRESET_COLORS[gradeDefinitions.length % PRESET_COLORS.length] || '#0284c7',
      description: '',
      isActive: true,
      allowedLeaveCodes: allLeaveCodes, // Default to all leaves allowed
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (grade: GradeDefinition) => {
    setEditingGrade(grade);
    setFormData({
      gradeCode: grade.gradeCode,
      gradeName: grade.gradeName,
      gradeNameAr: grade.gradeNameAr || '',
      color: grade.color || '#0284c7',
      description: grade.description || '',
      isActive: grade.isActive,
      allowedLeaveCodes: grade.allowedLeaveCodes || allLeaveCodes,
    });
  };

  const handleToggleLeaveCode = (code: string) => {
    const current = formData.allowedLeaveCodes || [];
    if (current.includes(code)) {
      setFormData({
        ...formData,
        allowedLeaveCodes: current.filter((c) => c !== code),
      });
    } else {
      setFormData({
        ...formData,
        allowedLeaveCodes: [...current, code],
      });
    }
  };

  const handleSelectAllLeaves = () => {
    setFormData({
      ...formData,
      allowedLeaveCodes: allLeaveCodes,
    });
  };

  const handleClearAllLeaves = () => {
    setFormData({
      ...formData,
      allowedLeaveCodes: [],
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gradeName.trim() || !formData.gradeCode.trim()) return;
    addGradeDefinition({
      ...formData,
      gradeCode: formData.gradeCode.toUpperCase().trim(),
      gradeName: formData.gradeName.trim(),
      gradeNameAr: formData.gradeNameAr?.trim() || '',
      allowedLeaveCodes: formData.allowedLeaveCodes || allLeaveCodes,
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade || !formData.gradeName.trim() || !formData.gradeCode.trim()) return;
    updateGradeDefinition({
      ...editingGrade,
      ...formData,
      gradeCode: formData.gradeCode.toUpperCase().trim(),
      gradeName: formData.gradeName.trim(),
      gradeNameAr: formData.gradeNameAr?.trim() || '',
      allowedLeaveCodes: formData.allowedLeaveCodes || allLeaveCodes,
    });
    setEditingGrade(null);
  };

  const handleToggleActive = (grade: GradeDefinition) => {
    updateGradeDefinition({
      ...grade,
      isActive: !grade.isActive,
    });
  };

  return (
    <div id="define-grades-module" className="space-y-6">
      {/* Top Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Total Defined Grades</p>
          <p className="text-2xl font-bold text-stone-900">{gradeDefinitions.length}</p>
          <p className="text-[11px] text-stone-600 font-medium">Configured company grade scale</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Active Grades</p>
          <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          <p className="text-[11px] text-stone-600 font-medium">Available for employee profiles</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Disabled Grades</p>
          <p className="text-2xl font-bold text-stone-500">{inactiveCount}</p>
          <p className="text-[11px] text-stone-600 font-medium">Archived or inactive grades</p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-3.5 sm:p-4 rounded-2xl">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="grade-search-input"
            type="text"
            placeholder="Search by grade code, English or Arabic name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#ded4c5] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800"
          />
        </div>

        <button
          type="button"
          id="add-grade-btn"
          onClick={handleOpenAdd}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Grade</span>
        </button>
      </div>

      {/* Grades List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        {/* Table / List Header for Desktop */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3.5 bg-[#ede4d6] border-b border-[#ded4c5] text-[11px] font-bold text-stone-700 uppercase tracking-wider items-center">
          <div className="col-span-2">Grade Code</div>
          <div className="col-span-4">Grade Name (EN / AR)</div>
          <div className="col-span-4">Allowed Leave Types</div>
          <div className="col-span-2 text-right">Status & Actions</div>
        </div>

        {/* List Rows */}
        <div className="divide-y divide-[#ded4c5]">
          {filteredGrades.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              No job grades found matching your search.
            </div>
          ) : (
            filteredGrades.map((grade) => {
              const allowedCodes = grade.allowedLeaveCodes || allLeaveCodes;
              return (
                <div
                  key={grade.id}
                  className={`p-4 sm:p-5 transition-colors hover:bg-[#f1ebe0] ${
                    !grade.isActive ? 'opacity-60 bg-stone-100/60' : 'bg-transparent'
                  }`}
                >
                  {/* Desktop Row View */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                    {/* Col 1: Grade Code & Color Badge */}
                    <div className="col-span-2 flex items-center gap-3">
                      <div
                        className="w-3.5 h-10 rounded-md shrink-0 shadow-2xs"
                        style={{ backgroundColor: grade.color || '#0284c7' }}
                      />
                      <span className="font-mono text-xs font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-900 px-2.5 py-1 rounded-md">
                        {grade.gradeCode}
                      </span>
                    </div>

                    {/* Col 2: Grade Name in English and Arabic */}
                    <div className="col-span-4 space-y-0.5">
                      <h4 className="font-bold text-stone-900 text-sm">{grade.gradeName}</h4>
                      {grade.gradeNameAr ? (
                        <p className="text-xs text-stone-600 font-medium font-sans" dir="rtl">
                          {grade.gradeNameAr}
                        </p>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">No Arabic title defined</span>
                      )}
                      {grade.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">{grade.description}</p>
                      )}
                    </div>

                    {/* Col 3: Allowed Leave Types */}
                    <div className="col-span-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allowedCodes.length === 0 ? (
                          <span className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            No Leaves Permitted
                          </span>
                        ) : (
                          leaveDefinitions
                            .filter((l) => allowedCodes.includes(l.code))
                            .map((l) => (
                              <span
                                key={l.id}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-[#ded4c5] text-stone-800 px-2 py-0.5 rounded-md shadow-2xs"
                                title={`${l.name} (${l.code}) — ${l.annualQuota} days/yr`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: l.color || '#3b82f6' }}
                                />
                                <span>{l.code}</span>
                              </span>
                            ))
                        )}
                        <span className="text-[10px] text-stone-500 font-medium ml-1">
                          ({allowedCodes.length}/{leaveDefinitions.length})
                        </span>
                      </div>
                    </div>

                    {/* Col 4: Status Toggle & Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(grade)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          grade.isActive
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-stone-500 bg-stone-200 hover:bg-stone-300 border border-stone-300'
                        }`}
                        title={grade.isActive ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                      >
                        {grade.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{grade.isActive ? 'Active' : 'Disabled'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(grade)}
                        className="p-1.5 bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer transition-colors"
                        title="Edit Grade"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(grade.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
                        title="Delete Grade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile / Tablet Row View */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-3 h-10 rounded-md shrink-0 mt-0.5"
                          style={{ backgroundColor: grade.color || '#0284c7' }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-900 px-2 py-0.5 rounded-md inline-block">
                              {grade.gradeCode}
                            </span>
                            <h4 className="font-bold text-stone-900 text-sm">{grade.gradeName}</h4>
                          </div>
                          {grade.gradeNameAr && (
                            <p className="text-xs text-stone-600 font-medium font-sans mt-0.5" dir="rtl">
                              {grade.gradeNameAr}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(grade)}
                          className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            grade.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 bg-stone-200'
                          }`}
                        >
                          {grade.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(grade)}
                          className="p-1.5 bg-white border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(grade.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Allowed Leaves */}
                    <div className="bg-white border border-[#ded4c5] p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold">
                        <span>Allowed Leave Types</span>
                        <span>{allowedCodes.length} of {leaveDefinitions.length} allowed</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {leaveDefinitions
                          .filter((l) => allowedCodes.includes(l.code))
                          .map((l) => (
                            <span
                              key={l.id}
                              className="text-[10px] font-semibold bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-1.5 py-0.5 rounded-md"
                            >
                              {l.code}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT GRADE */}
      {/* ========================================================= */}
      {(isAddModalOpen || editingGrade) && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingGrade ? `Edit Grade: ${editingGrade.gradeCode} — ${editingGrade.gradeName}` : 'Add New Job Grade'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingGrade(null);
                }}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingGrade ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs sm:text-sm">
              {/* Grade Code & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-800 text-xs">
                    Grade Code * (e.g. GR-E1)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GR-E1"
                    value={formData.gradeCode}
                    onChange={(e) => setFormData({ ...formData, gradeCode: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-mono font-bold uppercase focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-bold text-stone-800 text-xs">Color Badge</label>
                  <div className="flex items-center gap-2 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          formData.color === c ? 'ring-2 ring-stone-900 scale-115' : 'border-stone-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Multi-language Grade Names: English and Arabic */}
              <div className="bg-white border border-[#ded4c5] p-3.5 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 pb-1 border-b border-[#ded4c5]/60 text-xs font-bold text-stone-800">
                  <Globe className="w-3.5 h-3.5 text-stone-600" />
                  <span>Grade Name & Multi-Language Translation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs">
                      Grade Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Specialist / Lead"
                      value={formData.gradeName}
                      onChange={(e) => setFormData({ ...formData, gradeName: e.target.value })}
                      className="w-full bg-[#fcfbf9] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-stone-800 text-xs flex items-center justify-between">
                      <span>Grade Name (Arabic / الاسم بالعربية)</span>
                      <span className="text-[10px] text-stone-400 font-normal">اختياري</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="مثال: أخصائي أول / مهندس خبير"
                      value={formData.gradeNameAr || ''}
                      onChange={(e) => setFormData({ ...formData, gradeNameAr: e.target.value })}
                      className="w-full bg-[#fcfbf9] border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 font-medium font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Leave Types Allowed for this Grade (Multi-Select / Dropdown Checkbox list) */}
              <div className="bg-white border border-[#ded4c5] p-3.5 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#ded4c5]/60">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-stone-700" />
                    <div>
                      <span className="block text-xs font-bold text-stone-900">
                        Leave Types Allowed for this Grade *
                      </span>
                      <span className="text-[11px] text-stone-500 font-normal">
                        Employees in this grade will only see and apply for the checked leave types
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllLeaves}
                      className="text-[11px] font-semibold text-stone-700 hover:text-stone-900 bg-[#ede4d6] hover:bg-[#e4dac9] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllLeaves}
                      className="text-[11px] font-semibold text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Grid of leave checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {leaveDefinitions.map((leave) => {
                    const isChecked = (formData.allowedLeaveCodes || []).includes(leave.code);
                    return (
                      <label
                        key={leave.id}
                        onClick={() => handleToggleLeaveCode(leave.code)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#f5efe6] border-stone-800 text-stone-900 font-medium'
                            : 'bg-stone-50/50 border-stone-200 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-stone-900 border-stone-900 text-white'
                              : 'bg-white border-stone-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: leave.color || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-semibold leading-tight">{leave.name}</p>
                          <p className="text-[10px] text-stone-500 leading-tight">
                            {leave.code} • {leave.annualQuota}d/yr
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-600 bg-[#f8f5ef] px-3 py-1.5 rounded-lg">
                  <span>Selected Quota:</span>
                  <strong className="font-mono text-stone-900">
                    {(formData.allowedLeaveCodes || []).length} of {leaveDefinitions.length} Leave Types Permitted
                  </strong>
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="block font-semibold text-stone-800 text-xs">Description / Role Scope</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description or role category for this grade..."
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 resize-none text-xs"
                />
              </div>

              {/* Active Toggle */}
              <div className="bg-white rounded-xl p-3 border border-[#ded4c5]">
                <label className="flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer">
                  <div>
                    <span className="block font-bold">Grade Active Status</span>
                    <span className="text-[11px] text-stone-500 font-normal">Enable this grade for employee assignment</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-stone-900 cursor-pointer"
                  />
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingGrade(null);
                  }}
                  className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {editingGrade ? 'Save Changes' : 'Create Grade'}
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
              <h4 className="font-bold text-stone-900">Delete Job Grade?</h4>
              <p className="text-xs text-stone-600">
                Are you sure you want to remove this grade definition from the system?
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
                  deleteGradeDefinition(deleteConfirmId);
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
