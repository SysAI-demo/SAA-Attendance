import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAttendance } from '../context/AttendanceContext';
import { calculateDistanceMeters, formatDistance } from '../utils/geoUtils';

import { GeoCoordinates, OfficeLocation } from '../types';

interface GeofenceMapProps {
  height?: string;
  allowClickToTeleport?: boolean;
  currentCoords?: GeoCoordinates;
  offices?: OfficeLocation[];
  nearestOffice?: OfficeLocation;
  isInsideGeofence?: boolean;
}

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
  height = '320px',
  allowClickToTeleport = true,
  currentCoords: propCoords,
  offices: propOffices,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const {
    officeLocations: contextOffices,
    currentEmployee,
    currentCoords: contextCoords,
    setManualLocation,
    isUsingRealGPS,
  } = useAttendance();

  const officeLocations = propOffices || contextOffices;
  const currentCoords = propCoords || contextCoords;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.latitude, currentCoords.longitude],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Warm CartoDB Voyager tiles
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;

      // Click to move GPS position
      if (allowClickToTeleport) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          setManualLocation(e.latlng.lat, e.latlng.lng, 10);
        });
      }
    }

    return () => {
      // cleanup handled on component unmount
    };
  }, []);

  // Update Layers whenever locations or coords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Draw Office Geofences
    const safeLocations = Array.isArray(officeLocations) ? officeLocations : [];
    const allowedLocIds = currentEmployee?.allowedLocationIds || [];
    const isAllAllowed = allowedLocIds.length === 0 || allowedLocIds.includes('*') || allowedLocIds.includes('all');

    safeLocations.forEach((loc) => {
      const isAllowed = isAllAllowed || allowedLocIds.includes(loc.id);
      const color = isAllowed ? '#292524' : '#a8a29e';
      const fillColor = isAllowed ? '#44403c' : '#d6d3d1';

      // Geofence Circle
      const circle = L.circle([loc.latitude, loc.longitude], {
        color: isAllowed ? '#1c1917' : '#78716c',
        weight: isAllowed ? 3 : 1.5,
        opacity: isAllowed ? 0.9 : 0.4,
        fillColor: fillColor,
        fillOpacity: isAllowed ? 0.2 : 0.08,
        radius: loc.radiusMeters,
        dashArray: isAllowed ? undefined : '5, 5',
      });

      const distToUser = calculateDistanceMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        loc.latitude,
        loc.longitude
      );

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; min-width: 180px; color: #1c1917; padding: 2px;">
          <div style="font-weight: 700; color: #1c1917; margin-bottom: 2px;">${loc.name}</div>
          <div style="font-size: 11px; color: #78716c; margin-bottom: 6px;">${loc.address}</div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
            <span style="background: ${isAllowed ? '#ede4d6' : '#f5f5f4'}; color: ${isAllowed ? '#1c1917' : '#78716c'}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">
              ${isAllowed ? '✓ Authorized for you' : '✕ Not in your assigned list'}
            </span>
          </div>
          <div style="font-size: 11px; color: #44403c;">
            <strong>Radius:</strong> ${loc.radiusMeters}m<br/>
            <strong>Distance:</strong> ${formatDistance(distToUser)}
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);
      layers.addLayer(circle);

      // Office Center Pin
      const officeIcon = L.divIcon({
        className: 'custom-office-pin',
        html: `
          <div style="
            background: ${isAllowed ? '#1c1917' : '#78716c'};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
            border: 2px solid white;
            font-size: 11px;
            font-weight: bold;
          ">
            🏢
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: officeIcon });
      marker.bindPopup(popupContent);
      layers.addLayer(marker);
    });

    // 2. Draw User Live Position & Accuracy Halo
    const userAccuracyCircle = L.circle([currentCoords.latitude, currentCoords.longitude], {
      color: isUsingRealGPS ? '#15803d' : '#0369a1',
      weight: 1,
      opacity: 0.6,
      fillColor: isUsingRealGPS ? '#86efac' : '#7dd3fc',
      fillOpacity: 0.2,
      radius: currentCoords.accuracy || 15,
    });
    layers.addLayer(userAccuracyCircle);

    const userIcon = L.divIcon({
      className: 'custom-user-beacon',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${isUsingRealGPS ? 'rgba(21, 128, 61, 0.4)' : 'rgba(3, 105, 161, 0.4)'};
            animation: ping 1.5s cubic-bezier(0, 0, 0, 0.2) infinite;
          "></div>
          <div style="
            position: absolute;
            top: 3px;
            left: 3px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: ${isUsingRealGPS ? '#15803d' : '#0369a1'};
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userMarker = L.marker([currentCoords.latitude, currentCoords.longitude], {
      icon: userIcon,
      zIndexOffset: 1000,
    });

    userMarker.bindPopup(`
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #1c1917;">
        <strong style="color: #1c1917;">📍 ${currentEmployee?.name || 'Your'}'s Current Position</strong><br/>
        Lat: ${currentCoords.latitude.toFixed(6)}<br/>
        Lng: ${currentCoords.longitude.toFixed(6)}<br/>
        Accuracy: ±${Math.round(currentCoords.accuracy || 10)}m (${isUsingRealGPS ? 'Real GPS' : 'Simulated GPS'})
      </div>
    `);
    layers.addLayer(userMarker);

  }, [officeLocations, currentEmployee, currentCoords, isUsingRealGPS]);

  // Center on user position button
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentCoords.latitude, currentCoords.longitude], 15, {
        animate: true,
      });
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#ded4c5] shadow-xs bg-[#f8f5ef]">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />
      
      {/* Map Overlay Controls */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 border border-stone-800 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Recenter map on my GPS position"
        >
          <span>🎯</span>
          <span>Center Me</span>
        </button>
      </div>

      {allowClickToTeleport && (
        <div className="absolute bottom-2 left-2 z-[500] bg-[#f8f5ef]/95 backdrop-blur-xs border border-[#ded4c5] px-2.5 py-1 rounded-md text-[11px] text-stone-700 pointer-events-none flex items-center gap-1.5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-stone-900 animate-pulse"></span>
          <span>Click anywhere on map to simulate GPS position</span>
        </div>
      )}
    </div>
  );
};
