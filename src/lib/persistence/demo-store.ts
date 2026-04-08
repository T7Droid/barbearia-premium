"use client";

/**
 * Utilitário de Persistência para Modo Demonstração (Demo)
 * Resolve o problema de perda de estado em ambientes serverless (Vercel) usando Mock.
 */

const KEYS = {
  USER: "barber_premium_demo_user",
  APPOINTMENTS: "barber_premium_demo_appointments",
  SETTINGS: "barber_premium_demo_settings",
};

export class DemoStore {
  // --- Usuário e Sessão ---
  static saveUser(user: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }

  static getUser() {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  }

  static clearUser() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.APPOINTMENTS);
  }

  // --- Agendamentos ---
  static saveAppointment(appointment: any) {
    if (typeof window === "undefined") return;
    const current = this.getAppointments();
    // Adicionar ao início da lista e remover duplicatas pelo ID
    const updated = [appointment, ...current.filter((a: any) => a.id !== appointment.id)];
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(updated));
  }

  static getAppointments(): any[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(KEYS.APPOINTMENTS);
    return saved ? JSON.parse(saved) : [];
  }

  // --- Configurações ---
  static saveSettings(settings: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getSettings() {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : null;
  }
}
