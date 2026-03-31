import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { HiOutlineArrowLeftOnRectangle, HiOutlineBars3, HiOutlineBell, HiOutlineBriefcase, HiOutlineCog6Tooth, HiOutlineCreditCard, HiOutlineHome, HiOutlineLifebuoy, HiOutlineMagnifyingGlass, HiOutlineMoon, HiOutlineSun, HiOutlineTag, HiOutlineUserCircle, HiOutlineUsers, HiOutlineXMark } from 'react-icons/hi2'
import { AppFooter } from '@/components/layout/app-footer'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/auth-provider'
import { useBusiness } from '@/features/business/hooks'
import { useTheme } from '@/features/theme/theme-provider'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { FadeIn } from '@/components/ui/motion'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { signOut, user } = useAuth()
  const business = useBusiness()
  const { theme, toggleTheme } = useTheme()
  const { t } = useAppTranslation(['navigation', 'common'])
  const navigate = useNavigate()
  const ThemeIcon = theme === 'dark' ? HiOutlineSun : HiOutlineMoon

  const navItems = [
    { to: '/dashboard', label: t('sidebar.overview'), icon: HiOutlineHome },
    { to: '/offers', label: t('sidebar.offers'), icon: HiOutlineTag },
    { to: '/customers', label: t('sidebar.customers'), icon: HiOutlineUsers },
    { to: '/profile', label: t('sidebar.profile'), icon: HiOutlineBriefcase },
    { to: '/settings', label: t('sidebar.settings'), icon: HiOutlineCog6Tooth },
    { to: '/settings/subscription', label: t('sidebar.subscription'), icon: HiOutlineCreditCard },
    { to: '/support', label: t('sidebar.support'), icon: HiOutlineLifebuoy },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/auth/login')
  }

  const sidebar = (
    <div className="flex h-full flex-col justify-between gap-6 rounded-[1.8rem] bg-sidebar p-5 text-nav-text shadow-[0_18px_52px_rgba(2,6,23,0.32)]">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{t('sidebar.eyebrow')}</p>
            <p className="mt-1 text-lg font-extrabold text-white">{t('common.appName')}</p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sidebar-border text-white/60 lg:hidden"
            aria-label={t('common.buttons.cancel')}
            onClick={() => setMobileOpen(false)}
          >
            <HiOutlineXMark aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `app-nav-item flex items-center gap-3 px-4 py-3 text-sm font-semibold ${isActive ? 'app-nav-item-active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-sidebar-border pt-4">
        <button
          className="app-nav-item flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold"
          onClick={toggleTheme}
        >
          <ThemeIcon className="h-5 w-5" />
          <span>{theme === 'dark' ? t('common.theme.dark') : t('common.theme.light')}</span>
        </button>
        <a
          className="app-nav-item flex items-center gap-3 px-4 py-3 text-sm font-semibold"
          href="https://app.domain.com"
          target="_blank"
          rel="noreferrer"
        >
          <HiOutlineUserCircle className="h-5 w-5" />
          <span>{t('common.labels.memberApp')}</span>
        </a>
      </div>
    </div>
  )

  return (
    <div className="app-shell grid min-h-screen w-full grid-cols-1 gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-5 xl:px-8">
      <aside className="app-shell-sidebar hidden lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-full w-[88vw] max-w-[320px] p-4"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {sidebar}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col gap-6 pb-6">
        <FadeIn className="app-topbar flex items-center gap-3 px-0 py-1">
          <button
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-elevated shadow-soft lg:hidden"
            aria-label={t('sidebar.eyebrow')}
            onClick={() => setMobileOpen(true)}
          >
            <HiOutlineBars3 aria-hidden="true" className="h-6 w-6 text-foreground" />
          </button>
          <div className="app-search-pill flex h-12 min-w-0 flex-1 items-center gap-3 px-4">
            <HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              aria-label={t('topbar.searchPlaceholder')}
              className="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={t('topbar.searchPlaceholder')}
              defaultValue=""
            />
          </div>
          <div className="group relative">
            <button
              aria-label={t('topbar.notifications')}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-elevated shadow-soft"
              type="button"
            >
              <HiOutlineBell aria-hidden="true" className="h-5 w-5 text-foreground" />
            </button>
            <div className="pointer-events-none absolute left-0 top-[calc(100%+0.6rem)] z-30 w-[min(18rem,calc(100vw-2rem))] translate-y-1 rounded-[1rem] border border-border bg-elevated p-4 opacity-0 shadow-soft transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:left-auto sm:right-0 sm:w-56">
              <p className="text-sm font-semibold text-foreground">{t('topbar.notifications')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('topbar.notificationsEmpty')}</p>
            </div>
          </div>
          <div className="group relative ml-auto">
            <button
              aria-label={t('topbar.accountMenu')}
              className="inline-flex min-w-0 items-center gap-3 rounded-full border border-border bg-elevated px-3 py-2 shadow-soft"
              type="button"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {(user?.email?.[0] ?? 'B').toUpperCase()}
              </div>
              <div className="hidden min-w-0 text-left md:block">
                <p className="max-w-[12rem] truncate text-sm font-semibold text-foreground">{user?.email ?? t('common.labels.newBusiness')}</p>
              </div>
            </button>
            <div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-30 min-w-56 translate-y-1 rounded-[1rem] border border-border bg-elevated p-2 opacity-0 shadow-soft transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="border-b border-border/70 px-3 py-2">
                <p className="truncate text-sm font-semibold text-foreground">{user?.email ?? t('common.labels.newBusiness')}</p>
                {business.data ? (
                  <div className="mt-2">
                    <Badge
                      tone={business.data.subscription_status === 'active' ? 'success' : 'warning'}
                      className="w-full justify-center"
                    >
                      {t(`common.status.${business.data.subscription_status}`)}
                    </Badge>
                  </div>
                ) : null}
              </div>
              <div className="py-1">
                <Link className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2" to="/profile">
                  <HiOutlineBriefcase aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span>{t('sidebar.profile')}</span>
                </Link>
                <Link className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2" to="/settings">
                  <HiOutlineCog6Tooth aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span>{t('sidebar.settings')}</span>
                </Link>
                <Link className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-2" to="/settings/subscription">
                  <HiOutlineCreditCard aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span>{t('sidebar.subscription')}</span>
                </Link>
                <button
                  className="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                  onClick={() => void handleSignOut()}
                  type="button"
                >
                  <HiOutlineArrowLeftOnRectangle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span>{t('common.buttons.signOut')}</span>
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        <Outlet />
        <AppFooter />
      </main>
    </div>
  )
}
