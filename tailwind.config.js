/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7fd',
          100: '#b3e8fb',
          200: '#80d9f9',
          300: '#4dcaf7',
          400: '#26bcf5',
          500: '#00AEEF',
          600: '#009dd8',
          700: '#0087ba',
          800: '#00729c',
          900: '#005B8E',
        },
        secondary: {
          50: '#e6eef4',
          100: '#b3cfe3',
          200: '#80afd2',
          300: '#4d8fc1',
          400: '#2678b3',
          500: '#005B8E',
          600: '#005280',
          700: '#00466f',
          800: '#003a5d',
          900: '#002d4a',
        },
        gold: {
          50: '#fffde6',
          100: '#fff9b3',
          200: '#fff580',
          300: '#fff14d',
          400: '#ffee26',
          500: '#FFD700',
          600: '#e6c200',
          700: '#c9a800',
          800: '#ab8d00',
          900: '#8d7400',
        },
        success: {
          50: '#e8f5e9', 100: '#c8e6c9', 200: '#a5d6a7', 300: '#81c784',
          400: '#66bb6a', 500: '#4caf50', 600: '#43a047', 700: '#388e3c',
          800: '#2e7d32', 900: '#1b5e20',
        },
        warning: {
          50: '#fff8e1', 100: '#ffecb3', 200: '#ffe082', 300: '#ffd54f',
          400: '#ffca28', 500: '#ffc107', 600: '#ffb300', 700: '#ffa000',
          800: '#ff8f00', 900: '#ff6f00',
        },
        error: {
          50: '#ffebee', 100: '#ffcdd2', 200: '#ef9a9a', 300: '#e57373',
          400: '#ef5350', 500: '#f44336', 600: '#e53935', 700: '#d32f2f',
          800: '#c62828', 900: '#b71c1c',
        },
        neutral: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem', '22': '5.5rem', '72': '18rem',
        '80': '20rem', '88': '22rem', '96': '24rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,174,239,0.15)',
        modal: '0 20px 60px rgba(0,0,0,0.2)',
      },
      borderRadius: {
        'xl': '0.75rem', '2xl': '1rem', '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(-16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
