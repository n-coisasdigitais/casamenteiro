## Auditoria da v1 — o que falta e o que melhorar

Baseado em tudo que já foi construído (simulador, plano, kanban, orçamento, pagamentos, convidados, RSVP, fornecedores, admin), abaixo estão as lacunas e melhorias prioritárias para a v1 ficar redonda. Organizei em 4 níveis: **bloqueadores**, **importantes**, **polimento** e **opcionais para v1.1**.

---

### 🔴 BLOQUEADORES (impedem operação real)

1. **E-mail transacional não está ativo**
   - Hoje notificações só aparecem no sininho. Casal/fornecedor não recebe nada por e-mail.
   - Mínimo da v1: novo orçamento (fornecedor), nova proposta (casal), RSVP confirmado (casal), conta criada/recuperação de senha.
   - Requer configurar domínio de e-mail e o `auth-email-hook`.

2. **Recuperação de senha**
   - `Auth.tsx` tem login/cadastro mas não há fluxo "esqueci minha senha".

3. **Segurança — alertas do linter pendentes**
   - Existem 38 avisos ativos do linter Supabase (RLS sempre verdadeiro em algumas tabelas, buckets públicos com listagem aberta, funções SECURITY DEFINER expostas a anônimos).
   - Para v1 pública precisa pelo menos varrer e fechar os WARN críticos.

4. **Validação de telefone/WhatsApp no fornecedor**
   - O botão de WhatsApp usa `replace(/\D/g,"")` direto, sem validar DDD. Se o fornecedor cadastrou só "99999-9999", o link quebra.
   - Adicionar máscara de telefone no cadastro do fornecedor + validação mínima de 10 dígitos.

5. **LGPD básica**
   - Falta política de privacidade, termos de uso e checkbox de aceite no cadastro.
   - Footer hoje só tem créditos do desenvolvedor.

---

### 🟡 IMPORTANTES (qualidade de produto)

6. **Onboarding do fornecedor incompleto**
   - Quando alguém se cadastra como fornecedor hoje, cai num painel quase vazio. Falta um wizard guiado: dados da empresa → categoria → fotos → preços → datas ociosas → enviar para aprovação.
   - Sem isso, fornecedor cadastra e não preenche o perfil.

7. **Painel do fornecedor — métricas e funil**
   - Hoje o fornecedor vê pedidos de orçamento mas não tem visão geral: quantos leads recebeu no mês, taxa de resposta, taxa de conversão.
   - Adicionar 4 cards de métrica + lista de leads recentes.

8. **Busca de fornecedores — filtros que ainda faltam**
   - Filtro por **faixa de preço** (price_min/max já existem no banco).
   - Filtro **"aceita data ociosa"** (campo existe).
   - Ordenação: relevância / preço / avaliação / proximidade.
   - Salvar busca / criar alerta (notifica quando entra fornecedor novo na categoria).

9. **Kanban do plano — drag-and-drop mobile**
   - DndKit funciona bem em desktop, mas em 390px o usuário não consegue arrastar entre colunas (precisa scroll horizontal).
   - Adicionar opção alternativa: tap no card → menu "mover para…".

10. **Fluxo de "marcar como contratado" precisa de contrato/anexo**
    - Hoje o casal só clica e pronto. Idealmente: anexar contrato (PDF), data de assinatura, condições de pagamento (sinal/parcelas).
    - Já criar as parcelas em `budget_payments` automaticamente a partir da condição.

11. **Convidados — importação em massa**
    - Hoje só tem cadastro um a um. Falta importar de planilha (CSV) ou colar lista.
    - Para um casamento de 150 pessoas isso é essencial.

12. **Convite RSVP — compartilhamento**
    - Falta botão "Compartilhar no WhatsApp" com mensagem pronta + link único do convidado.
    - Falta página pública de visualização do convite (preview antes de enviar).

13. **Tarefas — prazos calculados a partir da data do casamento**
    - As 79 tarefas seed têm `due_period` em texto ("10-12 meses"). Falta converter para data real e mostrar "vencendo em X dias" + alerta no dashboard.

14. **Orçamento — exportar PDF**
    - Casal precisa apresentar o orçamento aos pais/padrinhos. Botão "Baixar resumo em PDF" no plano.

15. **Sistema de avaliações — moderação**
    - Hoje qualquer review aparece. Falta painel admin para esconder review ofensivo + reportar avaliação.

---

### 🟢 POLIMENTO

16. **Mobile (390px)** — vários ajustes pequenos baseados no viewport atual:
    - Header/nav do dashboard ficam apertados; precisa drawer.
    - PlanHeader com 4 métricas em grid 2x2 pode quebrar em telas muito pequenas.
    - Cards de fornecedor no kanban precisam de altura mínima maior.

17. **Estados vazios** — várias telas mostram só "Nenhum item" sem ilustração ou call-to-action. Especialmente: Favoritos, Convidados sem grupos, Pagamentos.

18. **Loading states** — substituir "Carregando..." por skeletons nas páginas principais (Dashboard, Plano, Busca).

19. **SEO básico** — `index.html` provavelmente tem title/description genéricos. Precisa OG image, meta para compartilhamento.

20. **404 customizada** — verificar se `NotFound.tsx` tem ilustração e link de volta.

21. **Acessibilidade** — botões só com ícone sem `aria-label`, contraste em alguns badges, foco visível.

22. **Performance** — imagens de fornecedor sem lazy + sem srcset. Em busca com 50+ cards isso pesa.

---

### 🔵 OPCIONAIS (podem ficar para v1.1)

23. Sistema de favoritos com listas (ex: "Buffet", "Decoração") em vez de uma lista única.
24. Dashboard do casal com countdown grande "faltam X dias".
25. Chat em tempo real no quote (já tem postgres_changes disponível).
26. Sistema de cashback / cupons.
27. App mobile (PWA com manifest e service worker).
28. Integração com Google Calendar para tarefas.
29. Mural de fotos do casamento (pós-evento).

---

### Como abordar

Sugiro atacar nesta ordem:

```text
Sprint 1 (bloqueadores)
  → e-mail transacional + recuperação de senha
  → linter de segurança (fechar WARNs)
  → LGPD (termos + privacidade + aceite)

Sprint 2 (operação fornecedor)
  → wizard de onboarding do fornecedor
  → métricas no painel do fornecedor
  → validação de telefone/WhatsApp

Sprint 3 (operação casal)
  → import CSV de convidados
  → kanban mobile
  → exportar PDF do orçamento
  → compartilhar convite no WhatsApp
  → tarefas com data real

Sprint 4 (polimento)
  → busca: filtros faltantes + ordenação
  → estados vazios + skeletons
  → SEO + a11y + performance
```

---

### Próximo passo

Me diz qual desses blocos você quer atacar primeiro e eu já abro um plano detalhado de implementação. Minha recomendação é começar pelo **Sprint 1** (bloqueadores) porque sem e-mail e sem LGPD não dá para colocar em produção.
