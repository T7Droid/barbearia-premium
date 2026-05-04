"use client";

import { useOnboarding } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Scissors, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export function Step3Services() {
  const { data, updateData, setStep } = useOnboarding();
  const [newService, setNewService] = useState({
    name: "",
    price: "40",
    duration: "30",
    description: ""
  });

  const addService = () => {
    if (!newService.name || !newService.price) return;
    
    const nameLower = newService.name.toLowerCase();
    let finalImageUrl = "/images/cortepremium.jpeg"; // Fallback padrão

    if (nameLower.includes("coloração") || nameLower.includes("coloracao") || nameLower.includes("camuflagem")) {
      finalImageUrl = "/images/coloracaocamuflagem.jpeg";
    } else if (nameLower.includes("barba")) {
      finalImageUrl = "/images/service-beard.png";
    } else if (nameLower.includes("combo")) {
      finalImageUrl = "/images/service-combo.png";
    } else if (nameLower.includes("hidratação") || nameLower.includes("hidratacao")) {
      finalImageUrl = "/images/service-hydration.png";
    } else if (nameLower.includes("cabelo") || nameLower.includes("corte")) {
      finalImageUrl = "/images/cortepremium.jpeg";
    }
    
    const serviceToAdd = {
      id: Math.random().toString(36).substr(2, 9),
      name: newService.name,
      price: Math.round(parseFloat(newService.price) * 100), // cents
      duration_minutes: parseInt(newService.duration),
      description: newService.description,
      imageUrl: finalImageUrl,
    };

    updateData({ services: [...data.services, serviceToAdd] });
    setNewService({ name: "", price: "40", duration: "30", description: "" });
  };

  const removeService = (id: string) => {
    updateData({ services: data.services.filter(s => s.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Scissors className="w-6 h-6 text-primary" /> Seus Serviços
        </h2>
        <p className="text-muted-foreground">Adicione os serviços básicos que sua barbearia oferece.</p>
      </div>

      <Card className="p-4 bg-muted/20 border-dashed border-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Serviço</Label>
            <Input 
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              placeholder="Ex: Corte Masculino"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number"
                  className="pl-7"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  placeholder="40.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tempo (min)</Label>
              <div className="relative">
                <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number"
                  className="pl-7"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição do Serviço (Opcional)</Label>
            <Input 
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Ex: Corte com degradê e finalização com pomada"
            />
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full mt-4 gap-2 border-primary text-primary hover:bg-primary/5"
          onClick={addService}
        >
          <Plus className="w-4 h-4" /> Adicionar à Lista
        </Button>
      </Card>

      <div className="space-y-3">
        {data.services.map((svc) => (
          <div key={svc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
            <div>
              <p className="font-bold">{svc.name}</p>
              <p className="text-xs text-muted-foreground">
                R$ {(svc.price / 100).toFixed(2)} • {svc.duration_minutes} min
                {svc.description && ` • ${svc.description}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeService(svc.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}

        {data.services.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/5">
            Nenhum serviço adicionado ainda.
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
        <Button 
          className="flex-1"
          disabled={data.services.length === 0}
          onClick={() => setStep(4)}
        >
          Prosseguir ({data.services.length} serviços)
        </Button>
      </div>
    </div>
  );
}
