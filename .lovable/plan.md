# Geração de PDF da Lista de Convidados

Substitui o `window.print()` da página `src/pages/WeddingGuests.tsx` por um gerador de PDF próprio, com layout otimizado para impressão em preto e branco.

## Escopo

- Dois relatórios disponíveis: **Alfabético** e **Por mesa**.
- O usuário escolhe qual gerar (ou os dois num único PDF).
- Extensível a outros tipos de evento (casamento hoje; 15 anos/formatura no futuro apenas trocando título, nome e imagem padrão).

## Abordagem técnica

- **Client-side** com `jspdf` + `jspdf-autotable` (leve, sem edge function, sem dependência de fontes servidor). Registrar fonte Inter (já usada no projeto) para acentuação correta em pt-BR.
- Novo arquivo `src/lib/guestListPdf.ts` exportando `gerarPdfConvidados({ tipo, relatorios, dados })`.
- Novo dialog `src/components/GuestListPdfDialog.tsx` para o usuário escolher: relatório alfabético, por mesa, ou ambos; opção de agrupar alfabético por letra ou por grupo/família.
- Em `WeddingGuests.tsx`: trocar o botão `Printer` (que chama `window.print()`) por um botão que abre o dialog.

## Estrutura do PDF

### Capa (comum, 1 página)
- Foto do casal: `couple_public_profiles.foto_capa_url` (fallback: imagem padrão da plataforma incluída em `src/assets/`).
- Título "LISTA DE CONVIDADOS".
- Nome do casal: vem de `couples.partner_name` + `profiles.full_name` (fallback: nome da conta ou "Os Noivos").
- Dados do evento no canto superior: local da cerimônia, local da recepção, horário, contato do cerimonial (campos já em `couples`; usar "—" quando vazio).
- Rodapé da capa: "Última atualização da lista em [data mais recente de `wedding_guests.updated_at`]".

### Conteúdo (comum a todos os relatórios)
- **Header de contagem** no topo de cada relatório: Total · Confirmados · Pendentes · Recusados · Nº de mesas.
- **Quadrados de presença**: um quadrado por pessoa da entrada.
  - Casal (novo `guest_type = "couple"` ou nome com "e"/"&") = 2 quadrados; individual = 1.
  - Acompanhante extra declarado em `notes` ("+1", "irá trazer X") = quadrado adicional; se houver nome, imprimir em itálico dentro do quadrado.
- **Marcador de status por convidado**: bolinha cheia (●) = confirmado, vazia (○) = pendente, traço (—) = recusado. Cinza-escuro, sem cor.
- **Observações** (campo `notes`) em itálico abaixo do nome.
- **Rodapé em todas as páginas**: "Lista de convidados: [nome do casal]" · marca/URL (casamenteiro.com.br) · "Impresso por [profile.full_name]" · data/hora atual · `Página X de Y`.

### Relatório 1 — Alfabético
- Agrupar por letra inicial do nome da entrada (letra grande em destaque, ex.: "A", "B"...).
- Cada linha: nome + mesa + quadrado(s) de presença + status.
- Ordenação: pelo nome da entrada (`localeCompare` pt-BR).
- Toggle no dialog: **agrupar por letra** ou **agrupar por grupo/família** (usa `guest_groups`).

### Relatório 2 — Por mesa
- Agrupa por `table_number`, ordenado numericamente; "Sem mesa" ao final.
- Cabeçalho de cada mesa: "Mesa N" + localização opcional (campo `notes` da mesa, se existir; senão omitido) + "X de Y lugares" (Y = capacidade opcional; enquanto não houver campo, mostrar apenas "X convidados").
- Lista dos convidados com quadrado e status.

## Estilo de impressão P&B

- Sem cor de destaque; toda informação funcional em preto (#000) ou cinza-escuro (#333/#555).
- Fundos apenas em cinza claro para faixas de cabeçalho (letra/mesa).
- Fonte: Inter (regular, semibold, italic). Registrar via `doc.addFileToVFS` + `doc.addFont` a partir dos arquivos woff2 já presentes no projeto convertidos para TTF (incluir 3 TTFs em `src/assets/fonts/`).
- Tamanho A4 retrato, margens 15mm.

## Extensibilidade para outros eventos

- `gerarPdfConvidados` recebe `tipoEvento: "casamento" | "quinze_anos" | "formatura"`.
- Objeto `EVENTO_CONFIG` mapeia por tipo: título, rótulo do nome ("Os Noivos" / "A Debutante" / "Os Formandos"), imagem padrão da capa.
- Hoje só o preset `casamento` é usado; presets futuros ficam preparados mas não são expostos na UI.

## Arquivos a criar/alterar

- **Criar** `src/lib/guestListPdf.ts` — motor de geração (capa + relatórios + rodapé + `EVENTO_CONFIG`).
- **Criar** `src/components/GuestListPdfDialog.tsx` — dialog de escolha (checkboxes: Alfabético / Por mesa; radio de agrupamento alfabético).
- **Criar** `src/assets/capa-casamento-default.jpg` — imagem padrão da capa (gerar via `imagegen`, tons neutros).
- **Criar** `src/assets/fonts/Inter-{Regular,SemiBold,Italic}.ttf` — para acentuação correta.
- **Alterar** `src/pages/WeddingGuests.tsx` — trocar `onClick={() => window.print()}` por abertura do novo dialog; passar `guests`, `groups`, `invites`, dados do casal e do usuário para o gerador.

## Dependências novas

- `jspdf` e `jspdf-autotable` (via `bun add`).

## Fora do escopo

- Envio do PDF por email (o usuário disse "pule a de emails, depois faço").
- Edição do layout no admin.
- Capacidade das mesas (usar apenas contagem "X convidados" até existir o campo).
