// Aplica migration (is_demo + admin policies) e popula 27 fornecedores demo + detalhes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Categoria slugs -> id (resolvido em runtime)
const CAT_SLUGS = {
  buffet: "espacos-buffet",
  espaco: "espacos-buffet",
  fotografo: "fotografia",
  decoracao: "decoracao",
  musica: "musica-dj",
  cerimonialista: "cerimonialista",
  beleza: "beleza-maquiagem",
  trajes: "vestido-noiva",
  convites: "convites",
};

function priceFromFaixa(f: string): { min: number; max: number } {
  if (f === "$") return { min: 1000, max: 5000 };
  if (f === "$$") return { min: 5000, max: 15000 };
  return { min: 15000, max: 50000 };
}

const DATA = {
  bandas: [
    ["ban-001","Banda Ritmo & Amor","Belo Horizonte","MG","31911110010","@bandaoritmo","https://bandoritmo.com.br","https://placehold.co/400x400?text=Banda+Ritmo+%26+Amor","$$$",false,0,"banda",10,"sertanejo, pop, MPB",5,true,true,true,true,8000,15000],
    ["ban-002","DJ Marco Beats","Belo Horizonte","MG","31922220011","@djmarcobeats","","https://placehold.co/400x400?text=DJ+Marco+Beats","$$",true,15,"DJ",1,"pop, internacional, eletrônico",6,true,true,false,true,2500,5000],
    ["ban-003","Duo Cordas & Voz","Betim","MG","31933330012","@duocordasvoz","","https://placehold.co/400x400?text=Duo+Cordas+%26+Voz","$",true,20,"dupla",2,"MPB, clássico, gospel",3,true,false,false,false,1200,2200],
  ],
  buffets: [
    ["buf-001","Sabor & Arte Buffet","Belo Horizonte","MG","31991110001","@saborarte_buffet","https://saborarte.com.br","https://placehold.co/400x400?text=Sabor+%26+Arte+Buffet","$$",true,20,"próprio espaço e externo","tradicional e italiano",80,300,90,160,true,true,false,true,"BH|Contagem|Betim"],
    ["buf-002","Festa e Sabor Buffet","Contagem","MG","31992220002","@festasabor","","https://placehold.co/400x400?text=Festa+e+Sabor+Buffet","$",true,30,"externo","variado e árabe",50,200,60,100,true,false,true,true,"Contagem|BH|Ibirité"],
    ["buf-003","Gran Gourmet Eventos","Belo Horizonte","MG","31993330003","@grangourmet_bh","https://grangourmet.com.br","https://placehold.co/400x400?text=Gran+Gourmet+Eventos","$$$",false,0,"próprio espaço","internacional e premium",150,500,180,350,true,true,true,true,"BH|Nova Lima|Brumadinho"],
  ],
  cerimonialistas: [
    ["cer-001","Elegância & Eventos","Belo Horizonte","MG","31997770007","@elegancia_eventos","https://eleganciaeeventos.com.br","https://placehold.co/400x400?text=Elegância+%26+Eventos","$$$",false,0,"completa",6,250,false,true,2500,6000,14000,true,true],
    ["cer-002","Sonho de Casamento Assessoria","Belo Horizonte","MG","31998880008","@sonhodecasamento_bh","","https://placehold.co/400x400?text=Sonho+de+Casamento","$$",true,10,"parcial",4,120,true,true,1800,4500,0,true,true],
    ["cer-003","Fernanda Lima Cerimonial","Contagem","MG","31999990009","@fernandalimacerimonial","","https://placehold.co/400x400?text=Fernanda+Lima","$",true,20,"dia-a",3,60,false,true,1200,0,0,true,false],
  ],
  convites: [
    ["con-001","Arte & Convite","Belo Horizonte","MG","31977780025","@arteconvite_bh","https://arteconvite.com.br","https://placehold.co/400x400?text=Arte+%26+Convite","$$",true,10,"físico e digital","personalizado e clássico",50,15,true,true,true,6,18,true],
    ["con-002","Papelaria da Noiva","Contagem","MG","31988890026","@papelariadanoiva","","https://placehold.co/400x400?text=Papelaria+da+Noiva","$",true,20,"físico","rústico e moderno",100,20,true,false,true,3,8,false],
    ["con-003","Digital Wedding Cards","Belo Horizonte","MG","31999900027","@digitalweddingbh","","https://placehold.co/400x400?text=Digital+Wedding","$",true,0,"digital","moderno e animado",1,5,false,true,true,2,5,true],
  ],
  decoracoes: [
    ["dec-001","Flores & Sonhos Decoração","Belo Horizonte","MG","31944440013","@floresersonhos","https://floresersonhos.com.br","https://placehold.co/400x400?text=Flores+%26+Sonhos","$$$",false,0,"romântico e clássico","floral e natural",true,true,400,true,true,4000,18000],
    ["dec-002","Arte em Flores BH","Contagem","MG","31955550014","@arteefloresbh","","https://placehold.co/400x400?text=Arte+em+Flores+BH","$$",true,15,"rústico e boho","floral e tecidos",true,false,250,true,true,2000,8000],
    ["dec-003","Decor Simples e Belo","Betim","MG","31966660015","@decorsimplesbelo","","https://placehold.co/400x400?text=Decor+Simples","$",true,25,"moderno e minimalista","misto e artificial",true,true,150,true,false,800,3500],
  ],
  espacos: [
    ["esp-001","Espaço Villa Jardins","Belo Horizonte","MG","31977770016","@villajardinsbh","https://villajardins.com.br","https://placehold.co/400x400?text=Villa+Jardins","$$$",false,0,"salão",300,500,true,true,true,true,true,false,true,true,8000,20000],
    ["esp-002","Sítio das Palmeiras","Contagem","MG","31988880017","@sitiodaspalmeiras","","https://placehold.co/400x400?text=Sitio+das+Palmeiras","$$",true,30,"sítio",150,250,true,true,true,true,false,true,false,true,3500,9000],
    ["esp-003","Salão Estrela do Norte","Betim","MG","31999990018","@salaoestrelabh","","https://placehold.co/400x400?text=Salão+Estrela","$",true,35,"salão",80,130,true,false,true,true,true,true,false,true,1200,3500],
  ],
  fotografos: [
    ["fot-001","Lucas Mendes Fotografia","Belo Horizonte","MG","31994440004","@lucasmendesfoto","https://lucasmendes.com.br","https://placehold.co/400x400?text=Lucas+Mendes","$$",true,15,"fotojornalismo",8,true,true,false,60,true,false,3500,6500,180],
    ["fot-002","Aline Duarte Foto & Filme","Contagem","MG","31995550005","@alineduartefoto","","https://placehold.co/400x400?text=Aline+Duarte","$$",true,20,"clássico",6,false,false,true,45,true,true,2800,5200,95],
    ["fot-003","Rafael Luz Fotografia","Betim","MG","31996660006","@rafaelluzfoto","https://rafaelluz.com","https://placehold.co/400x400?text=Rafael+Luz","$",true,25,"artístico",5,false,false,false,30,false,false,1800,0,42],
  ],
  maquiagens: [
    ["maq-001","Studio Bela Noiva","Belo Horizonte","MG","31944450022","@studiobela_noiva","https://studiobela.com.br","https://placehold.co/400x400?text=Studio+Bela+Noiva","$$",true,10,"maquiagem e cabelo",true,true,true,true,650,180,50,320],
    ["maq-002","Toque de Luz Make","Contagem","MG","31955560023","@toquedeuz_make","","https://placehold.co/400x400?text=Toque+de+Luz","$",true,20,"maquiagem",true,true,true,false,380,120,40,95],
    ["maq-003","Glamour Arte & Cabelo","Belo Horizonte","MG","31966670024","@glamourartecabelo","","https://placehold.co/400x400?text=Glamour+Arte","$$$",false,0,"maquiagem e cabelo",true,true,true,true,1200,300,0,500],
  ],
  trajes: [
    ["tra-001","Casa da Noiva BH","Belo Horizonte","MG","31911120019","@casadanoivabh","https://casadanoivabh.com.br","https://placehold.co/400x400?text=Casa+da+Noiva","$$$",false,0,"venda e locação","noiva e damas e madrinhas",true,"PP ao Plus Size",true,60,1500,8000,0,0],
    ["tra-002","Ternos & Estilo","Belo Horizonte","MG","31922230020","@ternosestilo","","https://placehold.co/400x400?text=Ternos+%26+Estilo","$$",true,15,"venda e locação","noivo e pajens",true,"P ao XGG",false,15,0,0,350,1800],
    ["tra-003","Atelier Completo","Contagem","MG","31933340021","@ateliercompleto","","https://placehold.co/400x400?text=Atelier+Completo","$$",true,20,"venda e locação","todos",true,"P ao Plus Size",true,45,900,4000,300,1200],
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const log: string[] = [];

  try {
    // 1) MIGRATION via RPC (criamos uma function temp via raw SQL)
    // Como não temos exec_sql, usamos uma edge para rodar SQL com fetch direto
    const sqlAdmin = `
      ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS suppliers_is_demo_idx ON public.suppliers(is_demo) WHERE is_demo = true;
      DROP POLICY IF EXISTS "Admin can delete suppliers" ON public.suppliers;
      CREATE POLICY "Admin can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
      DROP POLICY IF EXISTS "Admin can insert suppliers" ON public.suppliers;
      CREATE POLICY "Admin can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
      DO $$
      DECLARE tbl text;
      BEGIN
        FOREACH tbl IN ARRAY ARRAY[
          'supplier_details_buffet','supplier_details_fotografo','supplier_details_local',
          'supplier_details_decoracao','supplier_details_musica','supplier_details_cerimonialista',
          'supplier_details_beleza','supplier_details_trajes','supplier_details_convites'
        ] LOOP
          EXECUTE format('DROP POLICY IF EXISTS "Admin can manage details" ON public.%I;', tbl);
          EXECUTE format('CREATE POLICY "Admin can manage details" ON public.%I FOR ALL USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role));', tbl);
        END LOOP;
      END $$;
    `;
    
    // Usa endpoint pg-meta direto via REST não está disponível; tentamos via rpc 'exec' que pode não existir
    const execRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: sqlAdmin }),
    });
    log.push(`migration: ${execRes.status}`);

    // Carregar categorias
    const { data: cats } = await supa.from("categories").select("id, slug");
    const catBySlug: Record<string, string> = {};
    cats?.forEach((c: any) => { catBySlug[c.slug] = c.id; });

    // Pegar admin user_id
    const { data: roles } = await supa.from("user_roles").select("user_id").eq("role", "admin").limit(1);
    const adminId = roles?.[0]?.user_id;
    if (!adminId) throw new Error("admin não encontrado");

    // Helper para inserir supplier + retornar id
    async function insertSupplier(row: any, catSlug: string) {
      const faixa = row.faixa_preco;
      const { min, max } = priceFromFaixa(faixa);
      const { data, error } = await supa.from("suppliers").insert({
        user_id: adminId,
        company_name: row.nome,
        category_id: catBySlug[catSlug],
        city: row.cidade,
        state: row.estado,
        phone: row.whatsapp,
        whatsapp: row.whatsapp,
        instagram: row.instagram,
        website: row.site || null,
        profile_photo_url: row.foto_perfil_url,
        price_min: row.preco_min ?? min,
        price_max: row.preco_max ?? max,
        accepts_idle_dates: row.aceita_datas_ociosas,
        idle_discount_pct: row.desconto_datas_ociosas_pct || null,
        status: "approved",
        is_demo: true,
        description: row.descricao || `${row.nome} - cadastro de demonstração`,
      }).select("id").maybeSingle();
      if (error) { log.push(`ERR ${row.nome}: ${error.message}`); return null; }
      return data?.id;
    }

    // BANDAS
    for (const r of DATA.bandas) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[20], preco_max: r[21] };
      const id = await insertSupplier(row, "musica-dj");
      if (id) await supa.from("supplier_details_musica").insert({ supplier_id: id, data: { tipo: r[11], num_integrantes: r[12], repertorio: r[13], duracao_show_horas: r[14], inclui_som: r[15], inclui_iluminacao: r[16], precisa_rider: r[17], faz_cerimonia_e_recepcao: r[18] } });
    }

    // BUFFETS
    for (const r of DATA.buffets) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: (r[18] as number) * 100, preco_max: (r[19] as number) * 200 };
      const id = await insertSupplier(row, "espacos-buffet");
      if (id) await supa.from("supplier_details_buffet").insert({ supplier_id: id, data: { tipo_atendimento: r[11], estilo_culinario: r[12], capacidade_minima: r[13], capacidade_maxima: r[14], preco_por_pessoa_min: r[15], preco_por_pessoa_max: r[16], inclui_garcom: r[17], inclui_barman: r[18], inclui_bolo: r[19], atende_restricoes_alimentares: r[20], cidades_atendidas: r[21] } });
    }

    // CERIMONIALISTAS
    for (const r of DATA.cerimonialistas) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[15], preco_max: r[17] || r[16] || r[15] };
      const id = await insertSupplier(row, "cerimonialista");
      if (id) await supa.from("supplier_details_cerimonialista").insert({ supplier_id: id, data: { tipo_assessoria: r[11], tamanho_equipe: r[12], num_casamentos: r[13], inclui_decoracao: r[14], indica_fornecedores: r[15], preco_dia_a: r[15], preco_parcial: r[16], preco_completa: r[17], faz_religioso: r[18], faz_civil: r[19] } });
    }

    // CONVITES
    for (const r of DATA.convites) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[18], preco_max: r[19] };
      const id = await insertSupplier(row, "convites");
      if (id) await supa.from("supplier_details_convites").insert({ supplier_id: id, data: { tipo_convite: r[11], estilo: r[12], quantidade_minima: r[13], prazo_producao_dias: r[14], inclui_envelope: r[15], faz_mapa_localizacao: r[16], faz_arte_digital: r[17], faz_digital_animado: r[20] } });
    }

    // DECORACOES
    for (const r of DATA.decoracoes) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[18], preco_max: r[19] };
      const id = await insertSupplier(row, "decoracao");
      if (id) await supa.from("supplier_details_decoracao").insert({ supplier_id: id, data: { estilo: r[11], material_principal: r[12], possui_itens_proprios: r[13], faz_locacao_avulsa: r[14], capacidade_max_pessoas: r[15], faz_mesa_noivos: r[16], faz_cerimonia: r[17] } });
    }

    // ESPACOS
    for (const r of DATA.espacos) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[22], preco_max: r[23] };
      const id = await insertSupplier(row, "espacos-buffet");
      if (id) await supa.from("supplier_details_local").insert({ supplier_id: id, data: { tipo_espaco: r[11], capacidade_sentados: r[12], capacidade_em_pe: r[13], possui_cozinha: r[14], possui_estacionamento: r[15], aceita_fornecedores_externos: r[16], inclui_mesas_cadeiras: r[17], inclui_toalhas: r[18], disponivel_dias_uteis: r[19], possui_gerador: r[20], permite_decoracao_propria: r[21] } });
    }

    // FOTOGRAFOS
    for (const r of DATA.fotografos) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[19], preco_max: r[20] || r[19] };
      const id = await insertSupplier(row, "fotografia");
      if (id) await supa.from("supplier_details_fotografo").insert({ supplier_id: id, data: { estilo: r[11], horas_minimas_cobertura: r[12], inclui_segundo_fotografo: r[13], inclui_drone: r[14], inclui_album_impresso: r[15], prazo_entrega_dias: r[16], faz_pre_wedding: r[17], faz_video: r[18], num_casamentos: r[21] } });
    }

    // MAQUIAGENS
    for (const r of DATA.maquiagens) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[16], preco_max: r[16] };
      const id = await insertSupplier(row, "beleza-maquiagem");
      if (id) await supa.from("supplier_details_beleza").insert({ supplier_id: id, data: { servicos_oferecidos: r[11], atende_madrinhas: r[12], vai_ao_local: r[13], faz_teste_previo: r[14], inclui_noiva_completo: r[15], preco_pacote_noiva: r[16], preco_por_adicional: r[17], taxa_deslocamento: r[18], num_eventos: r[19] } });
    }

    // TRAJES
    for (const r of DATA.trajes) {
      const row = { faixa_preco: r[8], aceita_datas_ociosas: r[9], desconto_datas_ociosas_pct: r[10], nome: r[1], cidade: r[2], estado: r[3], whatsapp: r[4], instagram: r[5], site: r[6], foto_perfil_url: r[7], preco_min: r[17] || r[19] || 1500, preco_max: r[18] || r[20] || 8000 };
      const id = await insertSupplier(row, "vestido-noiva");
      if (id) await supa.from("supplier_details_trajes").insert({ supplier_id: id, data: { tipo_servico: r[11], atende: r[12], inclui_ajuste: r[13], tamanhos_disponiveis: r[14], faz_sob_medida: r[15], prazo_entrega_dias: r[16], preco_vestido_min: r[17], preco_vestido_max: r[18], preco_terno_min: r[19], preco_terno_max: r[20] } });
    }

    log.push("seed concluído");
    return new Response(JSON.stringify({ ok: true, log }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    log.push(`ERRO: ${e.message}`);
    return new Response(JSON.stringify({ ok: false, log, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
