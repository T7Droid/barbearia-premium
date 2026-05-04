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
        console.log(`[Stripe Webhook] Processing ${event.type} for session/invoice:`, session.id);
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        let tenantId = session.metadata?.tenantId;
        let planId = session.metadata?.planId;

        console.log(`[Stripe Webhook] Initial data - tenantId: ${tenantId}, planId: ${planId}, customer: ${stripeCustomerId}`);

        // Fallback 1: Buscar na assinatura
        if (!tenantId && stripeSubscriptionId) {
          console.log(`[Stripe Webhook] Missing tenantId, retrieving subscription ${stripeSubscriptionId}...`);
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
          tenantId = subscription.metadata?.tenantId;
          planId = planId || subscription.metadata?.planId;
          console.log(`[Stripe Webhook] Data from subscription - tenantId: ${tenantId}, planId: ${planId}`);
        }

        // Fallback 2: Buscar pelo stripe_customer_id no banco
        if (!tenantId && stripeCustomerId) {
          console.log(`[Stripe Webhook] Still missing tenantId, searching DB for customer ${stripeCustomerId}...`);
          const { data: tenantByCustomer } = await supabaseAdmin!
            .from("tenants")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .single();
          
          if (tenantByCustomer) {
            tenantId = tenantByCustomer.id;
            console.log(`[Stripe Webhook] Found tenant in DB: ${tenantId}`);
          }
        }

        if (tenantId) {
          console.log(`[Stripe Webhook] Updating tenant ${tenantId} and subscription...`);
          await supabaseAdmin!
            .from("tenants")
            .update({ stripe_customer_id: stripeCustomerId })
            .eq("id", tenantId);

          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string) as any;

          const { error: upsertError } = await supabaseAdmin!
            .from("subscriptions")
            .upsert({
              tenant_id: tenantId,
              plan_id: await getPlanUuidFromSlug(planId),
              status: subscription.status,
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              stripe_subscription_id: stripeSubscriptionId,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'tenant_id' });

          if (upsertError) {
            console.error(`[Stripe Webhook] DB Upsert Error:`, upsertError);
          } else {
            console.log(`[Stripe Webhook] SUCCESS: Subscription activated for tenant ${tenantId}`);
          }
        } else {
          console.error(`[Stripe Webhook] CRITICAL: Could not identify tenant for event ${event.type}`);
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
