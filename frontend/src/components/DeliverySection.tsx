import { useCallback } from "react";
import maplibreGl from "maplibre-gl";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { MapcnMapArc } from "@/components/ui/mapcn-map-arc";

const OFFICE = {
  lat: 50.4501,
  lng: 30.5234,
  name: "SMARTBOT SHOP — Головний офіс",
  address: "м. Київ, вул. Хрещатик, 22",
  phone: "+380 (44) 123-45-67",
  email: "info@smartbot.ua",
  hours: "Пн-Пт: 09:00 - 20:00, Сб: 10:00 - 18:00",
};

export function DeliverySection() {
  const handleMapReady = useCallback((map: maplibreGl.Map) => {
    const markerEl = document.createElement("div");
    markerEl.className = "flex items-center justify-center";
    markerEl.innerHTML = `
      <div style="width:16px;height:16px;background:#fff;border-radius:50%;border:3px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
    `;

    new maplibreGl.Marker({ element: markerEl })
      .setLngLat([OFFICE.lng, OFFICE.lat])
      .addTo(map);

    map.flyTo({ center: [OFFICE.lng, OFFICE.lat], zoom: 14 });
  }, []);

  return (
    <section className="relative w-full px-4 py-20">
      <div className="mx-auto max-w-screen-2xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
            Наш офіс
          </h2>
          <p className="mx-auto max-w-xl text-neutral-400">
            Завітайте до нас або зв'яжіться для консультації
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {OFFICE.name}
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="text-sm text-neutral-300">{OFFICE.address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="text-sm text-neutral-300">{OFFICE.phone}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="text-sm text-neutral-300">{OFFICE.email}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="text-sm text-neutral-300">{OFFICE.hours}</span>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-neutral-800 lg:col-span-2"
            style={{ minHeight: 400 }}
          >
            <MapcnMapArc
              className="h-full min-h-[400px] w-full"
              onMapReady={handleMapReady}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
