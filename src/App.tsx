import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HomeView } from './components/HomeView'
import { IntroLoader } from './components/IntroLoader'
import { Navbar } from './components/Navbar'
import { OrderView } from './components/OrderView'
import { StudioBackdrop } from './components/StudioBackdrop'
import { useIsMobile } from './hooks/useIsMobile'
import { useReducedMotion } from './hooks/useReducedMotion'
import { AuraCanvas } from './three/AuraCanvas'
import { sceneBridge } from './three/sceneBridge'
import type {
  AppPage,
  AuraColorId,
  CameraPreset,
  CheckoutStep,
  NavSection,
} from './types/aura'

export default function App() {
  const [selectedColor, setSelectedColor] = useState<AuraColorId>('crimson')
  const [page, setPage] = useState<AppPage>('home')
  const [activeNav, setActiveNav] = useState<NavSection>('home')
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('front')
  const [isLidOpen, setIsLidOpen] = useState<boolean>(true)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('none')
  const [showLoader, setShowLoader] = useState<boolean>(true)
  const [introReady, setIntroReady] = useState<boolean>(false)
  const [scrolled, setScrolled] = useState<boolean>(false)

  const pageRef = useRef<AppPage>('home')
  const reducedMotion = useReducedMotion()
  const isMobile = useIsMobile(1024)

  // Initial cinematic load reveal (concise and seamless)
  useEffect(() => {
    const loaderDelay = reducedMotion ? 160 : 760
    const t1 = window.setTimeout(() => {
      setShowLoader(false)
      setIntroReady(true)
    }, loaderDelay)
    return () => window.clearTimeout(t1)
  }, [reducedMotion])

  // Subtle navbar backdrop reveal on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Update document title dynamically per page
  useEffect(() => {
    pageRef.current = page
    document.title =
      page === 'order'
        ? 'Order AURA ONE — Virtual Studio'
        : 'AURA ONE — Power, in its purest form.'
  }, [page])

  const scrollToExplore = useCallback(() => {
    const el = document.getElementById('explore')
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }, [reducedMotion])

  const handleNavigate = useCallback(
    (target: NavSection) => {
      if (target === 'order') {
        pageRef.current = 'order'
        setCheckoutStep('none')
        setCameraPreset('front')
        setIsLidOpen(true)
        setPage('order')
        setActiveNav('order')
        window.scrollTo({ top: 0, behavior: 'auto' })
        return
      }

      if (target === 'home') {
        pageRef.current = 'home'
        setCheckoutStep('none')
        setIsLidOpen(true)
        if (page !== 'home') {
          sceneBridge.scrollProgress = 0
          setPage('home')
          setActiveNav('home')
          window.scrollTo({ top: 0, behavior: 'auto' })
        } else {
          window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
          setActiveNav('home')
        }
        return
      }

      // Explore
      pageRef.current = 'home'
      setCheckoutStep('none')
      setIsLidOpen(true)
      if (page !== 'home') {
        setPage('home')
        setActiveNav('explore')
        window.requestAnimationFrame(() => {
          window.setTimeout(() => scrollToExplore(), 120)
        })
      } else {
        setActiveNav('explore')
        scrollToExplore()
      }
    },
    [page, reducedMotion, scrollToExplore]
  )

  const handleOpenBag = useCallback(() => {
    pageRef.current = 'order'
    setPage('order')
    setActiveNav('order')
    setIsLidOpen(true)
    setCheckoutStep((prev) => (prev === 'confirmed' ? 'confirmed' : 'summary'))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const handleSelectColor = useCallback((color: AuraColorId) => {
    setSelectedColor(color)
  }, [])

  const handleSelectPreset = useCallback(
    (preset: CameraPreset) => {
      setCameraPreset(preset)
      if (checkoutStep === 'summary') {
        setCheckoutStep('none')
      }
    },
    [checkoutStep]
  )

  const handleToggleLid = useCallback(() => {
    setIsLidOpen((prev) => !prev)
  }, [])

  const handleStartCheckout = useCallback(() => {
    setIsLidOpen(true)
    setCheckoutStep('summary')
  }, [])

  const handleConfirmCheckout = useCallback(() => {
    sceneBridge.confirmNonce += 1
    setCheckoutStep('confirmed')
  }, [])

  const handleBackToStudio = useCallback(() => {
    setCheckoutStep('none')
    setCameraPreset('front')
  }, [])

  const handleReturnHome = useCallback(() => {
    handleNavigate('home')
  }, [handleNavigate])

  const handleActiveSectionChange = useCallback((section: NavSection) => {
    if (pageRef.current === 'home') {
      setActiveNav(section)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-x-clip">
      {/* 1. Synchronized Matte Studio Gradient Backdrop + Subtle Film Grain */}
      <StudioBackdrop
        selectedColor={selectedColor}
        page={page}
        isMobile={isMobile}
        reducedMotion={reducedMotion}
      />

      {/* 2. Persistent Interactive 3D WebGL Laptop Scene (Never remounted!) */}
      <AuraCanvas
        selectedColor={selectedColor}
        page={page}
        cameraPreset={cameraPreset}
        isLidOpen={isLidOpen}
        checkoutStep={checkoutStep}
        introReady={introReady}
        isMobile={isMobile}
        reducedMotion={reducedMotion}
        onResetView={() => {
          if (page === 'order') setCameraPreset('front')
        }}
      />

      {/* 3. Fixed Minimalist Navigation Bar */}
      <Navbar
        activeNav={activeNav}
        selectedColor={selectedColor}
        introReady={introReady}
        scrolled={scrolled || page === 'order'}
        onNavigate={handleNavigate}
        onOpenBag={handleOpenBag}
      />

      {/* 4. Seamless Animated Page Views overlaying the Persistent 3D Scene */}
      <AnimatePresence mode="wait">
        {page === 'home' ? (
          <motion.div
            key="page-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <HomeView
              selectedColor={selectedColor}
              introReady={introReady}
              reducedMotion={reducedMotion}
              onSelectColor={handleSelectColor}
              onExplore={() => handleNavigate('explore')}
              onGoOrder={() => handleNavigate('order')}
              onActiveSectionChange={handleActiveSectionChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="page-order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <OrderView
              selectedColor={selectedColor}
              cameraPreset={cameraPreset}
              isLidOpen={isLidOpen}
              checkoutStep={checkoutStep}
              isMobile={isMobile}
              reducedMotion={reducedMotion}
              onSelectColor={handleSelectColor}
              onSelectPreset={handleSelectPreset}
              onToggleLid={handleToggleLid}
              onStartCheckout={handleStartCheckout}
              onConfirmCheckout={handleConfirmCheckout}
              onBackToStudio={handleBackToStudio}
              onReturnHome={handleReturnHome}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Minimalist Initial Load Curtain */}
      <IntroLoader visible={showLoader} reducedMotion={reducedMotion} />
    </div>
  )
}
