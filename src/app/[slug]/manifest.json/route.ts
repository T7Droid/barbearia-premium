import { NextResponse } from "next/server";
import { TenantService } from "@/lib/services/tenant.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenant = await TenantService.getTenantBySlug(slug);

  const manifest = {
    name: tenant?.name || "King Barber",
    short_name: tenant?.name || "King Barber",
    description: `Agende seu horário na ${tenant?.name || "King Barber"}. A melhor experiência em barbearia.`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  return NextResponse.json(manifest);
}
