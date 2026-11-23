import { AnimatePresence, motion } from 'framer-motion'

interface IntroLoaderProps {
  visible: boolean
  reducedMotion: boolean
}

export function IntroLoader({ visible, reducedMotion }: IntroLoaderProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="aura-intro-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090506]"
          aria-live="polite"
          aria-label="Loading AURA ONE studio experience"
        >
          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            {/* Minimal AURA geometric mark + wordmark */}
            <div className="flex items-center gap-3.5">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white/90"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
              </svg>
              <span className="font-display text-[0.95rem] font-medium tracking-[0.38em] text-white/95 pl-[0.38em]">
                AURA
              </span>
            </div>

            {/* Ultra-fine hairline progress beam */}
            <div className="relative h-px w-36 overflow-hidden bg-white/12">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: reducedMotion ? 0.25 : 0.72, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 bg-white/80"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
