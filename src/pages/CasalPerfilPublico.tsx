import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import HomeNavbar from "@/components/home/HomeNavbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MapPin, Calendar, Star, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/coupleProfile";
import { toast } from "sonner";

export default function CasalPerfilPublico() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("couple_public_profiles")
        .select("*")
        .eq("slug", slug!)
        .eq("publico", true)
        .maybeSingle();
      if (!p) { setLoading(false); return; }
      setPerfil(p);
      const { data: c } = await supabase.from("couples").select("*").eq("id", p.couple_id).maybeSingle();
      setCouple(c);
      if (p.exibir_fotos) {
        const { data: f } = await supabase.from("couple_photos").select("*").eq("couple_id", p.couple_id).order("ordem");
        setFotos(f || []);
      }
      if (p.exibir_videos) {
        const { data: v } = await supabase.from("couple_videos").select("*").eq("couple_id", p.couple_id);
        setVideos(v || []);
      }
      if (p.exibir_fornecedores) {
        const { data: cs } = await supabase
          .from("couple_suppliers")
          .select("suppliers(id,company_name,logo_url,category_id,categories(name,slug))")
          .eq("couple_id", p.couple_id)
          .eq("kanban_status", "contratado");
        setFornecedores((cs || []).map((x: any) => x.suppliers).filter(Boolean));
      }
      if (p.exibir_avaliacoes) {
        const { data: a } = await supabase
          .from("reviews")
          .select("*,suppliers(company_name,logo_url)")
          .eq("alvo_couple_id", p.couple_id)
          .eq("autor_tipo", "supplier")
          .eq("aprovado", true)
          .eq("publico", true)
          .order("created_at", { ascending: false });
        setAvaliacoes(a || []);
      }
      const { data: cmts } = await supabase
        .from("couple_profile_comments")
        .select("*")
        .eq("perfil_id", p.id)
        .eq("aprovado", true)
        .order("created_at", { ascending: false })
        .limit(20);
      setComentarios(cmts || []);
      setLoading(false);
    })();
  }, [slug]);

  const enviarComentario = async () => {
    if (!user) { navigate("/login"); return; }
    if (novoComentario.trim().length < 3) return;
    const { error } = await supabase.from("couple_profile_comments").insert({
      perfil_id: perfil.id, autor_id: user.id, texto: novoComentario.trim(),
    });
    if (error) { toast.error("Erro ao enviar comentário"); return; }
    toast.success("Comentário enviado! Aguardando moderação.");
    setNovoComentario("");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando…</div>;
  if (!perfil) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-muted-foreground">Perfil não encontrado.</p>
      <Link to="/casais"><Button variant="outline">Ver outros casais</Button></Link>
    </div>
  );

  const wedding = couple?.wedding_date ? parseISO(couple.wedding_date) : null;
  const isPast = wedding && wedding < new Date();
  const ratingAvg = avaliacoes.length ? (avaliacoes.reduce((s: number, r: any) => s + r.rating, 0) / avaliacoes.length).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO
        title={`${perfil.nome_casal} | Casamenteiro`}
        description={perfil.bio || `Conheça o casamento de ${perfil.nome_casal}${couple?.wedding_city ? ` em ${couple.wedding_city}` : ""}.`}
        canonical={`/casais/${perfil.slug}`}
        ogImage={perfil.foto_capa_url || perfil.foto_perfil_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: `Casamento de ${perfil.nome_casal}`,
          startDate: couple?.wedding_date,
          location: couple?.wedding_city,
          description: perfil.bio,
        }}
      />
      <HomeNavbar onSimularClick={() => navigate("/simulador")} />

      {/* HERO */}
      <div className="relative h-[400px] md:h-[500px] bg-gradient-to-br from-primary/30 to-secondary/30">
        {perfil.foto_capa_url && (
          <img src={perfil.foto_capa_url} alt={perfil.nome_casal} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="container px-4 -mt-16 relative z-10 pb-12">
        {/* IDENTIDADE */}
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-muted overflow-hidden flex-shrink-0 -mt-16 shadow-lg">
              {perfil.foto_perfil_url ? (
                <img src={perfil.foto_perfil_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10"><Heart className="h-10 w-10 text-primary" /></div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-3xl md:text-4xl">{perfil.nome_casal}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                {perfil.exibir_data && wedding && (
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(wedding, "dd 'de' MMMM yyyy", { locale: ptBR })}</span>
                )}
                {couple?.wedding_city && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{couple.wedding_city}</span>
                )}
                {perfil.estilo && <Badge variant="outline" className="capitalize">{perfil.estilo}</Badge>}
                {isPast && <Badge className="bg-primary/20 text-primary">💍 Já casou</Badge>}
              </div>
              {ratingAvg && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(Number(ratingAvg)) ? "fill-primary text-primary" : "text-muted"}`} />
                    ))}
                  </div>
                  <span className="text-sm">{ratingAvg} · {avaliacoes.length} avaliações</span>
                </div>
              )}
              {perfil.bio && <p className="mt-4 text-foreground/80 leading-relaxed">{perfil.bio}</p>}
              {perfil.mensagens_casais && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!user) { navigate("/login"); return; }
                      const { data: myCouple } = await supabase
                        .from("couples").select("id").eq("user_id", user.id).maybeSingle();
                      if (!myCouple) { toast.error("Apenas casais podem enviar mensagens."); return; }
                      if (myCouple.id === perfil.couple_id) return;
                      const texto = prompt("Sua mensagem para " + perfil.nome_casal + ":");
                      if (!texto?.trim()) return;
                      const { error } = await supabase.from("couple_messages").insert({
                        remetente_couple_id: myCouple.id,
                        destinatario_couple_id: perfil.couple_id,
                        texto: texto.trim(),
                      });
                      if (error) toast.error("Não foi possível enviar");
                      else toast.success("Mensagem enviada!");
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />Enviar mensagem
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FORNECEDORES */}
        {perfil.exibir_fornecedores && fornecedores.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl mb-4">Fornecedores contratados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fornecedores.map((s: any) => (
                <Link key={s.id} to={`/fornecedor/${s.id}`}>
                  <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-full bg-muted overflow-hidden">
                      {s.logo_url && <img src={s.logo_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-medium">{s.company_name}</p>
                      <p className="text-xs text-muted-foreground">{s.categories?.name || ""}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ÁLBUM */}
        {perfil.exibir_fotos && fotos.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl mb-4">{isPast ? "Fotos do casamento" : "Prévia do casamento"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {fotos.map((f: any) => (
                <button key={f.id} onClick={() => setLightbox(f.url)} className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90">
                  <img src={f.url} alt={f.legenda || ""} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* VÍDEOS */}
        {perfil.exibir_videos && videos.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl mb-4">Vídeos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((v: any) => {
                const embed = v.tipo === "youtube" ? youtubeEmbedUrl(v.url) : v.url;
                return (
                  <div key={v.id} className="aspect-video rounded-lg overflow-hidden bg-black">
                    {embed && v.tipo === "youtube" ? (
                      <iframe src={embed} title={v.titulo || "Vídeo"} className="w-full h-full" allowFullScreen />
                    ) : (
                      <video src={v.url} controls className="w-full h-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AVALIAÇÕES */}
        {perfil.exibir_avaliacoes && avaliacoes.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-2xl mb-4">Avaliações dos fornecedores</h2>
            <div className="space-y-3">
              {avaliacoes.map((a: any) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {a.suppliers?.logo_url && <img src={a.suppliers.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />}
                    <div>
                      <p className="font-medium">{a.suppliers?.company_name}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < a.rating ? "fill-primary text-primary" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {a.comment && <p className="text-sm text-foreground/80">{a.comment}</p>}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* COMENTÁRIOS */}
        <section className="mb-10">
          <h2 className="font-serif text-2xl mb-4">Comentários da comunidade</h2>
          {user ? (
            <div className="mb-4">
              <Textarea
                placeholder="Deixe seu recado para o casal…"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                maxLength={500}
              />
              <Button onClick={enviarComentario} className="mt-2">Enviar comentário</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              <Link to="/login" className="text-primary underline">Faça login</Link> para deixar um comentário.
            </p>
          )}
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
          ) : (
            <div className="space-y-3">
              {comentarios.map((c: any) => (
                <Card key={c.id} className="p-3">
                  <p className="text-sm">{c.texto}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(parseISO(c.created_at), "dd/MM/yyyy")}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}