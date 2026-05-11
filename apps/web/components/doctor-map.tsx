"use client";

// Leaflet CSS must be imported in a client component to avoid SSR issues
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
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
  photoUrl?: string | null;
  _geo?: { lat: number; lng: number };
}

interface DoctorMapInnerProps {
  doctors: MapDoctor[];
  userLocation?: { lat: number; lng: number } | null;
  onUserLocationChange?: (loc: { lat: number; lng: number }) => void;
}

// Blue user-location icon (distinct from default doctor markers)
const userIcon = L.divIcon({
  className: "user-loc-icon",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#0F7B8A;border:3px solid #fff;
    box-shadow:0 0 0 2px rgba(15,123,138,0.35), 0 2px 6px rgba(0,0,0,0.25);
    cursor:grab;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapClickHandler({ onSet }: { onSet?: (loc: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      if (onSet) onSet({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Default center: Tunis
const DEFAULT_CENTER: [number, number] = [36.8065, 10.1815];
const DEFAULT_ZOOM = 11;

/** Haversine distance (km) between two lat/lng points. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function DoctorMapInner({ doctors, userLocation, onUserLocationChange }: DoctorMapInnerProps) {
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
          !isNaN(d._geo.lng),
      ),
    [doctors],
  );

  // Auto-fit bounds: include the user's marker too if present.
  useEffect(() => {
    if (!mapRef.current) return;
    const points: [number, number][] = geoDoctors.map(
      (d) => [d._geo!.lat, d._geo!.lng] as [number, number],
    );
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    if (points.length < 2) {
      if (userLocation) mapRef.current.setView([userLocation.lat, userLocation.lng], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  }, [geoDoctors, userLocation]);

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

      <MapClickHandler onSet={onUserLocationChange} />

      {/* User position — draggable blue marker with accuracy halo */}
      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={120}
            pathOptions={{
              color: "#3D75A8",
              fillColor: "#6FA9CB",
              fillOpacity: 0.18,
              weight: 1,
            }}
          />
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            draggable={!!onUserLocationChange}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onUserLocationChange?.({ lat: pos.lat, lng: pos.lng });
              },
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold mb-1">Votre position</p>
                {onUserLocationChange && (
                  <p className="text-gray-500" style={{ margin: 0 }}>
                    Glissez le marqueur ou cliquez sur la carte pour ajuster.
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {geoDoctors.map((doctor) => {
        const km = userLocation
          ? haversineKm(userLocation, doctor._geo!)
          : null;
        return (
          <Marker key={doctor.id} position={[doctor._geo!.lat, doctor._geo!.lng]}>
            <Popup>
              <div className="min-w-[220px] space-y-1.5">
                <div className="flex items-center gap-2.5">
                  {doctor.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doctor.photoUrl}
                      alt={doctor.name}
                      width={44}
                      height={44}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "2px solid #E6F4F6",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: "#E6F4F6",
                        color: "#0F7B8A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {doctor.name.split(" ").slice(-2).map((w) => w[0]).join("")}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p className="font-semibold text-sm leading-snug" style={{ margin: 0 }}>{doctor.name}</p>
                    <p className="text-xs text-gray-500" style={{ margin: 0 }}>{doctor.specialty}</p>
                  </div>
                </div>
                {doctor.address && (
                  <p className="text-xs text-gray-400 leading-snug">{doctor.address}</p>
                )}
                {km !== null && (
                  <p className="text-xs font-bold" style={{ color: "#0F7B8A" }}>
                    📍 {formatKm(km)} de vous
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <Link
                    href={`/medecin/${doctor.slug}`}
                    className="flex-1 text-center rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Voir profil
                  </Link>
                  <Link
                    href={`/rdv/${doctor.slug}`}
                    className="flex-1 text-center rounded-lg px-2 py-1.5 text-xs font-bold transition-colors"
                    style={{ background: "#0F7B8A", color: "#ffffff" }}
                  >
                    Prendre RDV
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default DoctorMapInner;
