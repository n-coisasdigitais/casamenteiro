// Aplica migration (is_demo + admin policies) e popula 27 fornecedores demo + detalhes
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

function priceFromFaixa(f: string): { min: number; max: number } {
  if (f === "$") return { min: 1000, max: 5000 };
  if (f === "$$") return { min: 5000, max: 15000 };
  return { min: 15000, max: 50000 };
}

const DATA: Record<string, any[][]> = {
  bandas: [
    ["ban-001","Banda Ritmo & Amor","Belo Horizonte","MG","31911110010","@bandaoritmo","https://bandoritmo.com.br","https://placehold.co/400x400?text=Banda+Ritmo","$$$",false,0,"banda",10,"sertanejo, pop, MPB",5,true,true,true,true,8000,15000],
    ["ban-002","DJ Marco Beats","Belo Horizonte","MG","31922220011","@djmarcobeats","","https://placehold.co/400x400?text=DJ+Marco","$$",true,15,"DJ",1,"pop, internacional, eletrônico",6,true,true,false,true,2500,5000],
    ["ban-003","Duo Cordas & Voz","Betim","MG","31933330012","@duocordasvoz","","https://placehold.co/400x400?text=Duo+Cordas","$",true,20,"dupla",2,"MPB, clássico, gospel",3,true,false,false,false,1200,2200],
  ],
  buffets: [
    ["buf-001","Sabor & Arte Buffet","Belo Horizonte","MG","31991110001","@saborarte_buffet","https://saborarte.com.br","https://placehold.co/400x400?text=Sabor+Arte","$$",true,20,"próprio espaço e externo","tradicional e italiano",80,300,90,160,true,true,false,true,"BH|Contagem|Betim"],
    ["buf-002","Festa e Sabor Buffet","Contagem","MG","31992220002","@festasabor","","https://placehold.co/400x400?text=Festa+Sabor","$",true,30,"externo","variado e árabe",50,200,60,100,true,false,true,true,"Contagem|BH|Ibirité"],
    ["buf-003","Gran Gourmet Eventos","Belo Horizonte","MG","31993330003","@grangourmet_bh","https://grangourmet.com.br","https://placehold.co/400x400?text=Gran+Gourmet","$$$",false,0,"próprio espaço","internacional e premium",150,500,180,350,true,true,true,true,"BH|Nova Lima|Brumadinho"],
  ],
  cerimonialistas: [
    ["cer-001","Elegância & Eventos","Belo Horizonte","MG","31997770007","@elegancia_eventos","https://eleganciaeeventos.com.br","https://placehold.co/400x400?text=Elegancia","$$$",false,0,"completa",6,250,false,true,2500,6000,14000,true,true],
    ["cer-002","Sonho de Casamento","Belo Horizonte","MG","31998880008","@sonhodecasamento_bh","","https://placehold.co/400x400?text=Sonho+Casamento","$$",true,10,"parcial",4,120,true,true,1800,4500,0,true,true],
    ["cer-003","Fernanda Lima Cerimonial","Contagem","MG","31999990009","@fernandalimacerimonial","","https://placehold.co/400x400?text=Fernanda+Lima","$",true,20,"dia-a",3,60,false,true,1200,0,0,true,false],
  ],
  convites: [
    ["con-001","Arte & Convite","Belo Horizonte","MG","31977780025","@arteconvite_bh","https://arteconvite.com.br","https://placehold.co/400x400?text=Arte+Convite","$$",true,10,"físico e digital","personalizado e clássico",50,15,true,true,true,6,18,true],
    ["con-002","Papelaria da Noiva","Contagem","MG","31988890026","@papelariadanoiva","","https://placehold.co/400x400?text=Papelaria+Noiva","$",true,20,"físico","rústico e moderno",100,20,true,false,true,3,8,false],
    ["con-003","Digital Wedding Cards","Belo Horizonte","MG","31999900027","@digitalweddingbh","","https://placehold.co/400x400?text=Digital+Wedding","$",true,0,"digital","moderno e animado",1,5,false,true,true,2,5,true],
  ],
  decoracoes: [
    ["dec-001","Flores & Sonhos Decoração","Belo Horizonte","MG","31944440013","@floresersonhos","https://floresersonhos.com.br","https://placehold.co/400x400?text=Flores+Sonhos","$$$",false,0,"romântico e clássico","floral e natural",true,true,400,true,true,4000,18000],
    ["dec-002","Arte em Flores BH","Contagem","MG","31955550014","@arteefloresbh","","https://placehold.co/400x400?text=Arte+Flores","$$",true,15,"rústico e boho","floral e tecidos",true,false,250,true,true,2000,8000],
    ["dec-003","Decor Simples e Belo","Betim","MG","31966660015","@decorsimplesbelo","","https://placehold.co/400x400?text=Decor+Simples","$",true,25,"moderno e minimalista","misto e artificial",true,true,150,true,false,800,3500],
  ],
  espacos: [
    ["esp-001","Espaço Villa Jardins","Belo Horizonte","MG","31977770016","@villajardinsbh","https://villajardins.com.br","https://placehold.co/400x400?text=Villa+Jardins","$$$",false,0,"salão",300,500,true,true,true,true,true,false,true,true,8000,20000],
    ["esp-002","Sítio das Palmeiras","Contagem","MG","31988880017","@sitiodaspalmeiras","","https://placehold.co/400x400?text=Sitio+Palmeiras","$$",true,30,"sítio",150,250,true,true,true,true,false,true,false,true,3500,9000],
    ["esp-003","Salão Estrela do Norte","Betim","MG","31999990018","@salaoestrelabh","","https://placehold.co/400x400?text=Salao+Estrela","$",true,35,"salão",80,130,true,false,true,true,true,true,false,true,1200,3500],
  ],
  fotografos: [
    ["fot-001","Lucas Mendes Fotografia","Belo Horizonte","MG","31994440004","@lucasmendesfoto","https://lucasmendes.com.br","https://placehold.co/400x400?text=Lucas+Mendes","$$",true,15,"fotojornalismo",8,true,true,false,60,true,false,3500,6500,180],
    ["fot-002","Aline Duarte Foto & Filme","Contagem","MG","31995550005","@alineduartefoto","","https://placehold.co/400x400?text=Aline+Duarte","$$",true,20,"clássico",6,false,false,true,45,true,true,2800,5200,95],
    ["fot-003","Rafael Luz Fotografia","Betim","MG","31996660006","@rafaelluzfoto","https://rafaelluz.com","https://placehold.co/400x400?text=Rafael+Luz","$",true,25,"artístico",5,false,false,false,30,false,false,1800,0,42],
  ],
  maquiagens: [
    ["maq-001","Studio Bela Noiva","Belo Horizonte","MG","31944450022","@studiobela_noiva","https://studiobela.com.br","https://placehold.co/400x400?text=Studio+Bela","$$",true,10,"maquiagem e cabelo",true,true,true,true,650,180,50,320],
    ["maq-002","Toque de Luz Make","Contagem","MG","31955560023","@toquedeuz_make","","https://placehold.co/400x400?text=Toque+Luz","$",true,20,"maquiagem",true,true,true,false,380,120,40,95],
    ["maq-003","Glamour Arte & Cabelo","Belo Horizonte","MG","31966670024","@glamourartecabelo","","https://placehold.co/400x400?text=Glamour+Arte","$$$",false,0,"maquiagem e cabelo",true,true,true,true,1200,300,0,500],
  ],
  trajes: [
    ["tra-001","Casa da Noiva BH","Belo Horizonte","MG","31911120019","@casadanoivabh","https://casadanoivabh.com.br","https://placehold.co/400x400?text=Casa+Noiva","$$$",false,0,"venda e locação","noiva e damas e madrinhas",true,"PP ao Plus Size",true,60,1500,8000,0,0],
    ["tra-002","Ternos & Estilo","Belo Horizonte","MG","31922230020","@ternosestilo","","https://placehold.co/400x400?text=Ternos+Estilo","$$",true,15,"venda e locação","noivo e pajens",true,"P ao XGG",false,15,0,0,350,1800],
    ["tra-003","Atelier Completo","Contagem","MG","31933340021","@ateliercompleto","","https://placehold.co/400x400?text=Atelier+Completo","$$",true,20,"venda e locação","todos",true,"P ao Plus Size",true,45,900,4000,300,1200],
  ],
};

const SUP_COLS = ['user_id','company_name','category_id','city','state','phone','whatsapp','instagram','website','profile_photo_url','price_min','price_max','accepts_idle_dates','idle_discount_pct','status','is_demo','description'];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const log: string[] = [];
  const client = new Client(DB_URL);
  
  try {
    await client.connect();
    
    // Verificar admin
    
    // 1) MIGRATION
    log.push("Aplicando migration...");
    await client.queryArray(`ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false`);
    await client.queryArray(`CREATE INDEX IF NOT EXISTS suppliers_is_demo_idx ON public.suppliers(is_demo) WHERE is_demo = true`);
    await client.queryArray(`DROP POLICY IF EXISTS "Admin can delete suppliers" ON public.suppliers`);
    await client.queryArray(`CREATE POLICY "Admin can delete suppliers" ON public.suppliers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role))`);
    await client.queryArray(`DROP POLICY IF EXISTS "Admin can insert suppliers" ON public.suppliers`);
    await client.queryArray(`CREATE POLICY "Admin can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role))`);
    
    for (const tbl of ['supplier_details_buffet','supplier_details_fotografo','supplier_details_local','supplier_details_decoracao','supplier_details_musica','supplier_details_cerimonialista','supplier_details_beleza','supplier_details_trajes','supplier_details_convites']) {
      await client.queryArray(`DROP POLICY IF EXISTS "Admin can manage details" ON public.${tbl}`);
      await client.queryArray(`CREATE POLICY "Admin can manage details" ON public.${tbl} FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role))`);
    }
    log.push("Migration aplicada");

    // 2) Apagar demos antigos (idempotência)
    const del = await client.queryObject<{count: bigint}>(`DELETE FROM public.suppliers WHERE is_demo = true RETURNING id`);
    log.push(`Demos antigos removidos: ${del.rows.length}`);

    // 3) Categorias e admin
    const cats = await client.queryObject<{id: string, slug: string}>(`SELECT id, slug FROM public.categories`);
    const catBySlug: Record<string, string> = {};
    cats.rows.forEach(c => catBySlug[c.slug] = c.id);
    const adminQ = await client.queryObject<{user_id: string}>(`SELECT user_id FROM public.user_roles WHERE role='admin' LIMIT 1`);
    const adminId = adminQ.rows[0]?.user_id;
    if (!adminId) throw new Error("admin não encontrado");

    async function insSup(row: any, catSlug: string): Promise<string | null> {
      const { min, max } = priceFromFaixa(row.faixa_preco);
      const r = await client.queryObject<{id: string}>(
        `INSERT INTO public.suppliers (user_id, company_name, category_id, city, state, phone, whatsapp, instagram, website, profile_photo_url, price_min, price_max, accepts_idle_dates, idle_discount_pct, status, is_demo, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'approved'::supplier_status,true,$15) RETURNING id`,
        [adminId, row.nome, catBySlug[catSlug] || null, row.cidade, row.estado, row.whatsapp, row.whatsapp, row.instagram, row.site || null, row.foto_perfil_url, row.preco_min ?? min, row.preco_max ?? max, row.aceita_datas_ociosas, row.desconto_datas_ociosas_pct || null, `${row.nome} - cadastro de demonstração`]
      );
      return r.rows[0]?.id ?? null;
    }
    async function insDet(table: string, supId: string, data: any) {
      await client.queryArray(`INSERT INTO public.${table} (supplier_id, data) VALUES ($1, $2)`, [supId, JSON.stringify(data)]);
    }

    // BANDAS
    for (const r of DATA.bandas) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[19],preco_max:r[20]}, "musica-dj");
      if (id) await insDet("supplier_details_musica", id, {tipo:r[11],num_integrantes:r[12],repertorio:r[13],duracao_show_horas:r[14],inclui_som:r[15],inclui_iluminacao:r[16],precisa_rider:r[17],faz_cerimonia_e_recepcao:r[18]});
    }
    // BUFFETS
    for (const r of DATA.buffets) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:(r[15] as number)*100,preco_max:(r[16] as number)*200}, "espacos-buffet");
      if (id) await insDet("supplier_details_buffet", id, {tipo_atendimento:r[11],estilo_culinario:r[12],capacidade_minima:r[13],capacidade_maxima:r[14],preco_por_pessoa_min:r[15],preco_por_pessoa_max:r[16],inclui_garcom:r[17],inclui_barman:r[18],inclui_bolo:r[19],atende_restricoes_alimentares:r[20],cidades_atendidas:r[21]});
    }
    // CERIMONIALISTAS
    for (const r of DATA.cerimonialistas) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[15] as number,preco_max:(r[17] || r[16] || r[15]) as number}, "cerimonialista");
      if (id) await insDet("supplier_details_cerimonialista", id, {tipo_assessoria:r[11],tamanho_equipe:r[12],num_casamentos:r[13],inclui_decoracao:r[14],preco_dia_a:r[15],preco_parcial:r[16],preco_completa:r[17],faz_religioso:r[18],faz_civil:r[19]});
    }
    // CONVITES
    for (const r of DATA.convites) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[18] as number,preco_max:r[19] as number}, "convites");
      if (id) await insDet("supplier_details_convites", id, {tipo_convite:r[11],estilo:r[12],quantidade_minima:r[13],prazo_producao_dias:r[14],inclui_envelope:r[15],faz_mapa_localizacao:r[16],faz_arte_digital:r[17],preco_unidade_min:r[18],preco_unidade_max:r[19],faz_digital_animado:r[20]});
    }
    // DECORACOES
    for (const r of DATA.decoracoes) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[18] as number,preco_max:r[19] as number}, "decoracao");
      if (id) await insDet("supplier_details_decoracao", id, {estilo:r[11],material_principal:r[12],possui_itens_proprios:r[13],faz_locacao_avulsa:r[14],capacidade_max_pessoas:r[15],faz_mesa_noivos:r[16],faz_cerimonia:r[17],preco_minimo:r[18],preco_projeto_completo:r[19]});
    }
    // ESPACOS (mapeado para espacos-buffet)
    for (const r of DATA.espacos) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[22] as number,preco_max:r[23] as number}, "espacos-buffet");
      if (id) await insDet("supplier_details_local", id, {tipo_espaco:r[11],capacidade_sentados:r[12],capacidade_em_pe:r[13],possui_cozinha:r[14],possui_estacionamento:r[15],aceita_fornecedores_externos:r[16],inclui_mesas_cadeiras:r[17],inclui_toalhas:r[18],disponivel_dias_uteis:r[19],possui_gerador:r[20],permite_decoracao_propria:r[21]});
    }
    // FOTOGRAFOS
    for (const r of DATA.fotografos) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[19] as number,preco_max:(r[20] || r[19]) as number}, "fotografia");
      if (id) await insDet("supplier_details_fotografo", id, {estilo:r[11],horas_minimas:r[12],inclui_segundo_fotografo:r[13],inclui_drone:r[14],inclui_album_impresso:r[15],prazo_entrega_dias:r[16],faz_pre_wedding:r[17],faz_video:r[18],preco_pacote_base:r[19],preco_pacote_completo:r[20],num_casamentos:r[21]});
    }
    // MAQUIAGENS
    for (const r of DATA.maquiagens) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:r[16] as number,preco_max:r[16] as number}, "beleza-maquiagem");
      if (id) await insDet("supplier_details_beleza", id, {servicos_oferecidos:r[11],atende_madrinhas:r[12],vai_ao_local:r[13],faz_teste_previo:r[14],inclui_noiva_completo:r[15],preco_pacote_noiva:r[16],preco_por_adicional:r[17],taxa_deslocamento:r[18],num_eventos:r[19]});
    }
    // TRAJES
    for (const r of DATA.trajes) {
      const id = await insSup({faixa_preco:r[8],aceita_datas_ociosas:r[9],desconto_datas_ociosas_pct:r[10],nome:r[1],cidade:r[2],estado:r[3],whatsapp:r[4],instagram:r[5],site:r[6],foto_perfil_url:r[7],preco_min:(r[17] || r[19] || 1500) as number,preco_max:(r[18] || r[20] || 8000) as number}, "vestido-noiva");
      if (id) await insDet("supplier_details_trajes", id, {tipo_servico:r[11],atende:r[12],inclui_ajuste:r[13],tamanhos_disponiveis:r[14],faz_sob_medida:r[15],prazo_entrega_dias:r[16],preco_vestido_min:r[17],preco_vestido_max:r[18],preco_terno_min:r[19],preco_terno_max:r[20]});
    }

    log.push("Seed concluído com sucesso");
    await client.end();
    return new Response(JSON.stringify({ ok: true, log }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    log.push(`ERRO: ${e.message}`);
    try { await client.end(); } catch {}
    return new Response(JSON.stringify({ ok: false, log, error: e.message, stack: e.stack }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
