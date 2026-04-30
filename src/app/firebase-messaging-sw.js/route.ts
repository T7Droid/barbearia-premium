import { NextResponse } from "next/server";

export async function GET() {
  // Este arquivo foi desativado para evitar duplicidade de notificações.
  // O sistema agora utiliza apenas o /sw.js que está consolidado.
  return new NextResponse("console.log('Firebase SW desativado em favor do /sw.js');", {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}
