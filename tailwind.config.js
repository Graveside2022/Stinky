/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content paths - scan all HTML and JavaScript files
  content: [
    './*.html',
    './assets/**/*.js',
    '!./node_modules/**/*',
    '!./src/hackrf/**/*',
    '!./backups/**/*'
  ],
  
  // Safelist critical classes that JavaScript depends on
  safelist: [
    // Critical IDs and classes from JS dependency analysis
    'grid-item',
    'minimized',
    'box-header',
    'control-button-small',
    'feed-item',
    'feed-item-blink',
    'notification',
    'show',
    'minimized-tab',
    'restore-button',
    'resize-handle',
    'active',
    'mode-indicator',
    'real-data-mode',
    'demo-mode',
    'signal-item',
    'container',
    'controls-column',
    'instructions-column',
    'hidden',
    'loading',
    'error',
    // Color-based button classes
    'green',
    'blue', 
    'red',
    // Status indicators
    'status-panel',
    'status-indicator',
    'status-connected',
    'status-disconnected',
    'status-demo',
    'status-item',
    // Dynamic classes from pattern analysis
    {
      pattern: /^(feed-item|signal-item|status)-.*/,
    },
    // Position classes for resize handles
    'top',
    'bottom',
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    // Form-related classes
    'form-row',
    'form-col',
    'control-group',
    'section'
  ],
  
  theme: {
    extend: {
      // Original cyber-themed color palette
      colors: {
        // Primary cyber colors
        'cyber-blue': '#00d2ff',
        'cyber-cyan': '#00f2ff',
        'cyber-green': '#00ff88',
        'neon-green': '#0f0',
        'cyber-red': '#ff4444',
        'cyber-orange': '#ffaa00',
        'cyber-yellow': '#ffcc00',
        
        // Background colors
        'dark-bg': '#030610',
        'dark-surface': '#0a0f1e',
        'dark-elevated': '#1a1f3a',
        'dark-overlay': 'rgba(3, 6, 16, 0.75)',
        'glass-dark': 'rgba(10, 15, 30, 0.85)',
        'glass-medium': 'rgba(10, 15, 30, 0.65)',
        'glass-light': 'rgba(26, 31, 58, 0.55)',
        
        // Text colors
        'text-primary': '#d0d8f0',
        'text-secondary': '#b8c5e0',
        'text-tertiary': '#7a8a9a',
        'text-bright': '#ffffff',
        
        // Status colors using cyber palette
        'status-success': '#00ff88',
        'status-warning': '#ffcc00',
        'status-error': '#ff4444',
        'status-info': '#00d2ff',
        
        // Bootstrap-compatible colors
        primary: '#00d2ff',
        secondary: '#7a8a9a',
        success: '#00ff88',
        danger: '#ff4444',
        warning: '#ffcc00',
        info: '#00f2ff',
        light: '#b8c5e0',
        dark: '#030610',
        
        // Cursor.directory slate color palette
        slate: {
          50: '#f8fafc',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        
        // Additional standard colors for compatibility
        blue: {
          500: '#3b82f6'
        },
        emerald: {
          500: '#10b981'
        }
      },
      
      // Custom spacing based on existing patterns
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem'
      },
      
      // Typography scale matching existing design
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1.2' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1.2' }],       // 60px
        '7xl': ['4.5rem', { lineHeight: '1.2' }],        // 72px
        '8xl': ['6rem', { lineHeight: '1' }],            // 96px
        '9xl': ['8rem', { lineHeight: '1' }]             // 128px
      },
      
      // Font families
      fontFamily: {
        'sans': ['Inter', 'Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        'display': ['Inter', 'system-ui', 'sans-serif']
      },
      
      // Letter spacing for cyber aesthetic
      letterSpacing: {
        'cyber-tight': '0.5px',
        'cyber': '1px',
        'cyber-wide': '2px',
        'cyber-wider': '3px',
        'cyber-widest': '6px',
        'cyber-ultra': '12px'
      },
      
      // Responsive breakpoints based on mobile audit
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        // Special breakpoints for existing media queries
        'tablet': '600px',
        'desktop': '1023px'
      },
      
      // Border radius scale
      borderRadius: {
        'cyber-sm': '3px',
        'cyber': '4px',
        'cyber-md': '5px',
        'cyber-lg': '8px',
        'cyber-xl': '12px',
        'cyber-2xl': '20px'
      },
      
      // Box shadows for glassmorphism and glow effects
      boxShadow: {
        'cyber-sm': '0 2px 10px rgba(0, 0, 0, 0.5)',
        'cyber': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'cyber-lg': '0 8px 30px rgba(0, 0, 0, 0.7)',
        'cyber-glow': '0 0 20px rgba(0, 210, 255, 0.3)',        // Cyber blue glow
        'cyber-glow-md': '0 2px 20px rgba(0, 242, 255, 0.35)',  // Cyber cyan glow
        'cyber-glow-lg': '0 4px 15px rgba(0, 210, 255, 0.4)',   // Cyber blue glow
        'cyber-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.5)',        // Cyber green glow
        'neon-red': '0 0 20px rgba(255, 68, 68, 0.5)'           // Cyber red glow
      },
      
      // Backdrop filters for glassmorphism
      backdropBlur: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px'
      },
      
      // Opacity variations
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '85': '0.85'
      },
      
      // Custom animations from existing CSS
      animation: {
        'background-pan': 'background-pan 15s ease infinite',
        'background-pan-slow': 'background-pan 80s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shine': 'shine 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s infinite alternate',
        'banner-scan': 'banner-scan 4s linear infinite',
        'radial-pulse': 'radial-pulse 4s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.4s ease-in-out',
        'blink': 'blink-animation 1.5s infinite ease-in-out',
        'scanner': 'scanner 2s linear infinite',
        'float': 'float 6s ease-in-out infinite'
      },
      
      // Keyframes for animations
      keyframes: {
        'background-pan': {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '-200% center' }
        },
        'glow': {
          '0%': { opacity: '0.8', filter: 'brightness(1)' },
          '100%': { opacity: '1', filter: 'brightness(1.2)' }
        },
        'shine': {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'pulse-glow': {
          '0%': { boxShadow: '0 0 5px rgba(0, 210, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 210, 255, 0.8)' }
        },
        'banner-scan': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'radial-pulse': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.5' },
          '100%': { transform: 'scale(0.8)', opacity: '1' }
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'blink-animation': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' }
        },
        'scanner': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      },
      
      // Transitions
      transitionTimingFunction: {
        'cyber': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      
      // Z-index scale for complex layouts
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '999': '999',
        '9999': '9999'
      },
      
      // Min/Max dimensions for components
      minWidth: {
        '48': '12rem',
        '64': '16rem',
        '80': '20rem',
        '96': '24rem',
        '128': '32rem'
      },
      
      minHeight: {
        '48': '12rem',
        '64': '16rem',
        '80': '20rem',
        '96': '24rem',
        '128': '32rem'
      },
      
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      
      // Grid template columns for complex layouts
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))'
      },
      
      // Aspect ratios for responsive embeds
      aspectRatio: {
        'cyber': '21 / 9',
        'ultrawide': '32 / 9'
      }
    }
  },
  
  plugins: [
    // Form styling plugin for consistent form elements
    require('@tailwindcss/forms')({
      strategy: 'class' // Use class strategy to avoid conflicts
    }),
    
    // Typography plugin for prose content
    require('@tailwindcss/typography'),
    
    // Container queries for component-level responsiveness
    require('@tailwindcss/container-queries'),
    
    // Custom plugin for cyber theme utilities
    function({ addUtilities, addComponents, theme }) {
      // Glassmorphism utilities with original cyber colors
      addUtilities({
        '.glass': {
          backgroundColor: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(26, 31, 58, 0.6)'
        },
        '.glass-light': {
          backgroundColor: 'rgba(10, 15, 30, 0.65)',
          backdropFilter: 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)',
          border: '1px solid rgba(26, 31, 58, 0.4)'
        },
        '.text-gradient': {
          backgroundClip: 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundImage: 'linear-gradient(135deg, #00d2ff 0%, #00f2ff 100%)'
        },
        '.scrollbar-cyber': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(3, 6, 16, 0.6)'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#00d2ff',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#00f2ff'
          }
        }
      })
      
      // Component classes for common patterns
      addComponents({
        '.btn-cyber': {
          padding: '0.5rem 1.5rem',
          borderRadius: '4px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            transition: 'left 0.5s'
          },
          '&:hover::before': {
            left: '100%'
          }
        },
        '.status-dot': {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          display: 'inline-block',
          '&.active': {
            backgroundColor: '#00ff88',
            boxShadow: '0 0 10px #00ff88'
          },
          '&.inactive': {
            backgroundColor: '#7a8a9a'
          }
        }
      })
    }
  ],
  
  // JIT mode is default in v3, but ensure it's enabled
  mode: 'jit',
  
  // Dark mode configuration - use class strategy
  darkMode: 'class',
  
  // Disable preflight to ease migration (can enable later)
  corePlugins: {
    preflight: false // Disable during migration, enable when ready
  }
}