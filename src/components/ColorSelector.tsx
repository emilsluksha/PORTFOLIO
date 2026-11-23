import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AURA_COLOR_ORDER, AURA_FINISHES } from '../data/finishes'
import type { AuraColorId } from '../types/aura'

interface ColorSelectorProps {
  selectedColor: AuraColorId
  onSelectColor: (color: AuraColorId) => void
  compact?: boolean
  idPrefix?: string
}

export function ColorSelector({
  selectedColor,
  onSelectColor,
  compact = false,
  idPrefix = 'swatch',
}: ColorSelectorProps) {
  const [hoveredColor, setHoveredColor] = useState<AuraColorId | null>(null)
  const activeTheme = AURA_FINISHES[selectedColor]

  return (
    <div className="flex flex-col gap-3.5">
      {/* Refined animated selected finish label + non-overlapping hover preview */}
      <div className="flex items-center justify-between gap-2 text-[0.8125rem] tracking-[0.02em]">
        <div className="flex items-center gap-2">
          <span className="text-white/50">Finish —</span>
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeTheme.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block font-medium text-white/95"
              >
                {activeTheme.name}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {hoveredColor && hoveredColor !== selectedColor && (
            <motion.span
              key={hoveredColor}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.16 }}
              className="hidden sm:inline-block text-[0.72rem] tracking-[0.04em] text-white/55"
            >
              {AURA_FINISHES[hoveredColor].name}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Custom accessible metallic circular swatches */}
      <div
        role="radiogroup"
        aria-label="Select AURA ONE aluminum finish"
        className={`flex items-center ${compact ? 'gap-3.5' : 'gap-4'}`}
      >
        {AURA_COLOR_ORDER.map((colorId) => {
          const finish = AURA_FINISHES[colorId]
          const isSelected = selectedColor === colorId
          const isHovered = hoveredColor === colorId

          return (
            <button
              key={colorId}
              id={`${idPrefix}-${colorId}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={finish.name}
              title={finish.name}
              onClick={() => onSelectColor(colorId)}
              onMouseEnter={() => setHoveredColor(colorId)}
              onMouseLeave={() => setHoveredColor(null)}
              className={`group relative flex items-center justify-center rounded-full cursor-pointer transition-transform duration-300 ease-out ${
                compact ? 'h-10 w-10' : 'h-11 w-11'
              } ${isHovered && !isSelected ? 'scale-110' : ''} ${isSelected ? 'scale-105' : ''}`}
            >
              {/* Outer luxury selection / hover ring */}
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full transition-all duration-400 ease-out"
                style={{
                  border: isSelected
                    ? `1.5px solid ${finish.swatchRing}`
                    : isHovered
                      ? '1px solid rgba(255, 255, 255, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: isSelected ? `0 0 18px ${finish.studioGlow}` : 'none',
                }}
              />

              {/* Metallic anodized inner disc */}
              <span
                aria-hidden="true"
                className={`relative block rounded-full transition-transform duration-300 ${
                  compact ? 'h-7 w-7' : 'h-8 w-8'
                }`}
                style={{
                  background: finish.swatchGradient,
                  boxShadow:
                    'inset 0 1px 1.5px rgba(255,255,255,0.42), inset 0 -2px 4px rgba(0,0,0,0.45)',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
