import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { IMG } from '../content/images'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/boosters', label: 'Boosters' },
  { to: '/team', label: 'Team' },
  { to: '/events', label: 'Events' },
  { to: '/volunteer', label: 'Volunteer' },
  { to: '/sponsors', label: 'Sponsors' },
  { to: '/donate', label: 'Donate' },
  { to: '/shop', label: 'Shop' },
]

function Logo({ onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2.5 group shrink-0">
      <img src={IMG.logo} alt="Dinuba Emperors crest" className="h-10 w-auto" />
      <span className="leading-none">
        <span className="block font-display uppercase text-xl tracking-wide text-white group-hover:text-field-300 transition">
          Green Mile
        </span>
        <span className="block font-heading uppercase tracking-[0.3em] text-[0.55rem] text-silver-400 -mt-0.5">
          Boosters
        </span>
      </span>
    </Link>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [participant, setParticipant] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    fetch('/api/auth/participant-me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setParticipant(d?.firstName ? d : null))
      .catch(() => setParticipant(null))
  }, [location.pathname])

  const linkClass = ({ isActive }) =>
    `relative font-heading uppercase tracking-wide text-sm py-2 transition-colors ${
      isActive ? 'text-field-400' : 'text-zinc-300 hover:text-white'
    } after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:bg-field-500 after:transition-all ${
      isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'
    }`

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-charcoal-900/90 backdrop-blur-md border-b border-white/[0.08] shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-charcoal-900/95 to-transparent border-b border-transparent'
      }`}
    >
      <div className="section flex items-center justify-between h-16">
        <Logo onClick={() => setOpen(false)} />

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {participant ? (
            <Link to="/my-account/dashboard" className="btn-outline btn-sm">
              Hi, {participant.firstName}
            </Link>
          ) : (
            <Link to="/my-account/login" className="btn-ghost btn-sm">Log in</Link>
          )}
          <Link to="/volunteer" className="btn-primary btn-sm">Join</Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white text-2xl leading-none p-2 -mr-2"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="lg:hidden bg-charcoal-850 border-t border-white/[0.06] max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-6 py-3.5 font-heading uppercase tracking-wide text-sm border-l-2 ${
                  isActive
                    ? 'text-field-400 border-field-500 bg-white/[0.03]'
                    : 'text-zinc-300 border-transparent hover:bg-white/[0.02]'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
            {participant ? (
              <Link to="/my-account/dashboard" className="btn-outline btn-sm flex-1">My Account</Link>
            ) : (
              <Link to="/my-account/login" className="btn-outline btn-sm flex-1">Log in</Link>
            )}
            <Link to="/volunteer" className="btn-primary btn-sm flex-1">Join</Link>
          </div>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  const navigate = useNavigate()
  return (
    <footer className="relative bg-charcoal-850 border-t border-white/[0.07]">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-field-500/50 to-transparent" />
      <div className="section py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2 max-w-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={IMG.logo} alt="Dinuba Emperors crest" className="h-10 w-auto" />
              <span className="font-display uppercase text-xl tracking-wide text-white">Green Mile Boosters</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The booster club behind Dinuba High School Emperors football. We're a small
              Central Valley town with a big Friday-night tradition — a tight community that
              takes care of its kids, on the field and off.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"
                 className="w-10 h-10 grid place-items-center rounded-lg bg-white/5 hover:bg-field-600 transition text-zinc-300 hover:text-white" aria-label="Facebook">
                <span className="font-bold">f</span>
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
                 className="w-10 h-10 grid place-items-center rounded-lg bg-white/5 hover:bg-field-600 transition text-zinc-300 hover:text-white" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="font-heading uppercase tracking-wider text-xs text-zinc-500 mb-4">Explore</div>
            <ul className="space-y-2.5 text-sm">
              {NAV.map(n => (
                <li key={n.to}>
                  <Link to={n.to} className="text-zinc-400 hover:text-field-400 transition">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-heading uppercase tracking-wider text-xs text-zinc-500 mb-4">Get involved</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/volunteer" className="text-zinc-400 hover:text-field-400 transition">Volunteer</Link></li>
              <li><Link to="/donate" className="text-zinc-400 hover:text-field-400 transition">Donate</Link></li>
              <li><Link to="/sponsors" className="text-zinc-400 hover:text-field-400 transition">Sponsor the team</Link></li>
              <li><Link to="/my-account/signup" className="text-zinc-400 hover:text-field-400 transition">Become a member</Link></li>
              <li><a href="mailto:info@greenmileboosters.org" className="text-zinc-400 hover:text-field-400 transition">Contact us</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-zinc-600">© {new Date().getFullYear()} The Green Mile Boosters · Dinuba High School Football</span>
          <span onClick={() => navigate('/admin/login')} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none">
            <img src={IMG.logo} alt="" className="h-4 w-auto opacity-60" /> Go Emperors
          </span>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-charcoal-900">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
