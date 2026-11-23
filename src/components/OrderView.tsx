import { motion } from 'framer-motion'
import { ArrowRight, Laptop, Minus, Plus, RotateCcw } from 'lucide-react'
import { AURA_FINISHES, AURA_PRICE_DISPLAY, AURA_SPECS } from '../data/finishes'
import { clampZoom, sceneBridge } from '../three/sceneBridge'
import type { AuraColorId, CameraPreset, CheckoutStep } from '../types/aura'
import { CheckoutPanel } from './CheckoutPanel'
import { ColorSelector } from './ColorSelector'
import { MagneticButton } from './MagneticButton'

interface OrderViewProps {
  selectedColor: AuraColorId
  cameraPreset: CameraPreset
  isLidOpen: boolean
  checkoutStep: CheckoutStep
  isMobile: boolean
  reducedMotion: boolean
  onSelectColor: (color: AuraColorId) => void
  onSelectPreset: (preset: CameraPreset) => void
  onToggleLid: () => void
  onStartCheckout: () => void
  onConfirmCheckout: () => void
  onBackToStudio: () => void
  onReturnHome: () => void
}

const PRESET_OPTIONS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
]

export function OrderView({
  selectedColor,
  cameraPreset,
  isLidOpen,
  checkoutStep,
  isMobile,
  reducedMotion,
  onSelectColor,
  onSelectPreset,
  onToggleLid,
  onStartCheckout,
  onConfirmCheckout,
  onBackToStudio,
  onReturnHome,
}: OrderViewProps) {
  const theme = AURA_FINISHES[selectedColor]

  const handleZoom = (delta: number) => {
    sceneBridge.zoomTarget = clampZoom(sceneBridge.zoomTarget + delta)
  }

  const handleReset = () => {
    sceneBridge.resetNonce += 1
    onSelectPreset('front')
  }

  const studioDock = (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-2.5 pointer-events-auto"
    >
      <p className="hidden lg:block text-[0.6875rem] tracking-[0.06em] text-white/38 select-none">
        Drag to rotate · Scroll to zoom · Double-click to reset
      </p>

      <div
        id="studio-controls-dock"
        className="aura-dock flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 rounded-full px-2 py-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.4)]"
      >
        {/* Camera Preset Buttons */}
        <div role="group" aria-label="Camera viewing angles" className="flex items-center gap-0.5">
          {PRESET_OPTIONS.map((preset) => {
            const active = cameraPreset === preset.id && checkoutStep === 'none'
            return (
              <button
                key={preset.id}
                id={`camera-preset-${preset.id}`}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                aria-pressed={active}
                className={`relative rounded-full px-3 sm:px-3.5 py-1.5 text-[0.75rem] font-medium cursor-pointer transition-colors duration-150 ${
                  active ? 'text-[#0C0B0D]' : 'text-white/75 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="aura-preset-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-[#F6F4F2]"
                  />
                )}
                <span className="relative z-10">{preset.label}</span>
              </button>
            )
          })}
        </div>

        <span className="mx-1 h-4 w-px bg-white/12" aria-hidden="true" />

        {/* Articulated Lid Open / Close Toggle */}
        <button
          id="lid-toggle-btn"
          type="button"
          onClick={onToggleLid}
          aria-pressed={!isLidOpen}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-medium text-white/75 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Laptop className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span>{isLidOpen ? 'Close Lid' : 'Open Lid'}</span>
        </button>

        {/* Controlled Zoom & Reset */}
        <span className="hidden sm:block mx-0.5 h-4 w-px bg-white/12" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-0.5">
          <button
            id="zoom-out-btn"
            type="button"
            onClick={() => handleZoom(-0.14)}
            aria-label="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            id="zoom-in-btn"
            type="button"
            onClick={() => handleZoom(0.14)}
            aria-label="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            id="reset-view-btn"
            type="button"
            onClick={handleReset}
            aria-label="Reset 3D viewing angle"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )

  return (
    <main
      id="aura-order-showroom"
      className="relative z-30 min-h-[100svh] pointer-events-none flex flex-col lg:flex-row"
    >
      {/* MOBILE TOP STAGE SPACER (3D Laptop lives prominently in the top 42vh!) */}
      {isMobile && (
        <div className="relative h-[44vh] w-full flex items-end justify-center pb-3 px-4 pointer-events-none">
          {studioDock}
        </div>
      )}

      {/* ============================================================
          LEFT EDITORIAL CONFIGURATOR / CHECKOUT COLUMN
         ============================================================ */}
      <motion.aside
        data-scrollable-panel="true"
        initial={{ opacity: 0, x: reducedMotion ? 0 : -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reducedMotion ? 0 : -18 }}
        transition={{ duration: 0.65, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto relative w-full lg:w-[440px] xl:w-[475px] shrink-0 lg:min-h-[100svh] flex flex-col justify-center px-6 sm:px-9 lg:px-12 pt-6 pb-14 lg:pt-24 lg:pb-12 bg-gradient-to-t from-black/55 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-black/48 lg:via-black/22 lg:to-transparent"
      >
        {checkoutStep !== 'none' ? (
          <CheckoutPanel
            step={checkoutStep}
            selectedColor={selectedColor}
            onConfirm={onConfirmCheckout}
            onBackToStudio={onBackToStudio}
            onReturnHome={onReturnHome}
          />
        ) : (
          <motion.div
            key="order-configurator"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 sm:gap-7"
          >
            {/* Header */}
            <div>
              <p className="aura-eyebrow text-white/48 mb-2.5">AURA Studio · Virtual Showroom</p>
              <h1
                id="order-product-title"
                className="aura-headline text-[2.5rem] sm:text-[3.1rem] text-white"
              >
                AURA ONE
              </h1>
              <p className="mt-2.5 text-[0.98rem] leading-relaxed text-white/68 font-light">
                Exceptional performance. Extraordinary design.
              </p>
            </div>

            {/* Luxury Color Selector */}
            <div className="pt-1 pb-2">
              <ColorSelector
                selectedColor={selectedColor}
                onSelectColor={onSelectColor}
                idPrefix="order-swatch"
              />
              <p className="mt-4 text-[0.8rem] leading-relaxed text-white/50">
                {theme.tagline}
              </p>
            </div>

            {/* Specifications */}
            <ul
              aria-label="AURA ONE Specifications"
              className="border-t border-b border-white/[0.09] divide-y divide-white/[0.06]"
            >
              {AURA_SPECS.map((spec) => (
                <li
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 py-2.5 text-[0.84rem]"
                >
                  <span className="text-white/90 font-normal">{spec.label}</span>
                  <span className="text-[0.74rem] text-white/42 text-right hidden sm:inline">
                    {spec.detail}
                  </span>
                </li>
              ))}
            </ul>

            {/* Price & Order Action */}
            <div className="flex flex-col gap-4 pt-1">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[0.72rem] tracking-[0.16em] uppercase text-white/45">
                    Starting Configuration
                  </p>
                  <p
                    id="order-price-display"
                    className="mt-1 font-display text-[1.75rem] font-medium tracking-[-0.03em] text-white"
                  >
                    {AURA_PRICE_DISPLAY}
                  </p>
                </div>
                <span className="text-[0.75rem] text-white/45">Free Concept Preview</span>
              </div>

              <MagneticButton
                id="order-now-submit-btn"
                variant="primary"
                size="lg"
                onClick={onStartCheckout}
                className="w-full h-13"
              >
                Order Now
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </MagneticButton>

              <p className="text-[0.72rem] text-white/38 text-center lg:text-left">
                Fictional product concept — interactive design demonstration only.
              </p>
            </div>
          </motion.div>
        )}
      </motion.aside>

      {/* ============================================================
          DESKTOP RIGHT STAGE — STUDIO CONTROLS DOCK
         ============================================================ */}
      {!isMobile && (
        <div className="flex-1 flex flex-col justify-end items-center pb-8 px-8 pointer-events-none">
          {studioDock}
        </div>
      )}
    </main>
  )
}
