'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const HeroBackground = dynamic(() => import('@/components/Hero3D'), { ssr: false })

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
}

const stagger = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
}

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroBackground />

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Badge className="mb-6 bg-[#e2b714]/10 text-[#e2b714] border-[#e2b714]/30 px-4 py-1.5 text-xs tracking-wider uppercase">
              🪦 Plataforma SaaS para o Setor Funerário
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-tight"
          >
            <span className="gradient-text">Preservando Histórias</span>
            <br />
            <span className="text-white/90">Para Sempre</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            Transforme o luto em legado permanente. Ofereça memoriais digitais
            elegantes com QR Code para as famílias que sua funerária atende.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="bg-[#e2b714] hover:bg-[#c9a84c] text-[#1a1a2e] font-semibold text-base px-8 h-14">
              Começar Agora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 text-base px-8 h-14"
              asChild
            >
              <Link href="/busca">Buscar um Memorial</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            {[
              { num: '4', label: 'Níveis de Acesso' },
              { num: '3', label: 'Planos' },
              { num: '100%', label: 'Online' },
              { num: '🔐', label: 'Privacidade Total' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-[#e2b714]">{stat.num}</div>
                <div className="text-sm text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-[#e2b714] rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== BENEFÍCIOS ===== */}
      <section id="beneficios" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge className="mb-4 bg-[#e2b714]/10 text-[#e2b714] border-[#e2b714]/30">
              Por que Legado Digital?
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold">
              <span className="gradient-text">Diferenciais</span> que Transformam
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Sua funerária se destaca com um serviço que une tecnologia e emoção.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📱',
                title: 'QR Code na Placa',
                desc: 'Um QR Code único e discreto instalado na placa memorial. Qualquer visitante escaneia e acessa a homenagem.',
              },
              {
                icon: '🔒',
                title: 'Privacidade Total',
                desc: 'A família controla quem acessa: público, privado ou com senha. O respeito ao falecido é prioridade.',
              },
              {
                icon: '🎨',
                title: 'Memorial Elegante',
                desc: 'Design moderno com fotos, vídeos, biografia e linha do tempo. Uma verdadeira homenagem digital.',
              },
              {
                icon: '💬',
                title: 'Livro de Condolências',
                desc: 'Visitantes deixam mensagens de carinho. A família pode ver e moderar cada homenagem.',
              },
              {
                icon: '👨‍👩‍👧‍👦',
                title: 'Família Participa',
                desc: 'Parentes recebem acesso para editar, adicionar fotos e personalizar o memorial do ente querido.',
              },
              {
                icon: '📊',
                title: 'Gestão Completa',
                desc: 'Dashboard para funerária gerenciar todos os memoriais em um só lugar. Simples e intuitivo.',
              },
              {
                icon: '👁️',
                title: 'Ver Demonstração',
                desc: 'Veja um exemplo real de como fica um memorial digital. Clique para acessar uma homenagem de demonstração.',
              },
            ].map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="glass border-[rgba(201,168,76,0.15)] hover:border-[#e2b714]/30 transition-all h-full">
                  <CardHeader>
                    <div className="text-4xl mb-2">{benefit.icon}</div>
                    <CardTitle className="text-white text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-white/50">{benefit.desc}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Demo Button */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="md:col-span-3"
            >
              <Card className="glass border-[rgba(201,168,76,0.15)] hover:border-[#e2b714]/30 transition-all h-full">
                <CardContent className="flex items-center justify-center p-8">
                  <Button
                    size="lg"
                    className="bg-[#e2b714] hover:bg-[#c9a84c] text-[#1a1a2e] font-semibold text-base px-8 h-14"
                    asChild
                  >
                    <Link href="/homenagem">
                      Ver Memorial de Demonstração
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="py-24 px-4 bg-[#0a0a12]/50">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge className="mb-4 bg-[#e2b714]/10 text-[#e2b714] border-[#e2b714]/30">
              Simples e Rápido
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold">
              Como <span className="gradient-text">Funciona</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', icon: '🏢', title: 'Funerária Cadastra', desc: 'Cadastre o falecido na plataforma em 2 minutos.' },
              { step: '02', icon: '👨‍👩‍👧‍👦', title: 'Família Personaliza', desc: 'Parentes recebem acesso e montam o memorial.' },
              { step: '03', icon: '📱', title: 'QR Code Gerado', desc: 'QR Code único é gerado e instalado na placa.' },
              { step: '04', icon: '💬', title: 'Homenagens Chegam', desc: 'Visitantes escaneiam e deixam condolências.' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="text-[#e2b714] text-sm font-mono mb-2">{item.step}</div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Arrow connector */}
          <div className="hidden md:flex justify-center mt-8 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-0.5 bg-gradient-to-r from-[#e2b714]/50 to-transparent" />
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge className="mb-4 bg-[#e2b714]/10 text-[#e2b714] border-[#e2b714]/30">
              Invista no Seu Negócio
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold">
              Planos <span className="gradient-text">para Sua Funerária</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Escolha o plano ideal para sua funerária. Todos incluem suporte técnico.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Básico',
                price: 'R$ 97',
                desc: 'Para começar com memoriais digitais',
                features: ['Até 10 memoriais', 'QR Code básico', 'Livro de condolências', 'Suporte por email'],
                popular: false,
              },
              {
                name: 'Profissional',
                price: 'R$ 197',
                desc: 'O mais escolhido pelas funerárias',
                features: ['Até 50 memoriais', 'QR Code personalizado', 'Fotos e vídeos HD', 'Privacidade configurável', 'Suporte prioritário'],
                popular: true,
              },
              {
                name: 'Premium',
                price: 'R$ 397',
                desc: 'Solução completa com tudo incluso',
                features: ['Memoriais ilimitados', 'QR Code premium', 'Efeitos 3D', 'Customização total', 'API para integração', 'Suporte 24/7'],
                popular: false,
              },
            ].map((plano, idx) => (
              <motion.div
                key={plano.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className={`relative ${plano.popular ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                <Card className={`h-full border ${plano.popular ? 'border-[#e2b714] shadow-lg shadow-[#e2b714]/10' : 'border-[rgba(201,168,76,0.15)]'} glass`}>
                  {plano.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#e2b714] text-[#1a1a2e] font-semibold px-4">
                        ★ Mais Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className={`${plano.popular ? 'pt-8' : ''}`}>
                    <CardTitle className="text-white text-xl">{plano.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-[#e2b714]">{plano.price}</span>
                      <span className="text-white/40 text-sm">/mês</span>
                    </div>
                    <CardDescription className="text-white/50 mt-2">{plano.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plano.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm">
                        <span className="text-[#e2b714]">✓</span>
                        <span className="text-white/70">{feature}</span>
                      </div>
                    ))}
                    <Button
                      className={`w-full mt-6 ${
                        plano.popular
                          ? 'bg-[#e2b714] hover:bg-[#c9a84c] text-[#1a1a2e]'
                          : 'border-white/20 text-white hover:bg-white/5'
                      }`}
                      variant={plano.popular ? 'default' : 'outline'}
                    >
                      {plano.popular ? 'Começar Agora' : 'Ver Plano'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 px-4 bg-[#0a0a12]/50">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <Badge className="mb-4 bg-[#e2b714]/10 text-[#e2b714] border-[#e2b714]/30">
              Dúvidas Frequentes
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold">
              Perguntas <span className="gradient-text">Frequentes</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: 'Como minha funerária começa a usar?',
                a: 'Basta criar uma conta, escolher um plano e começar a cadastrar os memoriais. Em menos de 5 minutos você já pode gerar o primeiro QR Code.',
              },
              {
                q: 'A família precisa pagar algo?',
                a: 'Não! O memorial digital é um serviço oferecido pela funerária. A família só precisa personalizar o conteúdo.',
              },
              {
                q: 'O QR Code é único para cada falecido?',
                a: 'Sim! Cada memorial gera um QR Code exclusivo que leva diretamente à página de homenagem daquele ente querido.',
              },
              {
                q: 'Como funciona a privacidade com senha?',
                a: 'A família define uma senha no painel de controle. Apenas quem tem a senha consegue acessar o memorial.',
              },
              {
                q: 'Posso cancelar quando quiser?',
                a: 'Sim! Sem multas ou taxas de cancelamento. Você pode cancelar a qualquer momento.',
              },
            ].map((faq, idx) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <details className="group glass border border-[rgba(201,168,76,0.15)] rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:text-[#e2b714] transition-colors">
                    {faq.q}
                    <span className="text-[#e2b714] group-open:rotate-180 transition-transform text-xl">▼</span>
                  </summary>
                  <div className="px-5 pb-5 text-white/50 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center glass border border-[#e2b714]/20 rounded-2xl p-12 md:p-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para <span className="gradient-text">Transformar</span> seu Negócio?
          </h2>
          <p className="text-white/50 max-w-xl mx-auto mb-8">
            Junte-se às funerárias que já oferecem memoriais digitais e se destacam no mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#e2b714] hover:bg-[#c9a84c] text-[#1a1a2e] font-semibold text-base px-10 h-14">
              Começar Grátis por 7 Dias
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 text-base px-10 h-14"
            >
              Falar com Consultor
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[rgba(201,168,76,0.15)] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🪦</span>
                <span className="text-lg font-bold text-white">
                  LEGADO <span className="text-[#e2b714]">DIGITAL</span>
                </span>
              </div>
              <p className="text-white/40 text-sm max-w-md">
                Transformando o luto em legado permanente. Memoriais digitais
                com QR Code para o setor funerário.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <div className="space-y-2 text-sm">
                {['Benefícios', 'Planos', 'Como Funciona', 'FAQ'].map((link) => (
                  <div key={link} className="text-white/40 hover:text-[#e2b714] cursor-pointer transition-colors">
                    {link}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <div className="space-y-2 text-sm">
                {['Sobre', 'Contato', 'Privacidade', 'Termos'].map((link) => (
                  <div key={link} className="text-white/40 hover:text-[#e2b714] cursor-pointer transition-colors">
                    {link}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[rgba(201,168,76,0.1)] pt-8 text-center text-white/30 text-xs">
            © 2026 Legado Digital. Todos os direitos reservados.
            <br />
            <span className="mt-1 block">Preservando histórias hoje para que continuem inspirando amanhã.</span>
          </div>
        </div>
      </footer>
    </>
  )
}