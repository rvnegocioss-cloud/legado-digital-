import { supabase } from "@/lib/supabase";
import HomenagemTemplate from "@/components/HomenagemTemplate";

export default async function Home() {
  const { data: homenagem } = await supabase
    .from("homenagens")
    .select("*")
    .eq("id", "8f981539-6281-4585-938e-c8bed6c241be")
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
      biografia={homenagem.biografia}
      timeline={homenagem.timeline || []}
      videoUrl={homenagem.video_url || ""}
      musicaUrl={homenagem.musica_url || ""}
      galeriaFotos={homenagem.galeria_fotos || []}
      condolencias={[]}
    />
  );
}