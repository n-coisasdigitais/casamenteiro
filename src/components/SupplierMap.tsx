import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin } from "lucide-react";

type Props = {
  city?: string | null;
  state?: string | null;
  supplierName?: string;
};

export default function SupplierMap({ city, state, supplierName }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const location = [city, state].filter(Boolean).join(", ");

  useEffect(() => {
    if (!location) {
      setLoading(false);
      setError(true);
      return;
    }

    const query = encodeURIComponent(`${location}, Brasil`);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { "Accept-Language": "pt-BR" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [location]);

  useEffect(() => {
    if (!position || !containerRef.current) return;

    let cancelled = false;

    const loadMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        if (cancelled || !containerRef.current) return;

        // Cleanup previous map
        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.remove(); } catch {}
          mapInstanceRef.current = null;
        }

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        const map = L.map(containerRef.current).setView(position, 13);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        L.marker(position)
          .addTo(map)
          .bindPopup(`<strong>${supplierName || "Fornecedor"}</strong><br/>${location}`)
          .openPopup();

        setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Map load error:", err);
        if (!cancelled) setError(true);
      }
    };

    loadMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [position, supplierName, location]);

  if (loading) {
    return (
      <div className="h-72 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Carregando mapa...</p>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="h-72 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {location ? `Não foi possível localizar "${location}" no mapa.` : "Localização não informada pelo fornecedor."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-72 rounded-lg overflow-hidden border border-border"
      style={{ minHeight: "288px" }}
    />
  );
}
