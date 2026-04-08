export const DEFAULT_SERVICES = [
  {
    id: 1,
    name: "Corte de Cabelo Premium",
    description: "Corte moderno com lavagem, massagem capilar e finalização com produtos premium.",
    price: 8000,
    durationMinutes: 45,
    imageUrl: "/images/cortepremuim.jpeg",
  },
  {
    id: 2,
    name: "Barba Completa",
    description: "Barbear clássico com toalha quente, óleo pré-shave e pós-barba hidratante.",
    price: 5000,
    durationMinutes: 30,
    imageUrl: "/images/barbacompleta.jpg",
  },
  {
    id: 3,
    name: "Combo Cabelo & Barba",
    description: "O serviço completo para o homem moderno. Inclui corte de cabelo e tratamento de barba.",
    price: 12000,
    durationMinutes: 75,
    imageUrl: "/images/barba.jpeg",
  },
  {
    id: 4,
    name: "Coloração e Camuflagem",
    description: "Tratamento para cobrir fios brancos ou mudar o visual de forma natural.",
    price: 10000,
    durationMinutes: 60,
    imageUrl: "/images/coloracaocamuflagem.jpeg",
  },
];

export const MOCK_AVAILABILITY_30 = [
  "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00", "05:30",
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

export const MOCK_AVAILABILITY_45 = [
  "00:00", "00:45", "01:30", "02:15", "03:00", "03:45", "04:30", "05:15",
  "06:00", "06:45", "07:30", "08:15", "09:00", "09:45", "10:30", "11:15",
  "12:00", "12:45", "13:30", "14:15", "15:00", "15:45", "16:30", "17:15",
  "18:00", "18:45", "19:30", "20:15", "21:00", "21:45", "22:30", "23:15"
];

export const MOCK_AVAILABILITY_60 = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00",
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
];

export const MOCK_AVAILABILITY = MOCK_AVAILABILITY_45;

export const MOCK_BOOKED_DATES = [
  "2026-04-10",
  "2026-04-15",
  "2026-04-20",
  "2026-04-25"
];

declare global {
  var MOCK_SESSIONS_STORE: Map<string, any>;
  var MOCK_APPOINTMENTS_STORE: Map<number, any>;
  var MOCK_USERS_STORE: Map<string, any>;
  var MOCK_SERVICES_STORE: Map<number, any>;
  var MOCK_SETTINGS_STORE: {
    isPointsEnabled: boolean;
    cancellationWindowDays: number;
    isPrepaymentRequired: boolean;
    businessStartTime: string;
    businessEndTime: string;
    slotInterval: number;
    subscriptionStatus: "active" | "past_due" | "canceled" | "trialing";
    subscriptionNextPayment: string;
  };
}

if (!global.MOCK_SESSIONS_STORE) {
  global.MOCK_SESSIONS_STORE = new Map();
}

if (!global.MOCK_APPOINTMENTS_STORE) {
  global.MOCK_APPOINTMENTS_STORE = new Map();
}

if (!global.MOCK_SERVICES_STORE) {
  global.MOCK_SERVICES_STORE = new Map();
  DEFAULT_SERVICES.forEach(service => {
    global.MOCK_SERVICES_STORE.set(service.id, service);
  });
} else {

  DEFAULT_SERVICES.forEach(defService => {
    const existing = global.MOCK_SERVICES_STORE.get(defService.id);
    if (existing) {
      global.MOCK_SERVICES_STORE.set(defService.id, {
        ...existing,
        imageUrl: defService.imageUrl
      });
    }
  });
}

if (!global.MOCK_USERS_STORE) {
  global.MOCK_USERS_STORE = new Map();

  global.MOCK_USERS_STORE.set("cliente@email.com", {
    id: "user_1",
    name: "João Cliente",
    email: "cliente@email.com",
    password: "user123",
    phone: "(11) 98888-8888",
    role: "client",
    points: 100,
    notificationsEnabled: true,
    createdAt: new Date().toISOString(),
  });
}

if (!global.MOCK_SETTINGS_STORE) {
  global.MOCK_SETTINGS_STORE = {
    isPointsEnabled: true,
    cancellationWindowDays: 2,
    isPrepaymentRequired: true,
    businessStartTime: "09:00",
    businessEndTime: "18:00",
    slotInterval: 45,
    subscriptionStatus: "active", // past_due ou active
    subscriptionNextPayment: "2026-05-15",
  };
}

export const SESSIONS_STORE = global.MOCK_SESSIONS_STORE;
export const APPOINTMENTS_STORE = global.MOCK_APPOINTMENTS_STORE;
export const SERVICES_STORE = global.MOCK_SERVICES_STORE;
export const USERS_STORE = global.MOCK_USERS_STORE;
export const SETTINGS = global.MOCK_SETTINGS_STORE;

export const MOCK_SERVICES = Array.from(global.MOCK_SERVICES_STORE.values());
