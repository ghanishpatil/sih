import { Link } from 'react-router-dom'
import { Github, Twitter, Linkedin, Instagram, ExternalLink, MessageCircle } from 'lucide-react'
import { BrandLogo } from '@/components/ui/BrandLogo.jsx'
import { APP, SOCIAL_LINKS } from '@/utils/constants.js'

const footerLinks = {
  platform: [
    { to: '/problems', label: 'Problem Statements' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/results', label: 'Results' },
  ],
  resources: [
    { to: '/', label: 'Participant Login' },
  ],
}

const socials = [
  { icon: Instagram, href: SOCIAL_LINKS.instagram, label: 'Instagram' },
  { icon: Twitter, href: SOCIAL_LINKS.twitter, label: 'Twitter' },
  { icon: Linkedin, href: SOCIAL_LINKS.linkedin, label: 'LinkedIn' },
  { icon: Github, href: SOCIAL_LINKS.github, label: 'GitHub' },
  { icon: MessageCircle, href: SOCIAL_LINKS.whatsapp, label: 'WhatsApp Community' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-[rgb(var(--border))] bg-ink-950">
      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(148 163 184 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="h-12 shrink-0 rounded-lg bg-white p-1.5 shadow-md shadow-brand-500/20 ring-1 ring-brand-500/10" />
              <div>
                <p className="font-display text-lg font-bold text-white">{APP.name}</p>
                <p className="text-xs font-medium text-ink-400">{APP.university}</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-400">
              {APP.university}’s internal qualifier for the {APP.parentEvent} — connecting students,
              mentors, industry experts, and jury in one secure, scalable ecosystem.
            </p>

            {/* Social links */}
            <div className="mt-6 flex gap-3">
              {socials.map(({ icon: Icon, href, label }) => {
                const external = href && href !== '#'
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-800 text-ink-400 transition-all duration-200 hover:border-brand-500/40 hover:text-brand-400 hover:shadow-glow-brand/20"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Platform links */}
          <div className="lg:col-span-3">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink-300">
              Platform
            </p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.platform.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-ink-400 transition-colors duration-200 hover:text-brand-400"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div className="lg:col-span-2">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink-300">
              Resources
            </p>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.resources.map(({ to, href, label }) => (
                <li key={label}>
                  {to ? (
                    <Link
                      to={to}
                      className="text-sm text-ink-400 transition-colors duration-200 hover:text-brand-400"
                    >
                      {label}
                    </Link>
                  ) : (
                    <a
                      href={href}
                      className="inline-flex items-center gap-1 text-sm text-ink-400 transition-colors duration-200 hover:text-brand-400"
                    >
                      {label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-ink-800/60">
        <div className="flex w-full flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} {APP.university}. Internal qualifier for the {APP.parentEvent}.
          </p>

        </div>
      </div>
    </footer>
  )
}
