import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Supplier = {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  rating: number | null;
  price_min: number | null;
};

type Props = {
  suppliers: Supplier[];
  onSupplierClick?: (id: string) => void;
};

export default function SupplierSearchMap({ suppliers, onSupplierClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const init = async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        if (cancelled || !containerRef.current) return;

        // Cleanup
        if (mapRef.current) {
          try { mapRef.current.remove(); } catch {}
          mapRef.current = null;
        }

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Center on Brazil
        const map = L.map(containerRef.current).setView([-14.235, -51.925], 4);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        setLoading(false);

        // Geocode and add markers for each supplier with a location
        const locGroups: Record<string, Supplier[]> = {};
        for (const s of suppliers) {
          const loc = [s.city, s.state].filter(Boolean).join(", ");
          if (!loc) continue;
          if (!locGroups[loc]) locGroups[loc] = [];
          locGroups[loc].push(s);
        }

        const bounds: [number, number][] = [];

        for (const [loc, sups] of Object.entries(locGroups)) {
          try {
            const query = encodeURIComponent(`${loc}, Brasil`);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
              { headers: { "Accept-Language": "pt-BR" } }
            );
            const data = await res.json();
            if (cancelled) return;
            if (!data || data.length === 0) continue;

            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            bounds.push([lat, lon]);

            const popupContent = sups.map(s => 
              `<div style="cursor:pointer;margin-bottom:4px;" class="supplier-pin" data-id="${s.id}">
                <strong>${s.company_name}</strong>
                ${s.rating ? ` ⭐ ${s.rating.toFixed(1)}` : ""}
                ${s.price_min ? `<br/><small>A partir de R$${s.price_min.toLocaleString("pt-BR")}</small>` : ""}
              </div>`
            ).join("<hr style='margin:4px 0'/>");

            const marker = L.marker([lat, lon])
              .addTo(map)
              .bindPopup(popupContent);

            marker.on("popupopen", () => {
              const popup = marker.getPopup();
              if (popup) {
                const el = popup.getElement();
                if (el) {
                  el.querySelectorAll(".supplier-pin").forEach((pin: Element) => {
                    pin.addEventListener("click", () => {
                      const id = pin.getAttribute("data-id");
                      if (id && onSupplierClick) onSupplierClick(id);
                    });
                  });
                }
              }
            });

            markersRef.current.push(marker);

            // Rate limit Nominatim
            await new Promise(r => setTimeout(r, 300));
          } catch {}
        }

        if (bounds.length > 0 && !cancelled) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        }

        setTimeout(() => {
          if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
        }, 200);
      } catch (err) {
        console.error("Search map error:", err);
        if (!cancelled) setError(true);
        setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      markersRef.current = [];
    };
  }, [suppliers, onSupplierClick]);

  if (error) {
    return (
      <div className="h-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Não foi possível carregar o mapa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-10">
          <p className="text-sm text-muted-foreground animate-pulse">Carregando mapa...</p>
        </div>
      )}
      <div ref={containerRef} className="h-full rounded-lg overflow-hidden border border-border" />
    </div>
  );
}
