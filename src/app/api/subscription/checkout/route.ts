import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TenantContext } from "@/lib/services/tenant-context";
import { AuthService } from "@/lib/services/auth.service";
import { PLANS_INFO } from "@/lib/config/plans";

export async function POST(request: NextRequest) {
  try {
    const tenant = await TenantContext.getTenant(request);
    if (!tenant) return NextResponse.json({ error: "Tenant não identificado" }, { status: 400 });

    const result = await AuthService.verifySession(request, tenant.id);
    if (!result.authenticated || result.user?.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { planId } = await request.json();
    const plan = PLANS_INFO[planId];

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Plano inválido ou não configurado para Stripe" }, { status: 400 });
    }

    const customerId = (tenant as any).stripe_customer_id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : result.user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${request.nextUrl.origin}/${tenant.slug}/admin/configuracoes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/${tenant.slug}/admin/configuracoes`,
      metadata: {
        tenantId: tenant.id,
        planId: planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar sessão de checkout" }, { status: 500 });
  }
}
