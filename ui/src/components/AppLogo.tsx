/**
 * Doc Portal DP logo with soft gold glow animation. Used consistently across Sidebar, Landing, Login, Register.
 * When linkToHome is true, clicking the logo navigates to /.
 */
import { Link } from 'react-router-dom'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** When true, logo acts as a link to home (/) */
  linkToHome?: boolean
}

const sizeClasses = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-xl',
}

export function AppLogo({ size = 'md', className = '', linkToHome = true }: AppLogoProps) {
  const logoEl = (
    <div
      className={`doc-portal-logo-dp flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${sizeClasses[size]} ${className}`}
    >
      DP
    </div>
  )
  if (linkToHome) {
    return (
      <Link to="/" className="inline-flex shrink-0" aria-label="Doc Portal — Return to home">
        {logoEl}
      </Link>
    )
  }
  return logoEl
}
