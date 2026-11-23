import { type ButtonHTMLAttributes, useRef, useState } from 'react'

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  magnetic?: boolean
}

export function MagneticButton({
  variant = 'primary',
  size = 'md',
  magnetic = true,
  className = '',
  children,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e)
    if (!magnetic || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    setOffset({ x: relX * 4.5, y: relY * 3.5 })
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e)
    setOffset({ x: 0, y: 0 })
  }

  const sizeClasses =
    size === 'lg'
      ? 'h-13 px-8 text-[0.9375rem] tracking-[-0.01em]'
      : 'h-11 px-6 text-[0.875rem] tracking-[-0.01em]'

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#F6F4F2] text-[#0D0B0C] hover:bg-white shadow-[0_12px_36px_rgba(0,0,0,0.28)]'
      : variant === 'secondary'
        ? 'bg-white/[0.06] text-[#F6F4F2] border border-white/[0.16] hover:bg-white/[0.12] hover:border-white/[0.28]'
        : 'text-white/75 hover:text-white bg-transparent hover:bg-white/[0.05]'

  return (
    <button
      ref={btnRef}
      type="button"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      className={`group relative inline-flex items-center justify-center gap-2.5 rounded-full font-medium cursor-pointer select-none transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-out active:scale-[0.975] disabled:opacity-45 disabled:pointer-events-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
