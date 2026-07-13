import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Feature flags are stored in `system_settings` with keys `feature_flag_<name>`.
// `value` is JSONB — either a boolean or `{ enabled: boolean }`. Defaults to true.
const cache = new Map<string, boolean>();

export function useFeatureFlag(name: string, defaultValue = true): boolean {
  const key = `feature_flag_${name}`;
  const [enabled, setEnabled] = useState<boolean>(
    cache.has(key) ? (cache.get(key) as boolean) : defaultValue
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await (supabase
        .from("system_settings" as any)
        .select("value")
        .eq("key", key)
        .maybeSingle() as any);
      if (!mounted) return;
      let val: boolean = defaultValue;
      const raw = (data as any)?.value;
      if (raw === true || raw === false) val = raw;
      else if (raw && typeof raw === "object" && "enabled" in raw) val = !!raw.enabled;
      cache.set(key, val);
      setEnabled(val);
    })();
    return () => { mounted = false; };
  }, [key, defaultValue]);

  return enabled;
}