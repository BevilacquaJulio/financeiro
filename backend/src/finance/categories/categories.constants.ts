/**
 * Porte de `backend/app/constants.py`.
 * ORDEM E GRAFIA EXATAS — sem acento (plano, secao 6.6). "Cartao", nao "Cartão".
 */
export const PAYMENT_METHODS = [
  'Pix',
  'Cartao de Credito',
  'Cartao de Debito',
  'Dinheiro',
  'Boleto',
  'Transferencia',
] as const;
