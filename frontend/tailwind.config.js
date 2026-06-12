/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0a1628',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        navy: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#1a1f3d',
          900: '#0f1225',
          950: '#0a0f1e',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, transparent, rgb(var(--page-bg) / 1)), linear-gradient(to right, rgb(148 163 184 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.06) 1px, transparent 1px)',
        'hero-glow':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(59 130 246 / 0.20), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgb(6 182 212 / 0.10), transparent)',
        'hero-mesh':
          'radial-gradient(ellipse 100% 80% at 50% -30%, rgb(59 130 246 / 0.18), transparent), radial-gradient(ellipse 50% 60% at 80% 20%, rgb(6 182 212 / 0.12), transparent), radial-gradient(ellipse 40% 50% at 10% 60%, rgb(99 102 241 / 0.08), transparent)',
        'dash-gradient':
          'linear-gradient(135deg, rgb(var(--page-bg)) 0%, rgb(var(--surface)) 50%, rgb(var(--page-bg)) 100%)',
        'glass-gradient':
          'linear-gradient(135deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.05))',
        'cta-gradient':
          'linear-gradient(135deg, rgb(59 130 246 / 0.15) 0%, rgb(6 182 212 / 0.10) 50%, rgb(99 102 241 / 0.08) 100%)',
      },
      backgroundSize: {
        'grid-48': '48px 48px',
      },
      boxShadow: {
        glass: '0 8px 32px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)',
        card: '0 1px 3px rgb(15 23 42 / 0.06), 0 4px 16px rgb(15 23 42 / 0.06), 0 0 0 1px rgb(15 23 42 / 0.03)',
        'card-hover': '0 12px 32px rgb(15 23 42 / 0.12), 0 4px 12px rgb(15 23 42 / 0.06), 0 0 0 1px rgb(59 130 246 / 0.1)',
        lift: '0 24px 48px -12px rgb(15 23 42 / 0.18), 0 8px 16px -4px rgb(15 23 42 / 0.06)',
        glow: '0 0 20px rgb(59 130 246 / 0.15)',
        'glow-lg': '0 0 40px rgb(59 130 246 / 0.20), 0 0 80px rgb(6 182 212 / 0.08)',
        'glow-brand': '0 4px 14px rgb(59 130 246 / 0.25)',
        'inner-glow': 'inset 0 1px 0 rgb(255 255 255 / 0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 2s ease-in-out infinite',
        marquee: 'marquee var(--marquee-duration, 30s) linear infinite',
        'marquee-reverse': 'marquee-reverse var(--marquee-duration, 30s) linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'counter-flip': 'counterFlip 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgb(59 130 246 / 0.15)' },
          '50%': { boxShadow: '0 0 30px rgb(59 130 246 / 0.30)' },
        },
        counterFlip: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgb(59 130 246 / 0.3)' },
          '50%': { borderColor: 'rgb(59 130 246 / 0.6)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
