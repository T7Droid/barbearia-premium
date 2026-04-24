export function formatDateBR(dateString: string): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // Verifica se a data é válida
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
