import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { AURA_FINISHES } from '../data/finishes'
import type { AuraColorId, NavSection } from '../types/aura'

interface NavbarProps {
  activeNav: NavSection
  selectedColor: AuraColorId
  introReady: boolean
  scrolled: boolean
  onNavigate: (target: NavSection) => void
  onOpenBag: () => void
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'explore', label: 'Explore' },
  { id: 'order', label: 'Order' },
]

export function Navbar({
  activeNav,
  selectedColor,
  introReady,
  scrolled,
  onNavigate,
  onOpenBag,
}: NavbarProps) {
  const theme = AURA_FINISHES[selectedColor]

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: introReady ? 1 : 0, y: introReady ? 0 : -14 }}
      transition={{ duration: 0.75, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-500 ${
        scrolled
          ? 'bg-black/30 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 md:h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        {/* Brand mark */}
        <button
          id="nav-brand-logo"
          type="button"
          onClick={() => onNavigate('home')}
          className="group flex items-center gap-2.5 cursor-pointer py-1.5"
          aria-label="AURA Home"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white/90 transition-transform duration-500 group-hover:rotate-45"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
            <circle
              cx="12"
              cy="12"
              r="3.8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeOpacity="0.6"
            />
          </svg>
          <span className="font-display text-[0.875rem] font-semibold tracking-[0.34em] text-white/95">
            AURA
          </span>
        </button>

        {/* Center links with animated active indicator */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-3 py-2 text-[0.8125rem] sm:text-[0.875rem] tracking-[0.01em] cursor-pointer transition-colors duration-300 ${
                  isActive ? 'text-white font-medium' : 'text-white/60 hover:text-white/92'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="aura-nav-indicator"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    className="absolute left-3 right-3 bottom-0.5 h-[1.5px] rounded-full"
                    style={{ backgroundColor: theme.uiAccent }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Right: Active finish cue + Minimal Shopping Bag */}
        <div className="flex items-center gap-3">
          <button
            id="nav-shopping-bag"
            type="button"
            onClick={onOpenBag}
            aria-label={`Open order summary for AURA ONE in ${theme.name}`}
            className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/85 cursor-pointer transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.25] hover:text-white"
          >
            <ShoppingBag className="h-[15px] w-[15px]" strokeWidth={1.6} />
            <span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0B0406] transition-colors duration-500"
              style={{ backgroundColor: theme.uiAccent }}
              aria-hidden="true"
            />
          </button>
        </div>
      </nav>
    </motion.header>
  )
}
