import { supabase } from "@/lib/supabase";
import HomenagemTemplate from "@/components/HomenagemTemplate";

export default async function HomenagemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: homenagem } = await supabase
    .from("homenagens")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!homenagem) return <p>Homenagem não encontrada.</p>;

  return (
    <HomenagemTemplate
      fotoUrl={homenagem.foto_url || ""}
      nomeCompleto={homenagem.nome_completo}
      dataNascimento={homenagem.data_nascimento}
      dataFalecimento={homenagem.data_falecimento}
      cidade={homenagem.cidade || ""}
      frasePreferida={homenagem.frase_preferida || ""}
      biografia={homenagem.biografia || ""}
      timeline={homenagem.timeline || []}
      galeria={[]}
      videoUrl={homenagem.video_url || ""}
      musicaUrl={homenagem.musica_url || ""}
      homenagens={[]}
      assinaturas={[]}
      slugUrl={homenagem.slug || ""}
      temaPadrao="noturno"
    />
  );
}
