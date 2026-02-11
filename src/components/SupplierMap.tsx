import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type Props = {
  city?: string | null;
  state?: string | null;
  supplierName?: string;
};

export default function SupplierMap({ city, state, supplierName }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          <p className="text-sm text-muted-foreground">
            {location ? `Não foi possível localizar "${location}" no mapa.` : "Localização não informada pelo fornecedor."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <strong>{supplierName || "Fornecedor"}</strong>
            <br />
            {location}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
