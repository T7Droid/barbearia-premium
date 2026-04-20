"use client";

import { useOnboarding } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, ArrowLeft } from "lucide-react";

export function Step2Unit() {
  const { data, updateData, setStep } = useOnboarding();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.unit.name.trim() || !data.unit.address.trim()) return;
    setStep(3);
  };

  const isFormValid = data.unit.name.trim() !== "" && data.unit.address.trim() !== "";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-serif font-bold">Onde fica a sua primeira Unidade?</h2>
        <p className="text-muted-foreground">Cadastre o endereço físico onde você atende os seus clientes.</p>
      </div>

      <form onSubmit={handleNext} className="space-y-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="unitName">Nome da Unidade *</Label>
            <Input 
              id="unitName" 
              placeholder="Ex: Unidade Matriz ou Centro" 
              value={data.unit.name}
              onChange={(e) => updateData({ unit: { ...data.unit, name: e.target.value } })}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Endereço / Logradouro *</Label>
            <Input 
              id="address" 
              placeholder="Rua, Avenida, etc" 
              value={data.unit.address}
              onChange={(e) => updateData({ unit: { ...data.unit, address: e.target.value } })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input 
              id="number" 
              placeholder="123" 
              value={data.unit.number}
              onChange={(e) => updateData({ unit: { ...data.unit, number: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input 
              id="city" 
              placeholder="Sua Cidade"
              value={data.unit.city}
              onChange={(e) => updateData({ unit: { ...data.unit, city: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input 
              id="state" 
              placeholder="Ex: SP" 
              value={data.unit.state}
              onChange={(e) => updateData({ unit: { ...data.unit, state: e.target.value } })}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => setStep(1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button 
            type="submit" 
            className="flex-1 h-12 text-lg font-bold"
            disabled={!isFormValid}
          >
            Prosseguir
          </Button>
        </div>
      </form>
    </div>
  );
}
