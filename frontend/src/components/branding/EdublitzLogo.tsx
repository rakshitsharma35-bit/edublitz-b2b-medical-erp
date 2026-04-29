import clsx from 'clsx'
import { useId } from 'react'

function EdublitzMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const gradId = `edublitz-grad-${id}`
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
      <path
        d="M12 12h14v3H15v6h10v3H15v11h-3V12z"
        fill="white"
        fillOpacity={0.95}
      />
    </svg>
  )
}

type EdublitzLogoProps = {
  className?: string
  /** Sidebar / dark backgrounds */
  variant?: 'onDark' | 'onLight'
  size?: 'sm' | 'md'
}

export default function EdublitzLogo({
  className,
  variant = 'onDark',
  size = 'md',
}: EdublitzLogoProps) {
  const onDark = variant === 'onDark'
  return (
    <div className={clsx('flex items-center gap-2.5 min-w-0', className)}>
      <EdublitzMark className={size === 'sm' ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'} />
      <div className="min-w-0 leading-tight">
        <p
          className={clsx(
            'font-bold tracking-tight truncate',
            size === 'sm' ? 'text-sm' : 'text-base',
            onDark ? 'text-white' : 'text-slate-900'
          )}
        >
          Edublitz
        </p>
        <p
          className={clsx(
            'text-[10px] font-medium truncate',
            onDark ? 'text-slate-400' : 'text-slate-500'
          )}
        >
          Medical B2B ERP
        </p>
      </div>
    </div>
  )
}
