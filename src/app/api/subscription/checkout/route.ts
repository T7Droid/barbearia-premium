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
      console.error(`[Stripe Checkout] Invalid plan requested: ${planId}`);
      return NextResponse.json({ error: `Plano inválido ou não configurado para Stripe: ${planId}` }, { status: 400 });
    }

    const customerId = (tenant as any).stripe_customer_id;
    const stripeSubscriptionId = (tenant as any).subscriptions?.[0]?.stripe_subscription_id;

    // Se o usuário já tem uma assinatura ativa, fazemos um UPGRADE em vez de novo checkout
    if (stripeSubscriptionId) {
      console.log(`[Stripe Checkout] Upgrading existing subscription: ${stripeSubscriptionId} to ${planId}`);
      
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      
      await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: plan.stripePriceId,
        }],
        cancel_at_period_end: false,
        metadata: {
          tenantId: tenant.id,
          planId: planId,
        },
        proration_behavior: "always_invoice", // Cobra a diferença na hora
      });

      return NextResponse.json({ url: `${request.nextUrl.origin}/${tenant.slug}/admin/configuracoes?upgrade=success` });
    }

    // Caso contrário, cria um novo checkout normal
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
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          planId: planId,
        },
      },
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
    return NextResponse.json({ error: error.message || "Erro ao processar assinatura" }, { status: 500 });
  }
}
