import clsx from 'clsx'

type BrandingFooterProps = {
  /** Light text on dark auth screens */
  variant?: 'light' | 'muted'
}

export default function BrandingFooter({ variant = 'muted' }: BrandingFooterProps) {
  const isLight = variant === 'light'
  return (
    <footer
      className={clsx(
        'text-center text-xs px-2',
        isLight ? 'text-slate-400 pt-6 pb-2 px-4' : 'text-gray-400 border-t border-gray-100 pt-4 pb-1 mt-6'
      )}
    >
      <p className={isLight ? 'text-slate-300' : 'text-gray-500'}>
        Edublitz — Powered by{' '}
        <span className={clsx('font-medium', isLight ? 'text-slate-100' : 'text-gray-800')}>
          Greamio Technologies Pvt Ltd
        </span>
      </p>
      <p className={clsx('mt-1', isLight ? 'text-slate-500' : 'text-gray-400')}>
        © {new Date().getFullYear()} All rights reserved.
      </p>
    </footer>
  )
}
