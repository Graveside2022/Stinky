// Monochrome Color Palette from Port 3002 Analysis
export const colors = {
  // Background Colors
  background: {
    primary: '#0a0a0a',     // Main background (rgb(10, 10, 10))
    secondary: '#141414',   // Secondary backgrounds (rgb(20, 20, 20))
    tertiary: '#1a1a1a',    // Tertiary backgrounds (rgb(26, 26, 26))
    elevated: '#1f1f1f',    // Elevated surfaces (rgb(31, 31, 31))
    overlay: '#262626',     // Overlay backgrounds (rgb(38, 38, 38))
    input: '#0f0f0f',       // Input backgrounds (rgb(15, 15, 15))
  },
  
  // Text Colors
  text: {
    primary: '#ffffff',     // Primary text (white)
    secondary: '#a3a3a3',   // Secondary text (rgb(163, 163, 163))
    tertiary: '#666666',    // Tertiary text (rgb(102, 102, 102))
    muted: '#4a4a4a',       // Muted text (rgb(74, 74, 74))
    disabled: '#333333',    // Disabled text (rgb(51, 51, 51))
  },
  
  // Border Colors
  border: {
    default: '#262626',     // Default borders (rgb(38, 38, 38))
    muted: '#1f1f1f',       // Muted borders (rgb(31, 31, 31))
    subtle: '#1a1a1a',      // Subtle borders (rgb(26, 26, 26))
    strong: '#404040',      // Strong borders (rgb(64, 64, 64))
  },
  
  // Accent Colors
  accent: {
    neonCyan: '#00d4ff',    // Primary neon cyan
    neonCyanDark: '#0099cc', // Darker cyan variant
    neonCyanLight: '#66e5ff', // Lighter cyan variant
    white: '#ffffff',        // White accent
  },
  
  // Status Colors
  status: {
    success: '#10b981',      // Success green
    successDark: '#059669',  // Darker success
    warning: '#f59e0b',      // Warning amber
    warningDark: '#d97706',  // Darker warning
    error: '#ef4444',        // Error red
    errorDark: '#dc2626',    // Darker error
    info: '#3b82f6',         // Info blue
    infoDark: '#2563eb',     // Darker info
  },
  
  // Signal Quality Colors (for spectrum analyzer)
  signal: {
    excellent: '#10b981',    // Excellent signal (green)
    good: '#34d399',         // Good signal (light green)
    moderate: '#fbbf24',     // Moderate signal (amber)
    weak: '#f97316',         // Weak signal (orange)
    poor: '#ef4444',         // Poor signal (red)
    noise: '#1f1f1f',        // Noise floor
  },
  
  // Chart Colors
  chart: {
    grid: '#1a1a1a',         // Grid lines
    axis: '#333333',         // Axis lines
    tick: '#4a4a4a',         // Tick marks
    label: '#666666',        // Axis labels
    data: {
      primary: '#00d4ff',    // Primary data color
      secondary: '#a78bfa',  // Secondary data (purple)
      tertiary: '#34d399',   // Tertiary data (green)
      quaternary: '#fbbf24', // Quaternary data (amber)
    }
  },
  
  // Alpha Variants
  alpha: {
    white5: 'rgba(255, 255, 255, 0.05)',
    white10: 'rgba(255, 255, 255, 0.10)',
    white20: 'rgba(255, 255, 255, 0.20)',
    white40: 'rgba(255, 255, 255, 0.40)',
    white60: 'rgba(255, 255, 255, 0.60)',
    black20: 'rgba(0, 0, 0, 0.20)',
    black40: 'rgba(0, 0, 0, 0.40)',
    black60: 'rgba(0, 0, 0, 0.60)',
    black80: 'rgba(0, 0, 0, 0.80)',
    neonCyan20: 'rgba(0, 212, 255, 0.20)',
    neonCyan40: 'rgba(0, 212, 255, 0.40)',
  }
} as const;

// Type-safe color getter
export type ColorPath = 
  | `background.${keyof typeof colors.background}`
  | `text.${keyof typeof colors.text}`
  | `border.${keyof typeof colors.border}`
  | `accent.${keyof typeof colors.accent}`
  | `status.${keyof typeof colors.status}`
  | `signal.${keyof typeof colors.signal}`
  | `chart.grid` | `chart.axis` | `chart.tick` | `chart.label`
  | `chart.data.${keyof typeof colors.chart.data}`
  | `alpha.${keyof typeof colors.alpha}`;

export function getColor(path: ColorPath): string {
  const parts = path.split('.');
  let value: any = colors;
  
  for (const part of parts) {
    value = value[part];
  }
  
  return value as string;
}