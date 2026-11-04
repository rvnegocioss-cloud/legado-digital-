import type { MetadataRoute } from "next";
import { supabaseServidor } from "@/lib/supabaseServidor";

const SITE = "https://legadodigital.net";

// Só páginas públicas de apresentação. Fora de propósito: memoriais (privacidade
// da família), páginas de cemitério (noindex deliberado: exporiam nome de
// falecido no Google), Central, portais e apresentação do balcão.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();
  const fixas: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/busca`, lastModified: agora, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/politica-de-privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/termos-de-uso`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Página de cada funerária parceira (útil pra busca local). Parceiro marcado
  // como "(exemplo)" é só mockup da landing, não entra.
  let parceiros: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabaseServidor
      .from("parceiros_b2b")
      .select("slug, nome_fantasia, razao_social")
      .eq("ativo", true)
      .not("slug", "is", null);
    parceiros = (data ?? [])
      .filter((p) => !/exemplo/i.test(`${p.nome_fantasia ?? ""} ${p.razao_social ?? ""}`))
      .map((p) => ({
        url: `${SITE}/parceiros/${p.slug}`,
        lastModified: agora,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  } catch {
    // sem banco no build: o sitemap sai só com as páginas fixas
  }

  return [...fixas, ...parceiros];
}
