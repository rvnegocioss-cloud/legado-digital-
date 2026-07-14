'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

const navLinks = [
  { href: '#beneficios', label: 'Benefícios' },
  { href: '#como-funciona', label: 'Como Funciona' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'FAQ' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo-legado-digital.png" alt="Legado Digital" width={220} height={88} className="h-14 w-auto object-contain" priority />
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
            <Link
              href="/parceiro/login"
              className="text-sm text-white/60 hover:text-[#C9A46A] transition-colors"
            >
              Acesso Parceiros
            </Link>
            <Link
              href="/familia/login"
              className="text-sm text-white/60 hover:text-[#C9A46A] transition-colors"
            >
              Acesso Familiar
            </Link>
            <Button className="bg-[#C9A46A] hover:bg-[#a8834a] text-[#0B1D2A] font-semibold px-6" asChild>
              <Link href="/admin/login">Acesso Legado Central</Link>
            </Button>
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
              <Link
                href="/parceiro/login"
                onClick={() => setIsOpen(false)}
                className="block text-sm text-white/60 hover:text-[#C9A46A] transition-colors py-2"
              >
                Acesso Parceiros
              </Link>
              <Link
                href="/familia/login"
                onClick={() => setIsOpen(false)}
                className="block text-sm text-white/60 hover:text-[#C9A46A] transition-colors py-2"
              >
                Acesso Familiar
              </Link>
              <Button className="w-full bg-[#C9A46A] hover:bg-[#a8834a] text-[#0B1D2A] font-semibold" asChild>
                <Link href="/admin/login">Acesso Legado Central</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}