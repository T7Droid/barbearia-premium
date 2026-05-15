import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { EmailService } from "@/lib/services/email.service";
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

        // Em invoice.paid o campo é 'subscription', em checkout.session também.
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        let tenantId = session.metadata?.tenantId;
        let planId = session.metadata?.planId;


        // Fallback 1: Buscar na assinatura se tivermos o ID
        if (!tenantId && stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
          tenantId = subscription.metadata?.tenantId;
          planId = planId || subscription.metadata?.planId;
        }

        // Fallback 2: Buscar pelo stripe_customer_id no banco
        if (!tenantId && stripeCustomerId) {
          const { data: tenantByCustomer } = await supabaseAdmin!
            .from("tenants")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .single();

          if (tenantByCustomer) {
            tenantId = tenantByCustomer.id;
          }
        }

        if (tenantId && stripeSubscriptionId) {

          const planUuid = await getPlanUuidFromSlug(planId || "basico");
          
          await supabaseAdmin!
            .from("tenants")
            .update({ 
              stripe_customer_id: stripeCustomerId,
              plan_id: planUuid 
            })
            .eq("id", tenantId);

          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId as string) as any;
          const expiresAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          // Lógica manual de Upsert para evitar erro 42P10
          const { data: existingSub } = await supabaseAdmin!
            .from("subscriptions")
            .select("id")
            .eq("tenant_id", tenantId)
            .maybeSingle();

          const subPayload = {
            tenant_id: tenantId,
            plan_id: planUuid,
            status: subscription.status,
            expires_at: expiresAt,
            stripe_subscription_id: stripeSubscriptionId,
            cancel_at_period_end: !!subscription.cancel_at_period_end || !!subscription.cancel_at,
            updated_at: new Date().toISOString(),
          };

          let dbError;
          // Limpeza: Marcar qualquer outra assinatura deste tenant como cancelada no banco
          // Isso evita que o sistema se confunda com assinaturas duplicadas (como no upgrade)
          await supabaseAdmin!
            .from("subscriptions")
            .update({ status: 'canceled' })
            .eq("tenant_id", tenantId)
            .neq("stripe_subscription_id", stripeSubscriptionId);

          if (existingSub) {
            const { error } = await supabaseAdmin!
              .from("subscriptions")
              .update(subPayload)
              .eq("tenant_id", tenantId);
            dbError = error;
          } else {
            const { error } = await supabaseAdmin!
              .from("subscriptions")
              .insert([subPayload]);
            dbError = error;
          }

          if (dbError) {
            console.error(`[Stripe Webhook] DB Error:`, dbError);
          } else {
            // Notificar Admin sobre o pagamento/vínculo de assinatura
            await EmailService.sendAdminNotification(
              `Pagamento Confirmado: Tenant ${tenantId}`,
              `
                <p><strong>Tenant ID:</strong> ${tenantId}</p>
                <p><strong>Plano:</strong> ${planId || 'N/A'}</p>
                <p><strong>Stripe Sub ID:</strong> ${stripeSubscriptionId}</p>
                <p><strong>Status:</strong> ${subscription.status}</p>
              `
            );
          }
        } else {
          console.warn(`[Stripe Webhook] SKIP: Missing tenantId (${tenantId}) or subscriptionId (${stripeSubscriptionId})`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        let tenantId = subscription.metadata?.tenantId;
        const stripeCustomerId = subscription.customer;


        // Fallback: Buscar pelo stripe_customer_id se o metadado estiver vazio (para assinaturas antigas)
        if (!tenantId && stripeCustomerId) {
          const { data: tenantByCustomer } = await supabaseAdmin!
            .from("tenants")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .single();
          
          if (tenantByCustomer) {
            tenantId = tenantByCustomer.id;
          }
        }

        if (tenantId) {
          const expiresAt = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const isCanceled = !!subscription.cancel_at_period_end || !!subscription.cancel_at;
          const planSlug = subscription.metadata?.planId;

          const updateData: any = {
            status: subscription.status,
            expires_at: expiresAt,
            cancel_at_period_end: isCanceled,
            updated_at: new Date().toISOString(),
          };

          // Se o evento trouxe um novo plano no metadado (como no upgrade direto)
          if (planSlug) {
            const planUuid = await getPlanUuidFromSlug(planSlug);
            updateData.plan_id = planUuid;
            
            // Atualizar o tenant também
            await supabaseAdmin!
              .from("tenants")
              .update({ plan_id: planUuid })
              .eq("id", tenantId);
          }

          const { error: updateError } = await supabaseAdmin!
            .from("subscriptions")
            .update(updateData)
            .eq("tenant_id", tenantId)
            .eq("stripe_subscription_id", subscription.id);
            
          if (updateError) {
            console.error("[Stripe Webhook] Update Error:", updateError);
          } else {
            const isDelete = event.type === "customer.subscription.deleted";
            const subject = isDelete ? "Assinatura Cancelada" : "Assinatura Atualizada";
            
            await EmailService.sendAdminNotification(
              `${subject}: Tenant ${tenantId}`,
              `
                <p><strong>Evento:</strong> ${event.type}</p>
                <p><strong>Tenant ID:</strong> ${tenantId}</p>
                <p><strong>Stripe Sub ID:</strong> ${subscription.id}</p>
                <p><strong>Novo Status:</strong> ${subscription.status}</p>
                <p><strong>Plano (Slug):</strong> ${planSlug || 'N/A'}</p>
                <p><strong>Cancelamento Agendado:</strong> ${isCanceled ? 'Sim' : 'Não'}</p>
              `
            );
          }
        } else {
          console.warn(`[Stripe Webhook] SKIP: Could not identify tenant for sub update ${subscription.id}`);
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
  try {
    const { data } = await supabaseAdmin!
      .from("plans")
      .select("id")
      .eq("slug", slug)
      .single();
    return data?.id;
  } catch (e) {
    console.error("Error finding plan UUID for slug:", slug);
    return null;
  }
}
