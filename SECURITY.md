# Guia de Segurança — APIs do Barber-Premium

Este documento define as regras obrigatórias para desenvolvimento seguro de rotas de API neste projeto multi-tenant.

---

## Regra de Ouro: Qual Cliente Supabase Usar?

| Cenário | Cliente Correto | Motivo |
|---|---|---|
| Rota autenticada (usuário logado) | `createSupabaseForUser(token)` | RLS é aplicado automaticamente com o JWT do usuário |
| Leitura pública (sem auth, ex: booking page) | `supabase` (anon key) | Dados públicos, RLS de SELECT público é suficiente |
| Webhook externo (Stripe, MercadoPago) | `supabaseAdmin` ✅ | Sem contexto de usuário. Uso legítimo e necessário |
| Onboarding/criação de conta | `supabaseAdmin` ✅ | Requer `auth.admin.createUser()`, só existe na service key |

> **Nunca use `supabaseAdmin` em rotas que recebem um token de usuário autenticado.**

---

## Como Criar uma Nova Rota API (Padrão Correto)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseForUser } from "@/lib/supabase";
import { AuthService } from "@/lib/services/auth.service";
import { TenantContext } from "@/lib/services/tenant-context";

export async function GET(request: NextRequest) {
  // 1. Identificar o tenant pelo header x-tenant-slug
  const tenant = await TenantContext.getTenant(request);
  if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

  // 2. Verificar autenticação do usuário
  const result = await AuthService.verifySession(request, tenant.id);
  if (!result.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 3. Criar cliente autenticado com o JWT do usuário (RLS ativo)
  const token = request.cookies.get("session_token")?.value;
  const db = token ? createSupabaseForUser(token) : null;
  if (!db) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  // 4. Queries — o RLS garante isolamento. Manter .eq("tenant_id") como defesa extra.
  const { data, error } = await db
    .from("sua_tabela")
    .select("*")
    .eq("tenant_id", tenant.id); // Defesa em profundidade

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

---

## Verificação de Segurança para Novas Rotas

Antes de fazer merge de qualquer nova rota de API, verifique:

- [ ] A rota usa `createSupabaseForUser(token)` se o usuário está autenticado?
- [ ] A rota verifica `verifySession` antes de qualquer query ao banco?
- [ ] A rota verifica o `role` do usuário para operações admin-only?
- [ ] **IMPORTANTE: O filtro `.eq("tenant_id", tenant.id)` foi feito manualmente em TODAS as queries?** (Isso é obrigatório como Defesa em Profundidade, mesmo com RLS ativo).
- [ ] Nenhum dado de outro tenant pode vazar mesmo se o RLS falhar?

> **Atenção:** Sempre revise novas rotas `/api` para garantir que o isolamento por `tenant_id` não foi esquecido, pois falhas nessa camada podem causar vazamento massivo de dados entre barbearias.

---

## Rotas que DEVEM usar `supabaseAdmin` (Lista Completa e Aprovada)

| Arquivo | Justificativa |
|---|---|
| `src/app/api/webhooks/stripe/route.ts` | Evento externo do Stripe sem JWT de usuário |
| `src/app/api/webhooks/mercadopago/route.ts` | Evento externo do MercadoPago sem JWT de usuário |
| `src/app/api/onboarding/route.ts` | Criação de usuário via `auth.admin.createUser()` |
| `src/app/api/appointments/checkout/route.ts` | Sessão criada por guest booking (sem auth) |
| `src/app/api/appointments/confirm/route.ts` | Confirmação de agendamento público |
| `src/lib/services/auth.service.ts` | Busca de memberships/perfil para determinar role |
| `src/lib/services/appointment.service.ts` | Operações internas do sistema sem contexto HTTP |

Qualquer adição a esta lista deve ser justificada em PR e revisada por um segundo desenvolvedor.

---

## RLS — Políticas Ativas

As políticas de isolamento de dados estão definidas em `rls_policies.sql`.
Para aplicar em produção: **Supabase Dashboard > SQL Editor > Cole o conteúdo do arquivo**.

As políticas garantem que:
- **Clientes** só veem seus próprios agendamentos e perfil
- **Admins** só veem dados do próprio tenant
- **Dados públicos** (availability, settings de leitura, lista de barbeiros) são acessíveis sem auth
- **Webhooks e operações de sistema** usam a service key legitimamente
