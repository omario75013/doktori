"use client";

// Leaflet CSS must be imported in a client component to avoid SSR issues
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";

// Fix Leaflet default icon URLs broken by webpack/Next.js bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapDoctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  address?: string;
  _geo?: { lat: number; lng: number };
}

interface DoctorMapInnerProps {
  doctors: MapDoctor[];
}

// Default center: Tunis
const DEFAULT_CENTER: [number, number] = [36.8065, 10.1815];
const DEFAULT_ZOOM = 11;

function DoctorMapInner({ doctors }: DoctorMapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Filter doctors with valid coordinates (stable reference via useMemo)
  const geoDoctors = useMemo(
    () =>
      doctors.filter(
        (d) =>
          d._geo &&
          typeof d._geo.lat === "number" &&
          typeof d._geo.lng === "number" &&
          !isNaN(d._geo.lat) &&
          !isNaN(d._geo.lng)
      ),
    [doctors]
  );

  // Auto-fit bounds when 2+ doctors have coordinates
  useEffect(() => {
    if (!mapRef.current || geoDoctors.length < 2) return;
    const bounds = L.latLngBounds(
      geoDoctors.map((d) => [d._geo!.lat, d._geo!.lng] as [number, number])
    );
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [geoDoctors]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-2xl"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoDoctors.map((doctor) => (
        <Marker
          key={doctor.id}
          position={[doctor._geo!.lat, doctor._geo!.lng]}
        >
          <Popup>
            <div className="min-w-[160px] space-y-1">
              <p className="font-semibold text-sm leading-snug">{doctor.name}</p>
              <p className="text-xs text-gray-500">{doctor.specialty}</p>
              {doctor.address && (
                <p className="text-xs text-gray-400 leading-snug">{doctor.address}</p>
              )}
              <Link
                href={`/medecin/${doctor.slug}`}
                className="mt-2 block text-center rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors"
              >
                Voir profil
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default DoctorMapInner;
