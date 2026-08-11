'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'

const navLinks = [
  { href: '#beneficios', label: 'Benefícios' },
  { href: '#como-funciona', label: 'Como Funciona' },
  { href: '#faq', label: 'FAQ' },
]

const areaRestritaLinks = [
  { href: '/admin/login', label: 'Legado Central' },
  { href: '/parceiro/login', label: 'Portal do Parceiro' },
  { href: '/familia/login', label: 'Portal da Família' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [areaAberta, setAreaAberta] = useState(false)

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 lg:h-28">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group ml-16 md:ml-56">
            <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={320} height={128} className="h-20 lg:h-24 w-auto object-contain" priority />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-[#C9A46A] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setAreaAberta(false)
              }}
            >
              <Button
                type="button"
                onClick={() => setAreaAberta((v) => !v)}
                className="bg-[#C9A46A] hover:bg-[#a8834a] text-[#0B1D2A] font-semibold px-6 flex items-center gap-1.5"
              >
                Área Restrita
                <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${areaAberta ? 'rotate-180' : ''}`} />
              </Button>
              <AnimatePresence>
                {areaAberta && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-56 rounded-lg overflow-hidden"
                    style={{ background: '#0B1D2A', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    {areaRestritaLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAreaAberta(false)}
                        className="block px-4 py-3 text-sm text-white/70 hover:text-[#C9A46A] hover:bg-white/5 transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-[rgba(201,168,76,0.15)]"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-sm text-white/60 hover:text-[#C9A46A] transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <p className="text-xs uppercase tracking-wider text-white/40 pt-2">Área Restrita</p>
              {areaRestritaLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-sm text-white/60 hover:text-[#C9A46A] transition-colors py-2"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}