import { useEffect, useState, useCallback, type KeyboardEvent } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import { MapPin, Loader2, Search, AlertCircle, Crosshair } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

const UKRAINE_CENTER: [number, number] = [48.3794, 31.1656];

export interface AddressValue {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

interface MapAddressPickerProps {
  value?: AddressValue | null;
  onChange: (value: AddressValue | null) => void;
  className?: string;
}

interface NominatimAddress {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    road?: string;
    house_number?: string;
  };
}

function extractCity(item: NominatimAddress): string {
  const addr = item.address || {};
  return addr.city || addr.town || addr.village || addr.state || "";
}

function buildShortAddress(item: NominatimAddress): string {
  const addr = item.address || {};
  const parts = [addr.road, addr.house_number].filter(Boolean);
  if (parts.length) {
    return `${parts.join(", ")}, ${extractCity(item)}`;
  }
  return item.display_name;
}

const markerIcon = L.divIcon({
  className: "custom-map-marker",
  html: `<svg viewBox="0 0 24 24" fill="#ef4444" stroke="#fff" stroke-width="2" style="width:32px;height:32px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

async function searchAddress(query: string): Promise<NominatimAddress[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const data = await apiFetch<{ results: NominatimAddress[] }>(
    `/logistics/geocode/?q=${encodeURIComponent(query)}`
  );
  return data.results || [];
}

async function reverseGeocode(lat: number, lng: number): Promise<NominatimAddress | null> {
  const data = await apiFetch<NominatimAddress>(
    `/logistics/geocode/reverse/?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`
  );
  return data && data.display_name ? data : null;
}

function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function MapFlyTo({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 16, { duration: 0.8 });
    }
  }, [lat, lng, map]);
  return null;
}

function CrosshairButton() {
  const map = useMap();
  function centerUkraine() {
    map.flyTo(UKRAINE_CENTER, 6);
  }
  return (
    <button
      type="button"
      onClick={centerUkraine}
      className="absolute right-3 top-3 z-50 rounded-md border border-neutral-700 bg-neutral-900 p-2 text-white shadow hover:bg-neutral-800"
      title="Центрувати на Україні"
    >
      <Crosshair className="h-4 w-4" />
    </button>
  );
}

export function MapAddressPicker({ value, onChange, className }: MapAddressPickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.address);
      setError(null);
    } else {
      setQuery("");
    }
  }, [value]);

  const selectAddress = useCallback((item: NominatimAddress) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const address = buildShortAddress(item);
    const city = extractCity(item);
    onChange({ address, city, lat, lng });
    setQuery(address);
    setSuggestions([]);
    setError(null);
  }, [onChange]);

  useEffect(() => {
    if (query.trim().length < 2 || query === value?.address) {
      if (query === value?.address) setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAddress(query);
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, value?.address]);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const data = await searchAddress(query);
      const first = data[0];
      if (first) {
        selectAddress(first);
      } else {
        setError("Адресу не знайдено");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Помилка пошуку");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await reverseGeocode(lat, lng);
      if (data) {
        selectAddress(data);
      } else {
        onChange(null);
        setQuery("");
        setError("Адресу не знайдено");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Помилка геокодування");
    } finally {
      setLoading(false);
    }
  }

  const center: [number, number] = value ? [value.lat, value.lng] : UKRAINE_CENTER;
  const zoom = value ? 16 : 6;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введіть адресу, натисніть Enter або виберіть на карті"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 pl-10 pr-24 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || query.trim().length < 2}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50 hover:bg-neutral-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Знайти"}
        </button>

        {suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectAddress(item)}
                className="flex w-full items-start gap-2 border-b border-neutral-800 px-3 py-2 text-left text-sm text-neutral-300 last:border-b-0 hover:bg-neutral-800"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                <span className="line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 p-2 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-neutral-700">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            subdomains="abc"
          />
          <MapEvents onClick={handleMapClick} />
          <MapFlyTo lat={value?.lat ?? null} lng={value?.lng ?? null} />
          <CrosshairButton />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={markerIcon}
            />
          )}
        </MapContainer>
      </div>

      {value && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-sm text-neutral-300">
          <MapPin className="mb-1 inline h-4 w-4 text-neutral-500" /> {value.address}
        </div>
      )}
    </div>
  );
}
