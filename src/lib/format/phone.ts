/**
 * Formata uma string de telefone para o padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "Não informado";
  
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  
  // Se for um formato desconhecido, retorna o original (ou limpo se for o caso)
  return phone;
}
