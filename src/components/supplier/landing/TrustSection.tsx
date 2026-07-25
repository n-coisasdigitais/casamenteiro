import { CalendarCheck, Clock, Gift, Target, LucideIcon } from "lucide-react";
import { DEFAULT_LANDING, TrustCfg } from "@/lib/supplierLandingConfig";

const ICONS: Record<string, LucideIcon> = {
  gift: Gift,
  clock: Clock,
  target: Target,
  calendar: CalendarCheck,
};

export default function TrustSection({ cfg }: { cfg?: TrustCfg }) {
  const data = cfg ?? DEFAULT_LANDING.trust;
  if (!data?.items?.length) return null;

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{data.eyebrow}</span>
          <h2 className="font-serif text-3xl md:text-4xl mt-3 mb-4">{data.title}</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">{data.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((item) => {
            const Icon = ICONS[item.icon] ?? Gift;
            return (
              <article
                key={item.id}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-semibold text-base text-foreground mb-2 leading-snug">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}