import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { DEFAULT_LANDING, NavbarCfg } from "@/lib/supplierLandingConfig";

export default function VendorNavbar({ cfg = DEFAULT_LANDING.navbar }: { cfg?: NavbarCfg }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 backdrop-blur-md transition-all ${
        scrolled ? "border-b border-white/10" : "border-b border-transparent"
      }`}
      style={{ background: "rgba(20,16,14,0.55)" }}
    >
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 text-white">
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <span className="font-serif text-lg">Casamenteiro</span>
        </Link>
        <Link
          to={cfg.cta_href}
          className="rounded-full px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition shadow-lg shadow-primary/30"
        >
          {cfg.cta_label}
        </Link>
      </div>
    </header>
  );
}
