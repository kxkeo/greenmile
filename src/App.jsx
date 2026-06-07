import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SchoolProvider } from './SchoolContext'
import ScrollToTop from './components/ScrollToTop'
import PublicLayout from './layouts/PublicLayout'

// Public pages
import Home from './pages/Home'
import Boosters from './pages/Boosters'
import Team from './pages/Team'
import Events from './pages/Events'
import Volunteer from './pages/Volunteer'
import Donate from './pages/Donate'
import DonateCheckout from './pages/DonateCheckout'
import Shop from './pages/Shop'
import NotFound from './pages/NotFound'

// Account
import Login from './pages/account/Login'
import Signup from './pages/account/Signup'
import Dashboard from './pages/account/Dashboard'

// Admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <SchoolProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/boosters" element={<Boosters />} />
            <Route path="/team" element={<Team />} />
            <Route path="/events" element={<Events />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/donate/checkout" element={<DonateCheckout />} />
            <Route path="/shop" element={<Shop />} />

            {/* Participant account */}
            <Route path="/my-account/login" element={<Login />} />
            <Route path="/my-account/signup" element={<Signup />} />
            <Route path="/my-account/dashboard" element={<Dashboard />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SchoolProvider>
  )
}
