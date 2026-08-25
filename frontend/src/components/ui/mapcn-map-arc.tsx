import { useEffect, useRef } from "react";
import maplibreGl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface MapcnMapArcProps {
  className?: string;
  onMapReady?: (map: maplibreGl.Map) => void;
}

export function MapcnMapArc({ className, onMapReady }: MapcnMapArcProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibreGl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibreGl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [30.5234, 50.4501],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibreGl.NavigationControl(), "top-right");

    mapRef.current = map;

    map.on("load", () => {
      onMapReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapReady]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full rounded-lg", className)}
    />
  );
}
