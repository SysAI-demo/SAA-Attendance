import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { HolidayDefinition } from '../../types';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Globe,
  AlertCircle,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';

export const DefineHolidays: React.FC = () => {
  const {
    holidayDefinitions,
    updateHolidayDefinition,
    addHolidayDefinition,
    deleteHolidayDefinition,
    officeLocations,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'optional' | 'restricted' | 'company'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayDefinition | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<HolidayDefinition, 'id'>>({
    name: '',
    date: '2026-01-01',
    dayOfWeek: 'Thursday',
    type: 'public',
    applicableLocationIds: ['all'],
    description: '',
    isRecurringYearly: true,
    isActive: true,
  });

  const getDayOfWeekFromDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      return 'Monday';
    }
  };

  const filteredHolidays = holidayDefinitions
    .filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.date.includes(searchQuery);
      const matchesType = typeFilter === 'all' || h.type === typeFilter;
      const matchesYear = selectedYear === 'all' || h.date.startsWith(selectedYear);
      return matchesSearch && matchesType && matchesYear;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      date: '2026-08-25',
      dayOfWeek: getDayOfWeekFromDate('2026-08-25'),
      type: 'public',
      applicableLocationIds: ['all'],
      description: '',
      isRecurringYearly: true,
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (hol: HolidayDefinition) => {
    setEditingHoliday(hol);
    setFormData({
      name: hol.name,
      date: hol.date,
      dayOfWeek: hol.dayOfWeek,
      type: hol.type,
      applicableLocationIds: [...hol.applicableLocationIds],
      description: hol.description,
      isRecurringYearly: hol.isRecurringYearly,
      isActive: hol.isActive,
    });
  };

  const handleDateChange = (newDate: string) => {
    setFormData({
      ...formData,
      date: newDate,
      dayOfWeek: getDayOfWeekFromDate(newDate),
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) return;
    addHolidayDefinition({
      ...formData,
      name: formData.name.trim(),
    });
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday || !formData.name.trim() || !formData.date) return;
    updateHolidayDefinition({
      ...editingHoliday,
      ...formData,
      name: formData.name.trim(),
    });
    setEditingHoliday(null);
  };

  const handleToggleActive = (hol: HolidayDefinition) => {
    updateHolidayDefinition({
      ...hol,
      isActive: !hol.isActive,
    });
  };

  const handleLocationToggle = (locId: string) => {
    let current = [...formData.applicableLocationIds];
    if (locId === 'all') {
      current = ['all'];
    } else {
      current = current.filter((id) => id !== 'all');
      if (current.includes(locId)) {
        current = current.filter((id) => id !== locId);
        if (current.length === 0) current = ['all'];
      } else {
        current.push(locId);
      }
    }
    setFormData({ ...formData, applicableLocationIds: current });
  };

  const formatHolidayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="define-holidays-module" className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Total Holidays</p>
          <p className="text-2xl font-bold text-stone-900">{holidayDefinitions.length}</p>
          <p className="text-[11px] text-stone-600 font-medium">In master calendar</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Public Holidays</p>
          <p className="text-2xl font-bold text-emerald-700">
            {holidayDefinitions.filter((h) => h.type === 'public').length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Mandatory paid closures</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Optional / Floating</p>
          <p className="text-2xl font-bold text-amber-700">
            {holidayDefinitions.filter((h) => h.type === 'optional' || h.type === 'restricted').length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Employee choice holidays</p>
        </div>

        <div className="bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Company Special</p>
          <p className="text-2xl font-bold text-purple-700">
            {holidayDefinitions.filter((h) => h.type === 'company').length}
          </p>
          <p className="text-[11px] text-stone-600 font-medium">Black Friday / Founder Day</p>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-3.5 sm:p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <input
            id="holiday-search-input"
            type="text"
            placeholder="Search holiday name, month, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[180px] bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800"
          />

          <select
            id="holiday-year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
          >
            <option value="2026">Year 2026</option>
            <option value="2027">Year 2027</option>
            <option value="all">All Calendar Years</option>
          </select>

          <select
            id="holiday-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-700 focus:outline-hidden focus:border-stone-800 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="public">Public / National</option>
            <option value="optional">Optional / Floating</option>
            <option value="company">Company Specific</option>
          </select>
        </div>

        <button
          type="button"
          id="add-holiday-btn"
          onClick={handleOpenAdd}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Holiday</span>
        </button>
      </div>

      {/* Holiday Calendar List View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        {/* Table / List Header for Desktop */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3 bg-[#ede4d6] border-b border-[#ded4c5] text-[11px] font-bold text-stone-700 uppercase tracking-wider items-center">
          <div className="col-span-2">Date & Day</div>
          <div className="col-span-3">Holiday Name & Type</div>
          <div className="col-span-3">Description & Notes</div>
          <div className="col-span-2">Applicable Locations</div>
          <div className="col-span-2 text-right">Status & Actions</div>
        </div>

        {/* List Rows */}
        <div className="divide-y divide-[#ded4c5]">
          {filteredHolidays.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              No holidays found matching your criteria.
            </div>
          ) : (
            filteredHolidays.map((hol) => (
              <div
                key={hol.id}
                className={`p-4 sm:p-5 transition-colors hover:bg-[#f1ebe0] ${
                  !hol.isActive ? 'opacity-60 bg-stone-100/60' : 'bg-transparent'
                }`}
              >
                {/* Desktop Row View */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                  {/* Col 1: Date & Day Badge */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="bg-white border border-[#ded4c5] rounded-xl p-1.5 w-12 text-center shadow-2xs shrink-0">
                      <span className="text-[9px] font-bold uppercase text-stone-500 block leading-tight">
                        {new Date(hol.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-black text-stone-900 block leading-none">
                        {new Date(hol.date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-xs font-semibold text-stone-900 block">
                        {new Date(hol.date + 'T00:00:00').getFullYear()}
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">{hol.dayOfWeek}</span>
                    </div>
                  </div>

                  {/* Col 2: Holiday Name & Type Badge */}
                  <div className="col-span-3">
                    <h4 className="font-bold text-stone-900 text-sm">{hol.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                          hol.type === 'public'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : hol.type === 'optional'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}
                      >
                        {hol.type} Holiday
                      </span>
                      {hol.isRecurringYearly && (
                        <span className="text-[9px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded">
                          Annual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Description */}
                  <div className="col-span-3 text-xs text-stone-600 line-clamp-2" title={hol.description}>
                    {hol.description}
                  </div>

                  {/* Col 4: Applicable Locations */}
                  <div className="col-span-2 flex items-center gap-1.5 text-xs text-stone-700">
                    <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate font-medium" title={
                      hol.applicableLocationIds.includes('all')
                        ? 'All Office Locations'
                        : hol.applicableLocationIds
                            .map((id) => officeLocations.find((l) => l.id === id)?.name || id)
                            .join(', ')
                    }>
                      {hol.applicableLocationIds.includes('all')
                        ? 'All Locations'
                        : hol.applicableLocationIds
                            .map((id) => officeLocations.find((l) => l.id === id)?.name || id)
                            .join(', ')}
                    </span>
                  </div>

                  {/* Col 5: Status Toggle & Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(hol)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                        hol.isActive
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-stone-500 bg-stone-200 hover:bg-stone-300 border border-stone-300'
                      }`}
                      title={hol.isActive ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                    >
                      {hol.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{hol.isActive ? 'Active' : 'Disabled'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(hol)}
                      className="p-1.5 bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer transition-colors"
                      title="Edit Holiday"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(hol.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile / Tablet Card-Row View */}
                <div className="lg:hidden space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-[#ded4c5] rounded-xl p-1.5 w-12 text-center shadow-2xs shrink-0">
                        <span className="text-[9px] font-bold uppercase text-stone-500 block leading-tight">
                          {new Date(hol.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base font-black text-stone-900 block leading-none">
                          {new Date(hol.date + 'T00:00:00').getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm leading-snug">{hol.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold text-stone-600">{hol.dayOfWeek}</span>
                          <span className="text-stone-300">•</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                              hol.type === 'public'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : hol.type === 'optional'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {hol.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(hol)}
                        className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          hol.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 bg-stone-200'
                        }`}
                      >
                        {hol.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(hol)}
                        className="p-1.5 bg-white border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(hol.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600">{hol.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-stone-700 bg-white p-2 rounded-lg border border-[#ded4c5]">
                    <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>
                      {hol.applicableLocationIds.includes('all')
                        ? 'All Locations'
                        : hol.applicableLocationIds
                            .map((id) => officeLocations.find((l) => l.id === id)?.name || id)
                            .join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT HOLIDAY */}
      {/* ========================================================= */}
      {(isAddModalOpen || editingHoliday) && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingHoliday ? `Edit Holiday: ${editingHoliday.name}` : 'Add Company Holiday'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingHoliday(null);
                }}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingHoliday ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block font-semibold text-stone-800 text-xs">Holiday Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Holiday Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  />
                  <span className="text-[11px] text-stone-500 font-medium">Day: {formData.dayOfWeek}</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Holiday Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-800 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    <option value="public">Mandatory Public Holiday</option>
                    <option value="optional">Optional / Floating Holiday</option>
                    <option value="company">Company Specific Holiday</option>
                    <option value="restricted">Restricted Cultural Holiday</option>
                  </select>
                </div>
              </div>

              {/* Office Location Applicability */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#ded4c5] space-y-2">
                <label className="block font-semibold text-stone-800 text-xs">Applicable Office Locations</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLocationToggle('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formData.applicableLocationIds.includes('all')
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-[#f8f5ef] text-stone-700 border-[#ded4c5] hover:bg-[#ede4d6]'
                    }`}
                  >
                    All Locations
                  </button>

                  {officeLocations.map((loc) => {
                    const isSelected =
                      !formData.applicableLocationIds.includes('all') &&
                      formData.applicableLocationIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleLocationToggle(loc.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                            : 'bg-[#f8f5ef] text-stone-700 border-[#ded4c5] hover:bg-[#ede4d6]'
                        }`}
                      >
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#ded4c5] space-y-2">
                <label className="flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer">
                  <span>Recurring Yearly on Same Date</span>
                  <input
                    type="checkbox"
                    checked={formData.isRecurringYearly}
                    onChange={(e) => setFormData({ ...formData, isRecurringYearly: e.target.checked })}
                    className="w-4 h-4 accent-stone-900 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-stone-800 text-xs">Description & Observance Note</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details regarding holiday significance or office closure arrangements..."
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingHoliday(null);
                  }}
                  className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {editingHoliday ? 'Save Changes' : 'Add Holiday'}
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
              <h4 className="font-bold text-stone-900">Remove Holiday?</h4>
              <p className="text-xs text-stone-600">
                Are you sure you want to delete this holiday from the company calendar?
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
                  deleteHolidayDefinition(deleteConfirmId);
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
