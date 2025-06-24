// Typography Configuration from Port 3002 Analysis
export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
    mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', 'monospace'],
  },
  
  // Font Sizes (following 1.25 scale ratio)
  fontSize: {
    '2xs': '0.625rem',    // 10px
    'xs': '0.75rem',      // 12px
    'sm': '0.875rem',     // 14px
    'base': '1rem',       // 16px
    'lg': '1.125rem',     // 18px
    'xl': '1.25rem',      // 20px
    '2xl': '1.5rem',      // 24px
    '3xl': '1.875rem',    // 30px
    '4xl': '2.25rem',     // 36px
    '5xl': '3rem',        // 48px
    '6xl': '3.75rem',     // 60px
    '7xl': '4.5rem',      // 72px
  },
  
  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // Text Styles (predefined combinations)
  textStyles: {
    // Headings
    h1: {
      fontFamily: 'sans',
      fontSize: '4xl',
      fontWeight: 'bold',
      lineHeight: 'tight',
      letterSpacing: 'tight',
    },
    h2: {
      fontFamily: 'sans',
      fontSize: '3xl',
      fontWeight: 'semibold',
      lineHeight: 'tight',
      letterSpacing: 'tight',
    },
    h3: {
      fontFamily: 'sans',
      fontSize: '2xl',
      fontWeight: 'semibold',
      lineHeight: 'snug',
      letterSpacing: 'normal',
    },
    h4: {
      fontFamily: 'sans',
      fontSize: 'xl',
      fontWeight: 'medium',
      lineHeight: 'snug',
      letterSpacing: 'normal',
    },
    h5: {
      fontFamily: 'sans',
      fontSize: 'lg',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    h6: {
      fontFamily: 'sans',
      fontSize: 'base',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'wide',
    },
    
    // Body text
    body: {
      fontFamily: 'sans',
      fontSize: 'base',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },
    bodySmall: {
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },
    bodyLarge: {
      fontFamily: 'sans',
      fontSize: 'lg',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },
    
    // UI Elements
    button: {
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'wide',
    },
    label: {
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'medium',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    caption: {
      fontFamily: 'sans',
      fontSize: 'xs',
      fontWeight: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    overline: {
      fontFamily: 'sans',
      fontSize: 'xs',
      fontWeight: 'semibold',
      lineHeight: 'normal',
      letterSpacing: 'widest',
      textTransform: 'uppercase',
    },
    
    // Code
    code: {
      fontFamily: 'mono',
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
    codeBlock: {
      fontFamily: 'mono',
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },
  },
} as const;

// Type helpers
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LineHeight = keyof typeof typography.lineHeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type TextStyle = keyof typeof typography.textStyles;

// Utility function to get text style CSS properties
export function getTextStyle(style: TextStyle) {
  const textStyle = typography.textStyles[style];
  return {
    fontFamily: textStyle.fontFamily === 'sans' 
      ? typography.fontFamily.sans.join(', ')
      : typography.fontFamily.mono.join(', '),
    fontSize: typography.fontSize[textStyle.fontSize as FontSize],
    fontWeight: typography.fontWeight[textStyle.fontWeight as FontWeight],
    lineHeight: typography.lineHeight[textStyle.lineHeight as LineHeight],
    letterSpacing: typography.letterSpacing[textStyle.letterSpacing as LetterSpacing],
    ...(textStyle.textTransform && { textTransform: textStyle.textTransform }),
  };
}