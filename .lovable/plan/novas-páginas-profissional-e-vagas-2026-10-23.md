# Novas páginas /profissional e /vagas

Instalar o pacote enviado do jeito que o guia (LEIA-ME) pede.

## O que muda para quem usa
- **/profissional**: nova página. Os textos podem ser editados em Admin › Conteúdo › Landing Profissional.
- **/vagas**: nova página no tom areia. A pessoa se candidata com um toque, tem um bloco "Para você", o status aparece em cada card, e a vaga fica guardada enquanto a pessoa faz o cadastro.
- **Equipe e vagas só nos planos pagos (ou no teste)**: a aba Vagas do fornecedor fica bloqueada sem o plano, e o sistema recusa publicar uma vaga ou enviar um convite. A candidatura do profissional continua liberada.

## Passos
1. Conferir em Admin › Planos quais planos têm "Equipe e vagas" marcado e avisar antes de ligar a trava.
2. Criar os 8 arquivos novos exatamente como vieram no pacote (seções, card de vaga, cores, textos padrão, vaga guardada, tela do admin e as 2 migrations).
3. Trocar a /profissional e a /vagas pelas versões do pacote.
4. Nas telas de entrada, onboarding, painel do fornecedor, rotas e menu do admin, fazer só as mudanças pontuais do guia, sem trocar os arquivos inteiros. Assim nada do que já fizemos se perde (Ajuda, flag de agenda, etc.).
5. Aplicar as 2 partes do banco.
6. Testar: visitante → cadastro → volta para a vaga; casal vê o aviso; fornecedor sem plano fica bloqueado; texto do admin salva; celular sem rolagem lateral.

## Detalhes técnicos
- Migrations aplicadas pelo próprio fluxo de banco (conteúdo igual ao do pacote, byte a byte). Antes, confiro se o SQL tem GRANTs na tabela nova `profissional_landing_config`. Se faltar, aviso e acrescento.
- Antes de aplicar, comparo os arquivos do pacote com os atuais. Se algo divergir de uma regra que já existe, pergunto antes.
