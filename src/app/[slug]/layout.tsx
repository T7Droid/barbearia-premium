import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { TenantService } from "@/lib/services/tenant.service";
import { TenantProvider } from "@/components/tenant-provider";
import { Metadata } from "next";
import Script from "next/script";
import { supabaseAdmin } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await TenantService.getTenantBySlug(slug);
  
  const title = tenant?.name || "Kingbarbers";
  const description = `Agende seu horário na ${title} através do KingBarbers. A melhor experiência em barbearia com agendamento online simples e rápido.`;
  
  return {
    title,
    description,
    manifest: `/${slug}/manifest.json`,
    alternates: {
      canonical: `/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://kingbarber.com.br/${slug}`,
      siteName: "King Barber",
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

async function getLocalBusinessData(slug: string) {
  if (!supabaseAdmin) return null;
  
  const tenant = await TenantService.getTenantBySlug(slug);
  if (!tenant) return null;

  const { data: units } = await supabaseAdmin
    .from("units")
    .select("*")
    .eq("tenant_id", tenant.id);

  if (!units || units.length === 0) return null;

  // Se tiver apenas uma unidade, retorna o objeto direto. Se tiver várias, retorna um array.
  const schemaData = units.map((unit) => ({
    "@context": "https://schema.org",
    "@type": "BarberShop",
    "name": `${tenant.name} - ${unit.name}`,
    "description": `Barbearia profissional ${tenant.name} - Unidade ${unit.name}`,
    "url": `https://kingbarber.com.br/${slug}`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": `${unit.address}, ${unit.number}`,
      "addressLocality": unit.city,
      "addressRegion": unit.state,
      "addressCountry": "BR"
    }
  }));

  return schemaData.length === 1 ? schemaData[0] : schemaData;
}

export default async function TenantLayout(props: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  let slug = params.slug;
  const children = props.children;

  if (!slug) {
    const headersList = await headers();
    slug = headersList.get("x-tenant-slug") || "";
  }

  const tenant = await TenantService.getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const jsonLd = await getLocalBusinessData(slug);

  return (
    <TenantProvider value={{ 
      id: tenant.id, 
      name: tenant.name, 
      slug: tenant.slug,
      mpConnected: tenant.mp_connected
    }}>
      {jsonLd && (
        <Script
          id="local-business-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </TenantProvider>
  );
}
