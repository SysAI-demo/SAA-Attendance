import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Building2,
  Plus,
  Compass,
  CheckCircle2,
  Users,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { GeofenceMap } from './GeofenceMap';

export const OfficeLocationsView: React.FC = () => {
  const { officeLocations, addOfficeLocation, employees, attendanceRecords, isCurrentHR, currentEmployee } = useAttendance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    radiusMeters: 200,
    timezone: 'PST (UTC-8)',
    color: '#3b82f6',
    description: '',
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security check: Only accessible by HR and super admin
  if (!isCurrentHR) {
    return (
      <div id="geofences-access-restricted" className="max-w-4xl mx-auto my-8 p-8 bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-stone-900">Restricted Administrator Module</h2>
          <p className="text-xs text-stone-600">
            Office Geofence definitions can only be accessed and modified by authorized HR Managers and Super Administrators.
          </p>
          <p className="text-xs text-stone-500 font-mono pt-1">
            Current Profile: {currentEmployee.name} ({currentEmployee.role.toUpperCase()})
          </p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((r) => r.date === todayStr);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;

    addOfficeLocation({
      ...form,
      isActive: true,
    });

    setSuccessMsg(`Added new office geofence "${form.name}"!`);
    setTimeout(() => setSuccessMsg(null), 3000);
    setShowAddModal(false);
    setForm({
      name: '',
      code: '',
      address: '',
      city: 'San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 200,
      timezone: 'PST (UTC-8)',
      color: '#3b82f6',
      description: '',
    });
  };

  return (
    <div id="office-locations-view" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-stone-800" />
              <span>Office Geofence Definitions</span>
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>HR & Admin Only</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Configured physical branches, GPS coordinates, and enforced boundary radii.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Office Branch</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Interactive Global Geofence Map View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-stone-700" />
            <span>Live Geofence Map Overview</span>
          </h3>
          <span className="text-xs text-stone-500">Showing all {officeLocations.length} configured locations</span>
        </div>
        <GeofenceMap height="340px" allowClickToTeleport={true} />
      </div>

      {/* Locations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officeLocations.map((loc) => {
          const assignedStaff = employees.filter((e) => e.allowedLocationIds.includes(loc.id));
          const attendeesNow = todayAttendance.filter(
            (a) => a.officeLocationId === loc.id && (!a.checkOutTime || a.status === 'active')
          );

          return (
            <div
              key={loc.id}
              className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs font-bold text-base shrink-0"
                    style={{ backgroundColor: loc.color }}
                  >
                    🏢
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base leading-tight">{loc.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono bg-[#ede4d6] text-stone-800 px-1.5 py-0.5 rounded border border-[#ded4c5]">
                        {loc.code}
                      </span>
                      <span className="text-xs text-stone-500">{loc.city}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                  Active Geofence
                </span>
              </div>

              <p className="text-xs text-stone-700 bg-white/80 p-2.5 rounded-xl border border-[#ded4c5]">
                {loc.description}
              </p>

              {/* Coordinates and Geofence Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="bg-[#ede4d6] p-2 rounded-lg border border-[#ded4c5]">
                  <span className="text-[10px] text-stone-500 block">Radius Zone</span>
                  <span className="text-stone-900 font-bold">{loc.radiusMeters} Meters</span>
                </div>
                <div className="bg-[#ede4d6] p-2 rounded-lg border border-[#ded4c5]">
                  <span className="text-[10px] text-stone-500 block">Latitude</span>
                  <span className="text-stone-700">{loc.latitude.toFixed(5)}</span>
                </div>
                <div className="bg-[#ede4d6] p-2 rounded-lg border border-[#ded4c5] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-stone-500 block">Longitude</span>
                  <span className="text-stone-700">{loc.longitude.toFixed(5)}</span>
                </div>
              </div>

              {/* Staff Stats */}
              <div className="pt-2 border-t border-[#ded4c5] flex items-center justify-between text-xs text-stone-600">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  <span>{assignedStaff.length} Employees Authorized</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-900 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{attendeesNow.length} On-Site Today</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="border-b border-[#ded4c5] pb-3">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-stone-800" />
                <span>Register New Office Geofence</span>
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Define the office address, GPS center coordinates, and allowable geofence radius.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="office-name-input" className="text-xs font-medium text-stone-700">Office Name *</label>
                  <input
                    id="office-name-input"
                    type="text"
                    required
                    placeholder="e.g. South Bay Innovation Hub"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="office-code-input" className="text-xs font-medium text-stone-700">Branch Code *</label>
                  <input
                    id="office-code-input"
                    type="text"
                    required
                    placeholder="e.g. SB-05"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="office-address-input" className="text-xs font-medium text-stone-700">Street Address *</label>
                  <input
                    id="office-address-input"
                    type="text"
                    required
                    placeholder="e.g. 500 Silicon Ave, Palo Alto, CA"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="office-lat-input" className="text-xs font-medium text-stone-700">Latitude *</label>
                  <input
                    id="office-lat-input"
                    type="number"
                    step="any"
                    required
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="office-lng-input" className="text-xs font-medium text-stone-700">Longitude *</label>
                  <input
                    id="office-lng-input"
                    type="number"
                    step="any"
                    required
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="office-radius-input" className="text-xs font-medium text-stone-700 flex items-center justify-between">
                    <span>Geofence Radius (Meters) *</span>
                    <span className="text-stone-900 font-mono font-bold">{form.radiusMeters} m</span>
                  </label>
                  <input
                    id="office-radius-input"
                    type="range"
                    min="50"
                    max="600"
                    step="25"
                    value={form.radiusMeters}
                    onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value) })}
                    className="w-full accent-stone-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="office-desc-input" className="text-xs font-medium text-stone-700">Description</label>
                  <input
                    id="office-desc-input"
                    type="text"
                    placeholder="Short description of this office hub..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#ede4d6] text-stone-700 border border-[#ded4c5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs transition-colors cursor-pointer"
                >
                  Register Office
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
