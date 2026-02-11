import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, DollarSign, Building } from "lucide-react";

type SupplierCardProps = {
  id: string;
  company_name: string;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  rating?: number | null;
  review_count?: number | null;
  price_min?: number | null;
  guest_min?: number | null;
  guest_max?: number | null;
  promo_percentage?: number | null;
  featured?: boolean;
  category_name?: string | null;
  photo_url?: string | null;
};

export default function SupplierCard({ 
  id, company_name, city, state, rating, review_count, 
  price_min, guest_min, guest_max, promo_percentage, featured,
  category_name, photo_url 
}: SupplierCardProps) {
  return (
    <Link to={`/fornecedor/${id}`} className="block group">
      <Card className="overflow-hidden border border-border hover:shadow-xl transition-all duration-300 h-full">
        {/* Image */}
        <div className="relative h-48 bg-muted overflow-hidden">
          {photo_url ? (
            <img 
              src={photo_url} 
              alt={company_name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Building className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold">
              DESTAQUE
            </Badge>
          )}
          {promo_percentage && promo_percentage > 0 && (
            <Badge className="absolute top-3 right-3 bg-emerald-600 text-primary-foreground text-xs">
              -{promo_percentage}%
            </Badge>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {company_name}
          </h3>
          
          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
              {review_count !== undefined && review_count !== null && (
                <span className="text-xs text-muted-foreground">({review_count})</span>
              )}
              {city && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{[city, state].filter(Boolean).join(", ")}</span>
                </>
              )}
            </div>
          )}

          {!rating && (city || state) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />
              {[city, state].filter(Boolean).join(", ")}
            </p>
          )}

          {/* Price & Guests */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {price_min && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                A partir de R$ {price_min.toLocaleString("pt-BR")}
              </span>
            )}
            {(guest_min || guest_max) && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {guest_min && guest_max ? `${guest_min} a ${guest_max}` : guest_max ? `Até ${guest_max}` : `${guest_min}+`}
              </span>
            )}
          </div>

          {/* Category chip */}
          {category_name && (
            <div className="mt-3">
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {category_name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
