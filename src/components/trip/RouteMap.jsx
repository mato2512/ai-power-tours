import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function RouteMap({ itinerary }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !itinerary || itinerary.length === 0) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Filter valid coordinates
      const daysWithCoords = itinerary.filter(day => 
        day.coordinates?.lat && 
        day.coordinates?.lng &&
        !isNaN(day.coordinates.lat) &&
        !isNaN(day.coordinates.lng)
      );

      if (daysWithCoords.length === 0) return;

      // Calculate center
      const avgLat = daysWithCoords.reduce((sum, day) => sum + day.coordinates.lat, 0) / daysWithCoords.length;
      const avgLng = daysWithCoords.reduce((sum, day) => sum + day.coordinates.lng, 0) / daysWithCoords.length;

      // Create map
      const map = L.map(mapRef.current).setView([avgLat, avgLng], 6);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add markers and route line
      const routeCoordinates = [];
      daysWithCoords.forEach((day, index) => {
        const coords = [day.coordinates.lat, day.coordinates.lng];
        routeCoordinates.push(coords);

        // Add marker
        const marker = L.marker(coords).addTo(map);
        
        // Add popup
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: bold; font-size: 16px; color: #2563eb; margin-bottom: 4px;">
              Day ${day.day}
            </div>
            <div style="font-weight: 600; margin-bottom: 8px;">
              📍 ${day.city_location}
            </div>
            ${day.title ? `<div style="font-weight: 500; margin-bottom: 8px;">${day.title}</div>` : ''}
            ${day.why_visit ? `<div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">${day.why_visit}</div>` : ''}
            ${day.distance_from_previous && index > 0 ? `<div style="font-size: 12px; color: #9ca3af;">🧭 ${day.distance_from_previous} km from previous</div>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);
      });

      // Add route line if multiple points
      if (routeCoordinates.length > 1) {
        L.polyline(routeCoordinates, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(map);
      }

      // Cleanup
      return () => {
        map.remove();
      };
    });
  }, [itinerary]);

  if (!itinerary || itinerary.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Your Journey Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <p className="text-gray-500">No route data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter days with valid coordinates
  const daysWithCoords = itinerary.filter(day => 
    day.coordinates?.lat && 
    day.coordinates?.lng &&
    !isNaN(day.coordinates.lat) &&
    !isNaN(day.coordinates.lng)
  );

  if (daysWithCoords.length === 0) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Your Journey Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <p className="text-gray-500">No valid GPS coordinates found in itinerary</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          Your Journey Route Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-lg overflow-hidden shadow-lg">
          <div 
            ref={mapRef} 
            style={{ 
              height: '100%', 
              width: '100%',
              borderRadius: '8px'
            }}
          />
        </div>

        {/* Route Summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{daysWithCoords.length}</div>
            <div className="text-sm text-gray-600">Locations</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {daysWithCoords.reduce((sum, day) => sum + (day.distance_from_previous || 0), 0).toFixed(0)} km
            </div>
            <div className="text-sm text-gray-600">Total Distance</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{daysWithCoords[0].city_location}</div>
            <div className="text-sm text-gray-600">Start Point</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{daysWithCoords[daysWithCoords.length - 1].city_location}</div>
            <div className="text-sm text-gray-600">End Point</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}