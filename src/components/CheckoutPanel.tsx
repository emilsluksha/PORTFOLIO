import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { AURA_FINISHES, AURA_PRICE_NUMERIC, AURA_SPECS } from '../data/finishes'
import type { AuraColorId, CheckoutStep } from '../types/aura'
import { MagneticButton } from './MagneticButton'

interface CheckoutPanelProps {
  step: CheckoutStep
  selectedColor: AuraColorId
  onConfirm: () => void
  onBackToStudio: () => void
  onReturnHome: () => void
}

export function CheckoutPanel({
  step,
  selectedColor,
  onConfirm,
  onBackToStudio,
  onReturnHome,
}: CheckoutPanelProps) {
  const theme = AURA_FINISHES[selectedColor]

  return (
    <AnimatePresence mode="wait">
      {step === 'summary' && (
        <motion.div
          key="checkout-summary"
          id="aura-checkout-summary"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          <div>
            <button
              id="checkout-back-btn"
              type="button"
              onClick={onBackToStudio}
              className="inline-flex items-center gap-2 text-[0.8125rem] text-white/60 hover:text-white transition-colors cursor-pointer mb-5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Studio
            </button>

            <p className="aura-eyebrow text-white/50 mb-2">Order Summary</p>
            <h1 className="aura-headline text-[2.25rem] sm:text-[2.65rem] text-white">
              AURA ONE
            </h1>
          </div>

          {/* Selected Finish Card */}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.1] bg-white/[0.035] px-4 py-3.5">
            <div className="flex items-center gap-3.5">
              <span
                className="h-7 w-7 rounded-full shrink-0"
                style={{
                  background: theme.swatchGradient,
                  boxShadow:
                    'inset 0 1px 1.5px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.45)',
                }}
              />
              <div>
                <p className="text-[0.875rem] font-medium text-white">{theme.name}</p>
                <p className="text-[0.75rem] text-white/50">Anodized Aluminum Unibody</p>
              </div>
            </div>
            <span className="text-[0.8125rem] text-white/70 font-medium">Selected</span>
          </div>

          {/* Specifications Recap */}
          <div className="border-t border-b border-white/[0.08] py-4 space-y-2.5">
            {AURA_SPECS.map((spec) => (
              <div key={spec.label} className="flex items-baseline justify-between gap-4 text-[0.8125rem]">
                <span className="text-white/85">{spec.label}</span>
                <span className="text-white/40 text-right text-[0.75rem] hidden sm:inline">
                  {spec.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Fictional Price Breakdown */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.875rem] text-white/60">Concept Estimate</span>
              <span className="font-display text-[1.65rem] font-medium tracking-[-0.03em] text-white">
                {AURA_PRICE_NUMERIC}
              </span>
            </div>
            <p className="text-[0.75rem] text-white/45">
              Interactive concept showcase only — no payment details required and no charge is made.
            </p>
          </div>

          {/* Confirm CTA */}
          <div className="pt-1 flex flex-col gap-3">
            <MagneticButton
              id="checkout-confirm-btn"
              variant="primary"
              size="lg"
              onClick={onConfirm}
              className="w-full"
            >
              Confirm Selection
            </MagneticButton>
          </div>
        </motion.div>
      )}

      {step === 'confirmed' && (
        <motion.div
          key="checkout-confirmed"
          id="aura-checkout-confirmed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start gap-6 py-4"
        >
          {/* Animated minimal sculptural check emblem */}
          <div className="relative flex h-14 w-14 items-center justify-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: theme.swatchRing,
                boxShadow: `0 0 36px ${theme.studioGlow}`,
              }}
            />
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0B090A]"
            >
              <Check className="h-5 w-5" strokeWidth={2.2} />
            </motion.div>
          </div>

          <div className="space-y-3">
            <p className="aura-eyebrow text-white/50">Selection Confirmed</p>
            <h1 className="aura-headline text-[2.4rem] sm:text-[2.9rem] text-white">
              Your AURA is ready.
            </h1>
            <p className="text-[0.95rem] leading-relaxed text-white/65 max-w-sm">
              This is a concept demonstration. No real purchase has been made.
            </p>
          </div>

          {/* Configured Summary Pill */}
          <div className="flex items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.04] pl-2.5 pr-4 py-2">
            <span
              className="h-5 w-5 rounded-full"
              style={{ background: theme.swatchGradient }}
            />
            <span className="text-[0.8125rem] text-white/85">
              AURA ONE · {theme.name} · {AURA_PRICE_NUMERIC}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <MagneticButton
              id="checkout-reconfigure-btn"
              variant="primary"
              onClick={onBackToStudio}
            >
              Configure Another Finish
            </MagneticButton>
            <MagneticButton
              id="checkout-home-btn"
              variant="secondary"
              onClick={onReturnHome}
            >
              Return Home
            </MagneticButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
