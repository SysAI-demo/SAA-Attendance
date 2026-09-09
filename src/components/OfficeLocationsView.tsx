import React, { useState } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { OfficeLocation } from '../types';
import {
  Building2,
  Plus,
  Compass,
  CheckCircle2,
  Users,
  ShieldCheck,
  Lock,
  Edit3,
  Trash2,
  Navigation,
  MapPin,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { GeofenceMap } from './GeofenceMap';
import { OfficeLocationPickerMap } from './OfficeLocationPickerMap';
import { calculateDistanceMeters, formatDistance } from '../utils/geoUtils';

interface LocationFormState {
  id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timezone: string;
  color: string;
  description: string;
  isActive: boolean;
  assignToAllEmployees: boolean;
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#475569', // Slate
];

const PRESET_RADII = [50, 100, 150, 200, 300, 500, 1000];

export const OfficeLocationsView: React.FC = () => {
  const {
    officeLocations,
    addOfficeLocation,
    updateOfficeLocation,
    deleteOfficeLocation,
    employees,
    attendanceRecords,
    isCurrentHR,
    currentEmployee,
    currentCoords,
    setManualLocation,
    refreshGPSPosition,
  } = useAttendance();

  // Modal states
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<OfficeLocation | null>(null);

  const initialFormState: LocationFormState = {
    name: '',
    code: '',
    address: '',
    city: 'San Francisco, CA',
    latitude: currentCoords?.latitude || 37.78918,
    longitude: currentCoords?.longitude || -122.40142,
    radiusMeters: 200,
    timezone: 'PST (UTC-8)',
    color: '#2563eb',
    description: '',
    isActive: true,
    assignToAllEmployees: true,
  };

  const [form, setForm] = useState<LocationFormState>(initialFormState);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);

  // Security check: Only accessible by HR and super admin
  if (!isCurrentHR) {
    return (
      <div id="geofences-access-restricted" className="max-w-4xl mx-auto my-8 p-8 bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl text-center space-y-4 shadow-xs">
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

  const openCreateModal = () => {
    setModalMode('create');
    setEditingLocationId(null);
    setForm({
      ...initialFormState,
      latitude: currentCoords?.latitude || 37.78918,
      longitude: currentCoords?.longitude || -122.40142,
    });
  };

  const openEditModal = (loc: OfficeLocation) => {
    setModalMode('edit');
    setEditingLocationId(loc.id);
    setForm({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      address: loc.address,
      city: loc.city,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: loc.radiusMeters,
      timezone: loc.timezone,
      color: loc.color || '#2563eb',
      description: loc.description,
      isActive: loc.isActive !== false,
      assignToAllEmployees: true,
    });
  };

  const handleUseCurrentGPS = async () => {
    setIsDetectingGPS(true);
    try {
      const res = await refreshGPSPosition();
      if (res.success && res.coords) {
        setForm((prev) => ({
          ...prev,
          latitude: Number(res.coords!.latitude.toFixed(6)),
          longitude: Number(res.coords!.longitude.toFixed(6)),
        }));
      } else {
        alert(res.error || 'Could not retrieve device GPS. Please check location permissions.');
      }
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      alert('Please provide an office name and code.');
      return;
    }

    if (modalMode === 'edit' && editingLocationId) {
      const updatedLoc: OfficeLocation = {
        id: editingLocationId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim() || 'Headquarters',
        latitude: form.latitude,
        longitude: form.longitude,
        radiusMeters: form.radiusMeters,
        timezone: form.timezone || 'UTC',
        color: form.color,
        description: form.description.trim(),
        isActive: form.isActive,
      };

      updateOfficeLocation(updatedLoc, form.assignToAllEmployees);
      setSuccessMsg(`Successfully updated office geofence "${form.name}"!`);
    } else {
      const newLocData: Omit<OfficeLocation, 'id'> = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim() || 'Headquarters',
        latitude: form.latitude,
        longitude: form.longitude,
        radiusMeters: form.radiusMeters,
        timezone: form.timezone || 'UTC',
        color: form.color,
        description: form.description.trim(),
        isActive: form.isActive,
      };

      addOfficeLocation(newLocData, form.assignToAllEmployees);
      setSuccessMsg(`Registered new office geofence "${form.name}"!`);
    }

    setTimeout(() => setSuccessMsg(null), 4000);
    setModalMode(null);
  };

  const handleDelete = () => {
    if (!deletingLocation) return;
    deleteOfficeLocation(deletingLocation.id);
    setSuccessMsg(`Deleted office location "${deletingLocation.name}".`);
    setTimeout(() => setSuccessMsg(null), 4000);
    setDeletingLocation(null);
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
              <span>HR & Admin Management</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Configure office locations, GPS boundaries, and edit geofence radii for attendance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-add-new-office-branch"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Office Branch</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Global Geofence Map View */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-stone-700" />
              <span>Interactive Geofence Map Overview</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              Click anywhere on the map to test mobile GPS simulation or inspect geofence circles.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Live Device GPS: {currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)} (±{Math.round(currentCoords.accuracy)}m)</span>
          </div>
        </div>
        <GeofenceMap height="340px" allowClickToTeleport={true} />
      </div>

      {/* Locations Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span>Configured Office Locations</span>
            <span className="text-xs font-normal text-stone-500 font-mono">({(officeLocations || []).length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(officeLocations || []).map((loc) => {
            const assignedStaff = (employees || []).filter(
              (e) => !e || !e.allowedLocationIds || e.allowedLocationIds.length === 0 || e.allowedLocationIds.includes(loc.id) || e.allowedLocationIds.includes('*')
            );
            const attendeesNow = (todayAttendance || []).filter(
              (a) => a && a.officeLocationId === loc.id && (!a.checkOutTime || a.status === 'active')
            );

            // Calculate distance to this specific office
            const distMeters = calculateDistanceMeters(
              currentCoords.latitude,
              currentCoords.longitude,
              loc.latitude,
              loc.longitude
            );
            const isInsideThisGeofence = distMeters <= (loc.radiusMeters + 15);

            return (
              <div
                key={loc.id}
                id={`location-card-${loc.id}`}
                className="bg-[#f8f5ef] border border-[#ded4c5] hover:border-stone-400 transition-all rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs font-bold text-lg shrink-0"
                        style={{ backgroundColor: loc.color || '#2563eb' }}
                      >
                        🏢
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-stone-900 text-base leading-tight truncate">
                            {loc.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-[#ede4d6] text-stone-800 px-1.5 py-0.5 rounded border border-[#ded4c5]">
                            {loc.code}
                          </span>
                          <span className="text-xs text-stone-500 truncate">{loc.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isInsideThisGeofence ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                          <span>Inside Geofence</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-600 bg-white border border-[#ded4c5] px-2 py-0.5 rounded-full">
                          {formatDistance(distMeters)} away
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address & Description */}
                  <div className="text-xs text-stone-700 bg-white/90 p-3 rounded-xl border border-[#ded4c5] space-y-1">
                    <div className="flex items-start gap-1.5 font-medium text-stone-800">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                      <span>{loc.address || 'Address not specified'}</span>
                    </div>
                    {loc.description && (
                      <p className="text-[11px] text-stone-500 pl-5">
                        {loc.description}
                      </p>
                    )}
                  </div>

                  {/* Coordinates and Geofence Details */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="bg-[#ede4d6] p-2.5 rounded-xl border border-[#ded4c5]">
                      <span className="text-[10px] text-stone-500 block font-sans">Geofence Radius</span>
                      <span className="text-stone-900 font-bold text-xs">{loc.radiusMeters} Meters</span>
                    </div>
                    <div className="bg-[#ede4d6] p-2.5 rounded-xl border border-[#ded4c5]">
                      <span className="text-[10px] text-stone-500 block font-sans">Latitude</span>
                      <span className="text-stone-800 font-bold">{loc.latitude.toFixed(5)}</span>
                    </div>
                    <div className="bg-[#ede4d6] p-2.5 rounded-xl border border-[#ded4c5]">
                      <span className="text-[10px] text-stone-500 block font-sans">Longitude</span>
                      <span className="text-stone-800 font-bold">{loc.longitude.toFixed(5)}</span>
                    </div>
                  </div>

                  {/* Staff Stats */}
                  <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      <span>{assignedStaff.length} Employees Authorized</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-900 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{attendeesNow.length} Checked In Today</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#ded4c5] flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setManualLocation(loc.latitude, loc.longitude, 5)}
                    className="text-xs text-stone-700 hover:text-stone-900 font-medium px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-[#ded4c5] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Simulate placing mobile device at this office center"
                  >
                    <Radio className="w-3.5 h-3.5 text-stone-600" />
                    <span>Test Device GPS Here</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`btn-edit-location-${loc.id}`}
                      onClick={() => openEditModal(loc)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-50 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Geofence</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-delete-location-${loc.id}`}
                      onClick={() => setDeletingLocation(loc)}
                      className="text-xs font-semibold p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                      title="Delete Office Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-[#ded4c5] pb-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-stone-800" />
                  <span>{modalMode === 'edit' ? 'Edit Office Geofence Location' : 'Register New Office Geofence'}</span>
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Set office GPS coordinates, interactive map position, and geofence radius.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Interactive Map Coordinate Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-700" />
                    <span>Interactive Map & GPS Pin Placement</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    disabled={isDetectingGPS}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isDetectingGPS ? 'animate-spin' : ''}`} />
                    <span>{isDetectingGPS ? 'Acquiring...' : '📍 Use My Real GPS Position'}</span>
                  </button>
                </div>

                <OfficeLocationPickerMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  radiusMeters={form.radiusMeters}
                  color={form.color}
                  onChange={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
                  height="220px"
                />
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modal-office-name" className="text-xs font-semibold text-stone-700">Office Branch Name *</label>
                  <input
                    id="modal-office-name"
                    type="text"
                    required
                    placeholder="e.g. San Francisco HQ or Main Branch"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-office-code" className="text-xs font-semibold text-stone-700">Branch Code *</label>
                  <input
                    id="modal-office-code"
                    type="text"
                    required
                    placeholder="e.g. SF-HQ or BR-01"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-office-address" className="text-xs font-semibold text-stone-700">Street Address *</label>
                  <input
                    id="modal-office-address"
                    type="text"
                    required
                    placeholder="e.g. 500 Market St, Suite 400"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-office-city" className="text-xs font-semibold text-stone-700">City / Region</label>
                  <input
                    id="modal-office-city"
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-office-lat" className="text-xs font-semibold text-stone-700">Latitude (GPS Center) *</label>
                  <input
                    id="modal-office-lat"
                    type="number"
                    step="any"
                    required
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal-office-lng" className="text-xs font-semibold text-stone-700">Longitude (GPS Center) *</label>
                  <input
                    id="modal-office-lng"
                    type="number"
                    step="any"
                    required
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 font-mono focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                {/* Geofence Radius with presets */}
                <div className="space-y-1.5 sm:col-span-2 bg-white/80 p-3 rounded-2xl border border-[#ded4c5]">
                  <div className="flex items-center justify-between">
                    <label htmlFor="modal-office-radius" className="text-xs font-bold text-stone-800">
                      Geofence Radius (Tolerance Buffer) *
                    </label>
                    <span className="text-stone-900 font-mono font-bold text-xs bg-stone-100 px-2 py-0.5 rounded border border-[#ded4c5]">
                      {form.radiusMeters} Meters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="modal-office-radius"
                      type="range"
                      min="30"
                      max="1500"
                      step="10"
                      value={form.radiusMeters}
                      onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value, 10) || 50 })}
                      className="w-full accent-stone-800 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-stone-500">Quick Presets:</span>
                    {PRESET_RADII.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, radiusMeters: r })}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          form.radiusMeters === r
                            ? 'bg-stone-900 text-white border-stone-900 font-bold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-[#ded4c5]'
                        }`}
                      >
                        {r}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color and Description */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-stone-700 block">Location Marker Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                          form.color === c ? 'ring-2 ring-offset-2 ring-stone-800 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="modal-office-desc" className="text-xs font-semibold text-stone-700">Description / Guidelines</label>
                  <input
                    id="modal-office-desc"
                    type="text"
                    placeholder="e.g. Main corporate campus, floors 1 through 4."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                {/* Authorization checkbox */}
                <div className="sm:col-span-2 bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center gap-2.5">
                  <input
                    id="assign-to-all-check"
                    type="checkbox"
                    checked={form.assignToAllEmployees}
                    onChange={(e) => setForm({ ...form, assignToAllEmployees: e.target.checked })}
                    className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-800"
                  />
                  <label htmlFor="assign-to-all-check" className="text-xs text-stone-800 cursor-pointer">
                    <strong className="text-emerald-950">Authorize for All Active Employees:</strong> Allow all staff members to punch in/out when inside this geofence.
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#ede4d6] text-stone-700 border border-[#ded4c5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-office-location"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{modalMode === 'edit' ? 'Save Changes' : 'Register Office'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLocation && (
        <div className="fixed inset-0 z-[1100] bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Office Location</h3>
                <p className="text-xs text-stone-600">Are you sure you want to remove this geofence?</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-[#ded4c5]">
              You are deleting <strong>{deletingLocation.name}</strong> ({deletingLocation.code}). Employees will no longer be able to mark attendance at this location.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLocation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-stone-700 border border-[#ded4c5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-colors cursor-pointer"
              >
                Delete Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
