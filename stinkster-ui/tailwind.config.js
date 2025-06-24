/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
    "./frontend/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Monochrome palette from theme
        background: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1a1a1a',
          elevated: '#1f1f1f',
          overlay: '#262626',
          input: '#0f0f0f',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a3a3a3',
          tertiary: '#666666',
          muted: '#4a4a4a',
          disabled: '#333333',
        },
        border: {
          DEFAULT: '#262626',
          muted: '#1f1f1f',
          subtle: '#1a1a1a',
          strong: '#404040',
        },
        accent: {
          cyan: '#00d4ff',
          'cyan-dark': '#0099cc',
          'cyan-light': '#66e5ff',
          white: '#ffffff',
        },
        status: {
          success: '#10b981',
          'success-dark': '#059669',
          warning: '#f59e0b',
          'warning-dark': '#d97706',
          error: '#ef4444',
          'error-dark': '#dc2626',
          info: '#3b82f6',
          'info-dark': '#2563eb',
        },
        signal: {
          excellent: '#10b981',
          good: '#34d399',
          moderate: '#fbbf24',
          weak: '#f97316',
          poor: '#ef4444',
          noise: '#1f1f1f',
        },
        // Legacy color support
        primary: {
          50: 'rgb(239 246 255 / <alpha-value>)',
          100: 'rgb(219 234 254 / <alpha-value>)',
          200: 'rgb(191 219 254 / <alpha-value>)',
          300: 'rgb(147 197 253 / <alpha-value>)',
          400: 'rgb(96 165 250 / <alpha-value>)',
          500: 'rgb(59 130 246 / <alpha-value>)',
          600: 'rgb(37 99 235 / <alpha-value>)',
          700: 'rgb(29 78 216 / <alpha-value>)',
          800: 'rgb(30 64 175 / <alpha-value>)',
          900: 'rgb(30 58 138 / <alpha-value>)',
          950: 'rgb(23 37 84 / <alpha-value>)',
        },
        success: 'rgb(34 197 94 / <alpha-value>)',
        warning: 'rgb(251 146 60 / <alpha-value>)',
        error: 'rgb(239 68 68 / <alpha-value>)',
        info: 'rgb(59 130 246 / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'flicker': 'flicker 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.8)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '10%': { opacity: '0.9' },
          '20%': { opacity: '1' },
          '30%': { opacity: '0.95' },
          '40%': { opacity: '1' },
          '50%': { opacity: '0.9' },
          '60%': { opacity: '1' },
          '70%': { opacity: '0.95' },
          '80%': { opacity: '1' },
          '90%': { opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(12px)',
        'blur-sm': 'blur(4px)',
        'blur-md': 'blur(8px)',
        'blur-lg': 'blur(16px)',
        'blur-xl': 'blur(24px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    // Custom plugin for backdrop filter utilities
    function({ addUtilities }) {
      const backdropUtilities = {
        '.backdrop-blur': {
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        '.backdrop-blur-sm': {
          'backdrop-filter': 'blur(4px)',
          '-webkit-backdrop-filter': 'blur(4px)',
        },
        '.backdrop-blur-md': {
          'backdrop-filter': 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)',
        },
        '.backdrop-blur-lg': {
          'backdrop-filter': 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
        },
        '.backdrop-blur-xl': {
          'backdrop-filter': 'blur(24px)',
          '-webkit-backdrop-filter': 'blur(24px)',
        },
      }
      addUtilities(backdropUtilities)
    },
  ],
}