"use client";

import dynamic from "next/dynamic";
import type { MapDoctor } from "./doctor-map";

// Dynamic import prevents Leaflet (which accesses `window`) from running on the server
const DoctorMapInner = dynamic(() => import("./doctor-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-secondary animate-pulse flex items-center justify-center">
      <span className="text-xs text-muted-foreground">Chargement de la carte...</span>
    </div>
  ),
});

interface DoctorMapProps {
  doctors: MapDoctor[];
}

export function DoctorMap({ doctors }: DoctorMapProps) {
  return <DoctorMapInner doctors={doctors} />;
}
