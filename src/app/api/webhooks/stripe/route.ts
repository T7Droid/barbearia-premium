import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error: any) {
    console.error(`Webhook Signature Error: ${error.message}`);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "invoice.paid": {
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;
        
        // Se for checkout, temos metadata. No invoice, precisamos buscar a subscription no Stripe
        let tenantId = session.metadata?.tenantId;
        let planId = session.metadata?.planId;

        if (!tenantId && stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
          tenantId = subscription.metadata.tenantId;
          planId = subscription.metadata.planId;
        }

        if (tenantId) {
          // 1. Atualizar stripe_customer_id no tenant
          await supabaseAdmin!
            .from("tenants")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", tenantId);

          // 2. Atualizar ou criar assinatura no banco
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string) as any;
          
          await supabaseAdmin!
            .from("subscriptions")
            .upsert({
              tenant_id: tenantId,
              plan_id: await getPlanUuidFromSlug(planId),
              status: subscription.status,
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              stripe_subscription_id: stripeSubscriptionId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'tenant_id' });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata.tenantId;

        if (tenantId) {
          await supabaseAdmin!
            .from("subscriptions")
            .update({
              status: subscription.status,
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", tenantId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Webhook Processing Error: ${error.message}`);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function getPlanUuidFromSlug(slug: string) {
  const { data } = await supabaseAdmin!
    .from("plans")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id;
}
