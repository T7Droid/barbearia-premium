"use client";

import { GlobalLayout } from "@/components/global-layout";
import { OnboardingProvider } from "./context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalLayout>
      <OnboardingProvider>
        {children}
      </OnboardingProvider>
    </GlobalLayout>
  );
}
