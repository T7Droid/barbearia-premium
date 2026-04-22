"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { setTenantSlug } from "@workspace/api-client-react";

export interface TenantContextType {
  id: string;
  name: string;
  slug: string;
  mpConnected?: boolean;
  mpAccessToken?: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ 
  children, 
  value 
}: { 
  children: ReactNode, 
  value: TenantContextType 
}) {
  useEffect(() => {
    // Configura o slug globalmente para todas as chamadas da biblioteca de API
    setTenantSlug(value.slug);
    if (typeof window !== "undefined") {
      localStorage.setItem("last_tenant_slug", value.slug);
    }
    
    // Limpar ao desmontar (opcional, mas bom para evitar vazamento de contexto)
    return () => setTenantSlug(null);
  }, [value.slug]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
