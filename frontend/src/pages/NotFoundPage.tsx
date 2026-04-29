import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import EdublitzLogo from '../components/branding/EdublitzLogo'
import BrandingFooter from '../components/branding/BrandingFooter'

export default function NotFoundPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <EdublitzLogo variant="onLight" size="md" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-gray-600 mb-2">This page could not be found.</p>
          <p className="text-gray-500 text-sm mb-6">
            This app uses hash routes (<code className="text-xs bg-gray-100 px-1 rounded">/#/…</code>). Use the links below.
          </p>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary inline-block">Go to dashboard</Link>
          ) : (
            <Link to="/login" className="btn-primary inline-block">Sign in</Link>
          )}
        </div>
      </div>
      <BrandingFooter variant="muted" />
    </div>
  )
}
