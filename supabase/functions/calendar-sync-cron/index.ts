import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-calendar-callback`;

type Conn = {
  id: string;
  supplier_id: string;
  provider: "google" | "outlook";
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  sync_enabled: boolean;
};

async function refreshGoogle(c: Conn) {
  const id = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
  const secret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
  if (!c.refresh_token) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id, client_secret: secret,
      refresh_token: c.refresh_token, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  const t = await r.json();
  return { access_token: t.access_token as string, expires_in: t.expires_in as number };
}

async function refreshOutlook(c: Conn) {
  const id = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_ID")!;
  const secret = Deno.env.get("MICROSOFT_CALENDAR_CLIENT_SECRET")!;
  if (!c.refresh_token) return null;
  const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id, client_secret: secret,
      refresh_token: c.refresh_token, grant_type: "refresh_token",
      redirect_uri: REDIRECT_URI,
      scope: "offline_access Calendars.Read User.Read",
    }),
  });
  if (!r.ok) return null;
  const t = await r.json();
  return { access_token: t.access_token as string, expires_in: t.expires_in as number };
}

async function ensureFreshToken(admin: ReturnType<typeof createClient>, c: Conn) {
  const exp = c.token_expires_at ? new Date(c.token_expires_at).getTime() : 0;
  if (Date.now() < exp - 60_000) return c.access_token;
  const refreshed = c.provider === "google" ? await refreshGoogle(c) : await refreshOutlook(c);
  if (!refreshed) return null;
  await admin.from("supplier_calendar_connections").update({
    access_token: refreshed.access_token,
    token_expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", c.id);
  return refreshed.access_token;
}

async function fetchGoogleEvents(token: string, calendarId: string) {
  const min = new Date(); min.setHours(0,0,0,0);
  const max = new Date(); max.setFullYear(max.getFullYear() + 2);
  const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || "primary")}/events`);
  u.searchParams.set("timeMin", min.toISOString());
  u.searchParams.set("timeMax", max.toISOString());
  u.searchParams.set("singleEvents", "true");
  u.searchParams.set("maxResults", "2500");
  u.searchParams.set("showDeleted", "false");
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Google events: ${r.status} ${await r.text()}`);
  const data = await r.json();
  // Cada dia ocupado é uma data bloqueada
  const days = new Map<string, string>(); // date -> external_event_id
  for (const ev of (data.items || [])) {
    if (ev.transparency === "transparent") continue; // marcado como livre
    if (ev.status === "cancelled") continue;
    const startStr = ev.start?.date || ev.start?.dateTime;
    const endStr = ev.end?.date || ev.end?.dateTime;
    if (!startStr) continue;
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 3600_000);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) days.set(key, ev.id);
    }
  }
  return days;
}

async function fetchOutlookEvents(token: string) {
  const min = new Date(); min.setHours(0,0,0,0);
  const max = new Date(); max.setFullYear(max.getFullYear() + 2);
  const u = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  u.searchParams.set("startDateTime", min.toISOString());
  u.searchParams.set("endDateTime", max.toISOString());
  u.searchParams.set("$top", "1000");
  u.searchParams.set("$select", "id,start,end,showAs,isCancelled,subject");
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
  if (!r.ok) throw new Error(`Outlook events: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const days = new Map<string, string>();
  for (const ev of (data.value || [])) {
    if (ev.isCancelled) continue;
    if (ev.showAs === "free" || ev.showAs === "workingElsewhere") continue;
    const start = new Date(ev.start?.dateTime + "Z");
    const end = new Date(ev.end?.dateTime + "Z");
    if (isNaN(start.getTime())) continue;
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) days.set(key, ev.id);
    }
  }
  return days;
}

async function syncOne(admin: ReturnType<typeof createClient>, c: Conn) {
  const token = await ensureFreshToken(admin, c);
  if (!token) return { ok: false, error: "token_refresh_failed" };
  const days = c.provider === "google"
    ? await fetchGoogleEvents(token, c.calendar_id || "primary")
    : await fetchOutlookEvents(token);

  // Limpa imports anteriores deste provedor + reinsere
  await admin.from("supplier_blocked_dates")
    .delete()
    .eq("supplier_id", c.supplier_id)
    .eq("source", `calendar:${c.provider}`);

  const rows = Array.from(days.entries()).map(([date, evId]) => ({
    supplier_id: c.supplier_id,
    blocked_date: date,
    reason: c.provider === "google" ? "Agenda Google" : "Agenda Outlook",
    source: `calendar:${c.provider}`,
    external_event_id: evId,
  }));
  if (rows.length) {
    // insere em lotes
    for (let i = 0; i < rows.length; i += 500) {
      await admin.from("supplier_blocked_dates").insert(rows.slice(i, i + 500));
    }
  }
  await admin.from("supplier_calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", c.id);

  return { ok: true, count: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let supplierFilter: string | null = null;
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    supplierFilter = body.supplier_id || null;
  }
  let q = admin.from("supplier_calendar_connections").select("*").eq("sync_enabled", true);
  if (supplierFilter) q = q.eq("supplier_id", supplierFilter);
  const { data: conns, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const results: any[] = [];
  for (const c of (conns || []) as Conn[]) {
    try {
      const r = await syncOne(admin, c);
      results.push({ supplier_id: c.supplier_id, provider: c.provider, ...r });
    } catch (e) {
      results.push({ supplier_id: c.supplier_id, provider: c.provider, ok: false, error: String(e) });
    }
  }
  return new Response(JSON.stringify({ synced: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});