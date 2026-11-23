/** Limites de cota não são limites temporários de velocidade. */
export function cotaEmailEsgotada(error: string | null | undefined): boolean {
  return /daily_quota_exceeded|monthly_quota_exceeded|daily email sending quota|monthly email sending quota/i.test(error || "");
}

export function explicarErroEmail(error: string | null | undefined): string {
  if (cotaEmailEsgotada(error)) return "O limite de envio de e-mails do serviço foi atingido. Aguarde a renovação da cota; não repita envios já concluídos.";
  return "O e-mail não foi enviado. Confira os detalhes no histórico de e-mails.";
}