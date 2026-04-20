"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface OnboardingData {
  tenant: {
    name: string;
  };
  unit: {
    name: string;
    address: string;
    number: string;
    city: string;
    state: string;
  };
  services: Array<{
    id: string; // temp id for UI
    name: string;
    price: number;
    duration_minutes: number;
  }>;
  barber: {
    name: string;
  };
  account: {
    email: string;
    password?: string;
    fullName: string;
    phone: string;
  };
}

interface OnboardingContextProps {
  step: number;
  setStep: (step: number) => void;
  data: OnboardingData;
  updateData: (newData: Partial<OnboardingData>) => void;
}

const defaultData: OnboardingData = {
  tenant: { name: "" },
  unit: { name: "", address: "", number: "", city: "", state: "" },
  services: [],
  barber: { name: "" },
  account: { email: "", fullName: "", phone: "" },
};

const OnboardingContext = createContext<OnboardingContextProps | undefined>(
  undefined
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <OnboardingContext.Provider value={{ step, setStep, data, updateData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
