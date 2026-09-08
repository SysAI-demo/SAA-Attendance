import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Crosshair, Search } from 'lucide-react';

interface OfficeLocationPickerMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

export const OfficeLocationPickerMap: React.FC<OfficeLocationPickerMapProps> = ({
  latitude,
  longitude,
  radiusMeters,
  color = '#2563eb',
  onChange,
  height = '260px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude || 37.789180, longitude || -122.401420],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Create Custom Pin Icon
      const customPin = L.divIcon({
        className: 'office-picker-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            background: ${color};
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Add draggable Marker
      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: customPin,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      // Add Circle
      const circle = L.circle([latitude, longitude], {
        radius: radiusMeters || 150,
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);

      // Click to place
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));
        onChange(newLat, newLng);
      });

      markerRef.current = marker;
      circleRef.current = circle;
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker, circle, and view when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const latLng: [number, number] = [latitude, longitude];
    markerRef.current.setLatLng(latLng);
    circleRef.current.setLatLng(latLng);
    circleRef.current.setRadius(radiusMeters);
    circleRef.current.setStyle({ color, fillColor: color });

    // Update icon color
    const customPin = L.divIcon({
      className: 'office-picker-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: ${color};
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    markerRef.current.setIcon(customPin);
  }, [latitude, longitude, radiusMeters, color]);

  // Recenter map on coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
    }
  };

  // Acquire Real GPS position
  const handleUseMyGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChange(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`Could not acquire device GPS: ${err.message}. Please verify browser location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick address search via OpenStreetMap Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(parseFloat(data[0].lat).toFixed(6));
        const lng = Number(parseFloat(data[0].lon).toFixed(6));
        onChange(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
        }
      } else {
        alert('Address not found. Please try another query or click directly on the map.');
      }
    } catch {
      alert('Address search failed. Please click directly on the map to place the pin.');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#ded4c5] shadow-xs bg-[#f8f5ef]">
      {/* Top Search & Action Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[500] flex gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex items-center bg-white/95 backdrop-blur-xs rounded-lg border border-[#ded4c5] shadow-xs overflow-hidden">
          <input
            type="text"
            placeholder="Search address or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs text-stone-800 bg-transparent outline-hidden"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs flex items-center gap-1 border-l border-[#ded4c5] transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            {searchLoading ? 'Searching...' : 'Find'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleUseMyGPS}
          disabled={isLocating}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Detect and use current device location"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Acquiring...' : 'Use My GPS'}</span>
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="bg-stone-900 hover:bg-stone-800 text-white p-1.5 rounded-lg text-xs font-medium shadow-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Recenter map on pin"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-2 right-2 z-[500] bg-white/95 backdrop-blur-xs border border-[#ded4c5] px-3 py-1.5 rounded-lg text-[11px] text-stone-600 flex items-center justify-between shadow-xs pointer-events-none">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-stone-700" />
          <span>Click anywhere or drag the pin to set geofence center</span>
        </div>
        <div className="font-mono text-[10px] text-stone-500">
          {latitude.toFixed(4)}, {longitude.toFixed(4)} ({radiusMeters}m radius)
        </div>
      </div>
    </div>
  );
};
