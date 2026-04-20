/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,json}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6', // Professional blue
        'primary-dark': '#2563eb',
        secondary: '#6366f1', // Indigo
        'secondary-dark': '#4f46e5',
        accent: '#f43f5e', // Rose
        'accent-dark': '#e11d48',
        dark: {
          bg: '#0f1115',
          surface: '#1e2128',
          border: '#2d333f',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#3b82f6'
        },
        light: {
          bg: '#ffffff',
          surface: '#f9fafb',
          border: '#e5e7eb',
          text: '#111827',
          muted: '#6b7280',
          accent: '#2563eb'
        }
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
