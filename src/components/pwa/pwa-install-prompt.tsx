"use client";

import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Download, Share, PlusSquare, Smartphone } from "lucide-react";

export function PWAInstallPrompt() {
  const { showInstallPrompt, handleInstall, isIOS, isStandalone } = usePWA();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt after a short delay, but only if not already standalone/dismissed
    if ((showInstallPrompt || isIOS) && !isStandalone && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [showInstallPrompt, isIOS, isStandalone, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    // Optional: save to localStorage to not show again for a while
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // Check if dismissed in last 7 days
  useEffect(() => {
    const lastDismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (lastDismissed) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(lastDismissed) < sevenDays) {
        setDismissed(true);
      }
    }
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
      >
        <div className="bg-card/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-2xl p-5 overflow-hidden">
          {/* Background Gradient Effect */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start gap-4 relative">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-serif font-bold text-foreground">App King Barber</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Instale para ter acesso rápido aos agendamentos e notificações exclusivas.
              </p>
            </div>
            
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {isIOS ? (
              <div className="bg-muted/50 rounded-lg p-3 text-[13px] border border-border/50">
                <p className="flex items-center gap-2 mb-2 font-medium">
                  Para instalar no seu iPhone:
                </p>
                <ol className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold border">1</span>
                    Toque no botão <Share className="w-3.5 h-3.5 text-blue-500" /> (Compartilhar)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-[10px] font-bold border">2</span>
                    Role e toque em <PlusSquare className="w-3.5 h-3.5" /> "Tela de Início"
                  </li>
                </ol>
              </div>
            ) : (
              <Button 
                onClick={handleInstall}
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
                Instalar Aplicativo
              </Button>
            )}
            
            <button 
              onClick={handleDismiss}
              className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              Agora não, obrigado
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
