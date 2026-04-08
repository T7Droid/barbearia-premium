export function formatCurrencyBRL(value: number | string | undefined | null) {
    if (value === undefined || value === null) return "R$ 0,00";

    const number = typeof value === "string" ? Number(value) : value;

    if (isNaN(number)) return "R$ 0,00";

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(number);
}

export function formatCurrencyFromCents(value: number | undefined | null) {
    if (value === undefined || value === null) return "R$ 0,00";
    return formatCurrencyBRL(value / 100);
}
