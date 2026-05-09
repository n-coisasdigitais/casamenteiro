import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Check, Heart, Upload, X, Loader2 } from "lucide-react";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import { traduzirErroAuth } from "@/lib/authErrors";
import SEO from "@/components/SEO";

type Categoria = { id: string; name: string; slug: string; icon: string | null };
type Campo = {
  id: string;
  category_id: string;
  chave: string;
  label: string;
  ajuda: string | null;
  tipo: "texto" | "numero" | "booleano" | "select" | "lista" | "faixa" | "textarea";
  opcoes: any;
  obrigatorio: boolean;
  grupo: string | null;
  ordem: number;
};

const CAT_ICON: Record<string, string> = {
  "espacos-buffet": "🍽️", fotografia: "📸", cerimonialista: "💍",
  "musica-dj": "🎵", decoracao: "🌸", "traje-noivo": "🤵",
  "vestido-noiva": "👰", "beleza-maquiagem": "💄", convites: "✉️",
  "bolos-doces": "🎂", transporte: "🚗", video: "🎬",
};

const UFs = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function SupplierOnboarding() {
  const { session, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [step, setStep] = useState(0); // 0=conta, 1=categoria, 2=basico, 3..=grupos, depois fotos, depois revisao
  const [saving, setSaving] = useState(false);

  // Etapa 0 — conta
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupAcceptTerms, setSignupAcceptTerms] = useState(false);

  // Etapa 1 — categoria
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");

  // Etapa 2 — dados básicos
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Etapas dinâmicas
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, any>>({}); // chave campo.id

  // Fotos
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Carregar categorias
  useEffect(() => {
    supabase.from("categories").select("id, name, slug, icon").order("name").then(({ data }) => {
      setCategorias((data || []) as any);
    });
  }, []);

  // Bootstrap: detectar usuário/fornecedor existente
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (!session?.user) {
        setBootLoading(false);
        setStep(0);
        return;
      }
      // tem supplier?
      const { data: sup } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!sup) {
        // não é fornecedor
        toast({ title: "Conta não é de fornecedor", description: "Use uma conta de fornecedor para concluir o cadastro." });
        navigate("/", { replace: true });
        return;
      }
      if (sup.onboarding_completed) {
        navigate("/fornecedor/painel", { replace: true });
        return;
      }
      setSupplierId(sup.id);
      setCompanyName(sup.company_name || "");
      setCity(sup.city || "");
      setState(sup.state || "");
      setWhatsapp(formatPhoneBR(sup.whatsapp || sup.phone || ""));
      setInstagram(sup.instagram || "");
      setWebsite(sup.website || "");
      setDescription(sup.description || "");
      setCategoryId(sup.category_id || "");
      setProfilePhoto(sup.profile_photo_url || null);
      // gallery
      const { data: photos } = await (supabase.from("supplier_photos") as any)
        .select("id, photo_url")
        .eq("supplier_id", sup.id)
        .order("display_order");
      setGalleryPhotos((photos || []).map((p: any) => ({ id: p.id, url: p.photo_url })));
      // pular etapa 0
      setStep(Math.max(1, sup.onboarding_step || 1));
      setBootLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  // Carregar campos da categoria selecionada
  useEffect(() => {
    if (!categoryId) { setCampos([]); return; }
    (async () => {
      const { data } = await (supabase.from("campos_categoria") as any)
        .select("*").eq("category_id", categoryId).eq("ativo", true).order("ordem");
      setCampos((data || []) as Campo[]);
      // preencher respostas existentes
      if (supplierId) {
        const { data: resps } = await (supabase.from("fornecedor_campos") as any)
          .select("campo_id, valor").eq("supplier_id", supplierId);
        const map: Record<string, any> = {};
        (resps || []).forEach((r: any) => { map[r.campo_id] = r.valor; });
        setRespostas(map);
      }
    })();
  }, [categoryId, supplierId]);

  // Grupos de campos (cada grupo = uma etapa)
  const grupos = useMemo(() => {
    const m = new Map<string, Campo[]>();
    campos.forEach((c) => {
      const g = c.grupo || "Detalhes";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(c);
    });
    return Array.from(m.entries()).map(([nome, lista]) => ({ nome, campos: lista }));
  }, [campos]);

  // Mapeamento de etapas
  // 0 = conta, 1 = categoria, 2 = dados básicos, 3..(3+grupos.length-1) = grupos, +1 = fotos, +1 = revisão
  const etapaGruposInicio = 3;
  const etapaFotos = etapaGruposInicio + grupos.length;
  const etapaRevisao = etapaFotos + 1;
  const totalEtapas = etapaRevisao + 1;
  const progress = Math.min(100, ((step + 1) / totalEtapas) * 100);

  // ─────── Handlers ───────
  const handleSignup = async () => {
    if (!signupAcceptTerms) {
      toast({ title: "Aceite os termos", description: "Você precisa aceitar os termos para continuar.", variant: "destructive" });
      return;
    }
    if (signupPass.length < 6) {
      toast({ title: "Senha curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPass,
        options: {
          data: { full_name: signupName, account_type: "supplier", company_name: signupName },
          emailRedirectTo: `${window.location.origin}/fornecedor/cadastro`,
        },
      });
      if (error) throw error;
      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar. Depois volte aqui para continuar.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível criar a conta", description: traduzirErroAuth(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveSupplierBasics = async () => {
    if (!supplierId) return false;
    if (companyName.trim().length < 2 || !city.trim() || !state.trim() || !isValidPhoneBR(whatsapp)) {
      toast({ title: "Preencha os dados", description: "Nome, cidade, UF e WhatsApp são obrigatórios.", variant: "destructive" });
      return false;
    }
    const { error } = await (supabase.from("suppliers") as any).update({
      company_name: companyName.trim(),
      city: city.trim(),
      state: state.toUpperCase().slice(0, 2),
      whatsapp: whatsapp.replace(/\D/g, ""),
      phone: whatsapp.replace(/\D/g, ""),
      instagram: instagram.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      category_id: categoryId || null,
      onboarding_step: step + 1,
    }).eq("id", supplierId);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return false; }
    return true;
  };

  const saveCategoria = async () => {
    if (!supplierId || !categoryId) return false;
    const { error } = await (supabase.from("suppliers") as any).update({
      category_id: categoryId, onboarding_step: step + 1,
    }).eq("id", supplierId);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return false; }
    return true;
  };

  const saveGrupo = async (grupo: { campos: Campo[] }) => {
    if (!supplierId) return false;
    // valida obrigatórios
    for (const c of grupo.campos) {
      if (c.obrigatorio) {
        const v = respostas[c.id];
        const vazio =
          v === undefined || v === null || v === "" ||
          (Array.isArray(v) && v.length === 0) ||
          (c.tipo === "faixa" && (!v?.min));
        if (vazio) {
          toast({ title: "Campo obrigatório", description: `Preencha "${c.label}".`, variant: "destructive" });
          return false;
        }
      }
    }
    const rows = grupo.campos
      .filter((c) => respostas[c.id] !== undefined && respostas[c.id] !== "")
      .map((c) => ({ supplier_id: supplierId, campo_id: c.id, valor: respostas[c.id] }));
    if (rows.length > 0) {
      const { error } = await (supabase.from("fornecedor_campos") as any)
        .upsert(rows, { onConflict: "supplier_id,campo_id" });
      if (error) { toast({ title: "Erro ao salvar respostas", description: error.message, variant: "destructive" }); return false; }
    }
    await (supabase.from("suppliers") as any).update({ onboarding_step: step + 1 }).eq("id", supplierId);
    return true;
  };

  const handleProfileUpload = async (file: File) => {
    if (!supplierId || !session?.user) return;
    setUploading(true);
    try {
      const path = `${session.user.id}/profile-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("supplier-photos").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("supplier-photos").getPublicUrl(path);
      await (supabase.from("suppliers") as any).update({ profile_photo_url: publicUrl }).eq("id", supplierId);
      setProfilePhoto(publicUrl);
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleGalleryUpload = async (file: File) => {
    if (!supplierId || !session?.user || galleryPhotos.length >= 10) return;
    setUploading(true);
    try {
      const path = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("supplier-photos").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("supplier-photos").getPublicUrl(path);
      const { data: ins } = await (supabase.from("supplier_photos") as any)
        .insert({ supplier_id: supplierId, photo_url: publicUrl, display_order: galleryPhotos.length })
        .select().maybeSingle();
      if (ins) setGalleryPhotos([...galleryPhotos, { id: ins.id, url: publicUrl }]);
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const removeGalleryPhoto = async (id: string) => {
    await supabase.from("supplier_photos").delete().eq("id", id);
    setGalleryPhotos(galleryPhotos.filter((p) => p.id !== id));
  };

  const submitForApproval = async () => {
    if (!supplierId) return;
    if (!profilePhoto) {
      toast({ title: "Foto obrigatória", description: "Adicione a foto de perfil antes de enviar.", variant: "destructive" });
      setStep(etapaFotos);
      return;
    }
    setSaving(true);
    try {
      await (supabase.from("suppliers") as any).update({
        status: "pending", onboarding_completed: true, onboarding_step: 999,
      }).eq("id", supplierId);
      await (supabase.from("fornecedor_aprovacoes") as any).insert({
        supplier_id: supplierId, acao: "submitted",
      });
      toast({ title: "Cadastro enviado!", description: "Vamos revisar e te avisar em até 48h." });
      navigate("/fornecedor/painel", { replace: true });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const next = async () => {
    if (saving) return;
    if (step === 1) { if (!await saveCategoria()) return; }
    else if (step === 2) { if (!await saveSupplierBasics()) return; }
    else if (step >= etapaGruposInicio && step < etapaFotos) {
      const g = grupos[step - etapaGruposInicio];
      if (!await saveGrupo(g)) return;
    }
    setStep((s) => Math.min(s + 1, totalEtapas - 1));
  };

  const back = () => setStep((s) => Math.max((session ? 1 : 0), s - 1));

  // ─────── Render helpers ───────
  const renderCampo = (c: Campo) => {
    const v = respostas[c.id];
    const set = (val: any) => setRespostas((r) => ({ ...r, [c.id]: val }));
    switch (c.tipo) {
      case "texto":
        return <Input value={v || ""} onChange={(e) => set(e.target.value)} />;
      case "textarea":
        return <Textarea value={v || ""} onChange={(e) => set(e.target.value)} rows={4} />;
      case "numero":
        return <Input type="number" inputMode="numeric" value={v ?? ""} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} />;
      case "booleano":
        return (
          <div className="flex gap-2">
            <button type="button" onClick={() => set(true)}
              className={`flex-1 h-12 rounded-full border-2 transition ${v === true ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
              Sim
            </button>
            <button type="button" onClick={() => set(false)}
              className={`flex-1 h-12 rounded-full border-2 transition ${v === false ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
              Não
            </button>
          </div>
        );
      case "select": {
        const opts: string[] = Array.isArray(c.opcoes) ? c.opcoes : [];
        return (
          <div className="grid sm:grid-cols-2 gap-2">
            {opts.map((o) => (
              <button key={o} type="button" onClick={() => set(o)}
                className={`text-left p-3 rounded-xl border-2 transition ${v === o ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                {o}
              </button>
            ))}
          </div>
        );
      }
      case "lista": {
        const list: string[] = Array.isArray(v) ? v : [];
        const [draft, setDraft] = [
          (respostas as any)[`__draft_${c.id}`] || "",
          (val: string) => setRespostas((r) => ({ ...r, [`__draft_${c.id}`]: val })),
        ];
        const add = () => {
          const t = (draft as string).trim();
          if (!t) return;
          set([...list, t]);
          setDraft("");
        };
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={draft as string} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                placeholder="Digite e pressione Enter" />
              <Button type="button" onClick={add}>Adicionar</Button>
            </div>
            {list.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {list.map((it, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    {it}
                    <button onClick={() => set(list.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }
      case "faixa": {
        const fv = v || {};
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="De" value={fv.min ?? ""} onChange={(e) => set({ ...fv, min: e.target.value === "" ? null : Number(e.target.value) })} />
            <Input type="number" placeholder="Até" value={fv.max ?? ""} onChange={(e) => set({ ...fv, max: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        );
      }
      default: return null;
    }
  };

  if (authLoading || bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <SEO title="Cadastro de fornecedor — Casamenteiro" description="Complete seu cadastro para aparecer na vitrine do Casamenteiro." />

      {/* Topo: voltar + progresso */}
      <header className="sticky top-0 z-20 bg-[#FAF7F2]/90 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/fornecedor" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Sair
          </Link>
          <div className="flex-1">
            <Progress value={progress} className="h-1.5" />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{step + 1}/{totalEtapas}</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-2">
        {/* Etapa 0 — Conta */}
        {step === 0 && !session && (
          <div className="space-y-5 max-w-md mx-auto">
            <div>
              <h1 className="text-3xl font-semibold">Primeiro, vamos criar sua conta.</h1>
              <p className="text-muted-foreground mt-1">É rápido. Depois você completa as informações do seu serviço.</p>
            </div>
            <div className="space-y-3">
              <div><Label>Nome completo</Label><Input value={signupName} onChange={(e) => setSignupName(e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} /></div>
              <div><Label>Senha (mínimo 6)</Label><Input type="password" value={signupPass} onChange={(e) => setSignupPass(e.target.value)} /></div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={signupAcceptTerms} onCheckedChange={(v) => setSignupAcceptTerms(v === true)} className="mt-0.5" />
                <span>Aceito os <Link to="/termos" target="_blank" className="text-primary underline">Termos</Link> e a <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.</span>
              </label>
            </div>
            <Button onClick={handleSignup} disabled={saving} className="w-full h-12 rounded-full">
              {saving ? "Criando conta..." : "Criar conta e continuar →"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Já tem cadastro? <Link to="/fornecedor/login" className="text-primary underline">Fazer login</Link>
            </div>
          </div>
        )}

        {/* Etapa 1 — Categoria */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold">Qual é o seu tipo de serviço?</h1>
              <p className="text-muted-foreground mt-1">Escolha a categoria principal. Você poderá ajustar depois.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categorias.map((c) => {
                const sel = categoryId === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background"}`}>
                    <div className="text-2xl mb-2">{CAT_ICON[c.slug] || c.icon || "✨"}</div>
                    <div className="font-medium">{c.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Etapa 2 — Dados básicos */}
        {step === 2 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h1 className="text-3xl font-semibold">Conte um pouco sobre o seu negócio.</h1>
              <p className="text-muted-foreground mt-1">Informações básicas que aparecem no seu perfil.</p>
            </div>
            <div><Label>Nome do negócio *</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div>
              <Label>Descrição (será exibida no perfil)</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte sobre seu diferencial, estilo, experiência..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1"><Label>Cidade *</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div>
                <Label>UF *</Label>
                <select value={state} onChange={(e) => setState(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">--</option>
                  {UFs.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp *</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))} placeholder="(11) 99999-0000" />
              </div>
              <div><Label>Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuperfil" /></div>
            </div>
            <div><Label>Site (opcional)</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
          </div>
        )}

        {/* Etapas dinâmicas dos grupos */}
        {step >= etapaGruposInicio && step < etapaFotos && grupos[step - etapaGruposInicio] && (
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Sobre o seu serviço</p>
              <h1 className="text-3xl font-semibold mt-1">{grupos[step - etapaGruposInicio].nome}</h1>
            </div>
            <div className="space-y-5">
              {grupos[step - etapaGruposInicio].campos.map((c) => (
                <div key={c.id}>
                  <Label>{c.label}{c.obrigatorio && <span className="text-primary"> *</span>}{!c.obrigatorio && <span className="text-muted-foreground text-xs"> (opcional)</span>}</Label>
                  {c.ajuda && <p className="text-xs text-muted-foreground mb-2">{c.ajuda}</p>}
                  {renderCampo(c)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etapa Fotos */}
        {step === etapaFotos && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold">Adicione fotos do seu trabalho.</h1>
              <p className="text-muted-foreground mt-1">A foto de perfil é obrigatória. As outras aumentam suas chances de contato.</p>
            </div>
            <div>
              <Label>Foto de perfil *</Label>
              <div className="mt-2 flex items-center gap-4">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Perfil" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center justify-center h-10 px-4 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition">
                  {profilePhoto ? "Trocar foto" : "Enviar foto"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && handleProfileUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div>
              <Label>Galeria (até 10 fotos)</Label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {galleryPhotos.map((p) => (
                  <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeGalleryPhoto(p.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {galleryPhotos.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-muted-foreground">
                    <div className="text-center text-xs">
                      <Upload className="h-5 w-5 mx-auto" />
                      <span>{uploading ? "Enviando..." : "Adicionar"}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => e.target.files?.[0] && handleGalleryUpload(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Etapa Revisão */}
        {step === etapaRevisao && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold">Tudo certo. Revise antes de enviar.</h1>
              <p className="text-muted-foreground mt-1">Após enviar, nossa equipe analisa em até 48h.</p>
            </div>
            <div className="space-y-4 bg-background border border-border rounded-2xl p-5">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Negócio</p>
                <p className="font-medium">{companyName} — {city}/{state}</p>
                <p className="text-sm text-muted-foreground">{categorias.find((c) => c.id === categoryId)?.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Contato</p>
                <p className="text-sm">WhatsApp {whatsapp} {instagram && `• ${instagram}`}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Detalhes preenchidos</p>
                <p className="text-sm">{Object.keys(respostas).filter((k) => !k.startsWith("__")).length} campos respondidos</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Fotos</p>
                <p className="text-sm">{profilePhoto ? "Perfil ✓" : "Perfil pendente"} • {galleryPhotos.length} na galeria</p>
              </div>
            </div>
            <Button onClick={submitForApproval} disabled={saving} className="w-full h-14 rounded-full text-base">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5 mr-2" /> Enviar para aprovação</>}
            </Button>
          </div>
        )}

        {/* Navegação */}
        {step > 0 && step !== etapaRevisao && (
          <div className="mt-10 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={saving}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={next} disabled={saving || (step === 1 && !categoryId)} className="h-12 px-6 rounded-full">
              {saving ? "Salvando..." : "Continuar"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
