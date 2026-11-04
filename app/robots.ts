import type { MetadataRoute } from "next";

// Só o que é página pública de apresentação fica aberto pro Google e pras IAs.
// Memorial, Central, portais, apresentação do balcão e APIs ficam fora: memorial
// de família é privado por definição (cada um tem o próprio portão), e a
// apresentação do parceiro abre por link, não pra busca.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/parceiro", "/familia", "/api", "/homenagem", "/apresentacao", "/canvas-legado"],
      },
    ],
    sitemap: "https://legadodigital.net/sitemap.xml",
  };
}
