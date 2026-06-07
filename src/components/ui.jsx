import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives for the bold Friday-night-football design system.
// All dark-surface, field-green accented. Reused across every page.
// ─────────────────────────────────────────────────────────────────────────────

export function Eyebrow({ children, className = '' }) {
  return <div className={`eyebrow ${className}`}>{children}</div>
}

// Polymorphic button: renders <Link> when `to`, <a> when `href`, else <button>.
export function Button({ to, href, variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const cls = `btn-${variant} btn-${size} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>
  return <button className={cls} {...rest}>{children}</button>
}

// Full-bleed hero with layered dark gradient + field-line texture. Optional
// background image via `image` (URL). Children render over the overlay.
export function Hero({ image, eyebrow, title, subtitle, children, minH = 'min-h-[78vh]', align = 'center' }) {
  return (
    <section className={`relative ${minH} flex items-center overflow-hidden`}>
      {/* Background image */}
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      {/* Gradient + texture overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/70 via-charcoal-900/80 to-charcoal-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,35,15,0.55)_100%)]" />
      <div className="absolute inset-0 bg-field-lines opacity-60" />
      {/* Top green hairline glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-field-500/60 to-transparent" />

      <div className={`relative section py-24 w-full ${align === 'center' ? 'text-center' : ''}`}>
        <div className={`${align === 'center' ? 'mx-auto' : ''} max-w-3xl ${align === 'center' ? '' : ''} animate-fade-up`}>
          {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
          {title && (
            <h1 className="display text-white text-5xl sm:text-7xl lg:text-8xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-6 text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-9 flex flex-wrap gap-3 justify-center">{children}</div>}
        </div>
      </div>
    </section>
  )
}

// Angled divider between sections — football-energy diagonal cut.
export function SectionDivider({ flip = false, color = 'bg-charcoal-850' }) {
  return (
    <div className="relative h-12 overflow-hidden -my-px" aria-hidden>
      <div
        className={`absolute inset-0 ${color}`}
        style={{ clipPath: flip ? 'polygon(0 100%, 100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 100%, 0 100%)' }}
      />
    </div>
  )
}

// Big stat strip — "what the boosters delivered" numbers.
export function StatStrip({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
      {stats.map((s) => (
        <div key={s.label} className="bg-charcoal-850 px-6 py-8 text-center">
          <div className="display text-field-400 text-4xl sm:text-5xl">{s.value}</div>
          <div className="mt-2 font-heading uppercase tracking-wider text-[0.7rem] text-zinc-400">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// Section heading block (eyebrow + title + optional intro).
export function SectionHeading({ eyebrow, title, intro, center = true, className = '' }) {
  return (
    <div className={`${center ? 'text-center mx-auto' : ''} max-w-2xl ${className}`}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="display text-white text-4xl sm:text-5xl">{title}</h2>
      {intro && <p className="mt-4 text-zinc-400 leading-relaxed">{intro}</p>}
    </div>
  )
}

// Icon/feature card.
export function FeatureCard({ icon, title, children }) {
  return (
    <div className="card-hover p-7">
      {icon && <div className="text-3xl mb-4">{icon}</div>}
      <h3 className="font-heading uppercase tracking-wide text-lg text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{children}</p>
    </div>
  )
}

// Call-to-action band — green gradient with field lines.
export function CTABand({ eyebrow, title, subtitle, children }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-field-800 via-field-700 to-field-900">
      <div className="absolute inset-0 bg-field-lines opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="relative section py-16 text-center">
        {eyebrow && <div className="eyebrow !text-field-100 mb-3">{eyebrow}</div>}
        <h2 className="display text-white text-4xl sm:text-5xl drop-shadow">{title}</h2>
        {subtitle && <p className="mt-4 text-field-50/90 max-w-xl mx-auto leading-relaxed">{subtitle}</p>}
        {children && <div className="mt-8 flex flex-wrap gap-3 justify-center">{children}</div>}
      </div>
    </section>
  )
}

// Simple loading + empty states.
export function Loading({ label = 'Loading…' }) {
  return (
    <div className="py-24 text-center text-zinc-500">
      <div className="inline-block w-8 h-8 border-2 border-field-500/30 border-t-field-500 rounded-full animate-spin" />
      <div className="mt-3 font-heading uppercase tracking-wider text-xs">{label}</div>
    </div>
  )
}

export function EmptyState({ icon = '🏈', title, children }) {
  return (
    <div className="card py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-heading uppercase tracking-wide text-white text-lg">{title}</div>
      {children && <p className="mt-2 text-sm text-zinc-400">{children}</p>}
    </div>
  )
}
