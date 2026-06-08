import HomenagemTemplate from "@/components/HomenagemTemplate";

export default function Home() {
  return (
    <HomenagemTemplate
      fotoUrl=""
      nomeCompleto="Maria Aparecida Silva"
      dataNascimento="12 de março de 1945"
      dataFalecimento="3 de junho de 2024"
      biografia="Maria foi uma mulher de fé inabalável, dedicada à família e aos amigos. Sua memória é um legado de amor."
      videoUrl=""
      galeriaFotos={[]}
      condolencias={[]}
    />
  );
}