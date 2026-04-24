import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

    const result = await AuthService.verifySession(request, tenant.id);
    if (!result.authenticated || result.user?.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const customerId = (tenant as any).stripe_customer_id || (tenant as any).stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada no Stripe para esta barbearia." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.nextUrl.origin}/${tenant.slug}/admin/configuracoes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Portal Error:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar portal de faturamento" }, { status: 500 });
  }
}
