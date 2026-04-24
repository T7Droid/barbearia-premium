export const PLANS_INFO: Record<string, any> = {
  basico: { 
    name: "Básico", 
    barbers: 1, 
    units: 1, 
    appointments: 300, 
    color: "text-slate-500", 
    bg: "bg-slate-500/10",
    description: "Para quem está começando"
  },
  profissional: { 
    name: "Profissional", 
    barbers: 3, 
    units: 1, 
    appointments: 1000, 
    color: "text-primary", 
    bg: "bg-primary/10",
    description: "O melhor custo-benefício"
  },
  premium: { 
    name: "Premium", 
    barbers: 10, 
    units: 3, 
    appointments: 5000, 
    color: "text-amber-500", 
    bg: "bg-amber-500/10",
    description: "Para redes em crescimento"
  },
  escala: { 
    name: "Escala", 
    barbers: 30, 
    units: 10, 
    appointments: "Ilimitados", 
    color: "text-purple-500", 
    bg: "bg-purple-500/10",
    description: "Alta performance e volume"
  },
};
