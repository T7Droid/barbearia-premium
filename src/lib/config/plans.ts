export const PLANS_INFO: Record<string, any> = {
  basico: { 
    name: "Básico", 
    price: "R$29/mês",
    stripePriceId: "price_1TPn3pPjOlTa80IiTHMZD3XQ",
    stripeProductId: "prod_UOaEFhRxZQzd3h",
    barbers: 1, 
    units: 1, 
    appointments: 300, 
    color: "text-slate-500", 
    bg: "bg-slate-500/10",
    description: "Para quem está começando"
  },
  profissional: { 
    name: "Profissional", 
    price: "R$59/mês",
    stripePriceId: "price_1TPnhzPjOlTa80IiebkoBuic",
    stripeProductId: "prod_UOati7IwQ2hzzN",
    barbers: 3, 
    units: 1, 
    appointments: 1000, 
    color: "text-primary", 
    bg: "bg-primary/10",
    description: "O melhor custo-benefício"
  },
  premium: { 
    name: "Premium", 
    price: "R$99/mês",
    stripePriceId: "price_1TPnjUPjOlTa80Ii60SNJsk0",
    stripeProductId: "prod_UOavC28NWsqkTU",
    barbers: 10, 
    units: 3, 
    appointments: 5000, 
    color: "text-amber-500", 
    bg: "bg-amber-500/10",
    description: "Para redes em crescimento"
  },
  escala: { 
    name: "Escala", 
    price: "R$149/mês",
    stripePriceId: "price_1TPnpJPjOlTa80IiYjrrqaoC",
    stripeProductId: "prod_UOb1QOVLfaMn9Q",
    barbers: 30, 
    units: 10, 
    appointments: "Ilimitados", 
    color: "text-purple-500", 
    bg: "bg-purple-500/10",
    description: "Alta performance e volume"
  },
};
