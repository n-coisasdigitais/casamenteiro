import { useEffect, useState } from "react";
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
  const [mapReady, setMapReady] = useState(false);

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

  // Dynamically load leaflet only when we have a position
  useEffect(() => {
    if (!position) return;

    let cancelled = false;

    const loadMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        if (cancelled) return;

        const container = document.getElementById("supplier-map-container");
        if (!container) return;

        // Clear previous map instance if any
        container.innerHTML = "";

        const map = L.map(container).setView(position, 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        L.marker(position)
          .addTo(map)
          .bindPopup(`<strong>${supplierName || "Fornecedor"}</strong><br/>${location}`)
          .openPopup();

        // Fix tile rendering after container becomes visible
        setTimeout(() => map.invalidateSize(), 100);

        setMapReady(true);
      } catch (err) {
        console.error("Map load error:", err);
        setError(true);
      }
    };

    loadMap();

    return () => {
      cancelled = true;
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
      id="supplier-map-container"
      className="h-72 rounded-lg overflow-hidden border border-border"
      style={{ minHeight: "288px" }}
    />
  );
}
