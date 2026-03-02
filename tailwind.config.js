/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './.vitepress/**/*.{js,ts,vue}',
    './docs/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        // Meta Universe 品牌色
        'mu-black': '#050505',
        'mu-dark-gray': '#0a0a0a',
        'mu-neon-green': '#a7f069',
        'mu-purple': '#bd00ff',
        'mu-blue': '#00f0ff',
        
        // 液态玻璃色板
        'lg': {
          glass: {
            DEFAULT: 'rgba(255, 255, 255, 0.72)',
            hover: 'rgba(255, 255, 255, 0.85)',
            active: 'rgba(255, 255, 255, 0.92)',
            frost: 'rgba(255, 255, 255, 0.1)',
            fog: 'rgba(255, 255, 255, 0.06)',
          },
          border: {
            light: 'rgba(255, 255, 255, 0.5)',
            DEFAULT: 'rgba(255, 255, 255, 0.3)',
            hover: 'rgba(255, 255, 255, 0.6)',
          },
          glow: {
            purple: 'rgba(168, 85, 247, 0.45)',
            mint: 'rgba(52, 211, 153, 0.4)',
            blue: 'rgba(96, 165, 250, 0.4)',
            pink: 'rgba(244, 114, 182, 0.35)',
            gold: 'rgba(251, 191, 36, 0.35)',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '32px',
        'glass-extreme': '48px',
      },
      borderRadius: {
        'glass': '16px',
        'glass-lg': '24px',
        'glass-xl': '32px',
      },
      boxShadow: {
        // 液态玻璃阴影系统
        'glass': '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'glass-float': '0 20px 50px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
        'glass-glow': '0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.15)',
        'glass-glow-mint': '0 0 20px rgba(52, 211, 153, 0.3), 0 0 40px rgba(52, 211, 153, 0.15)',
      },
      transitionTimingFunction: {
        'viscous': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'elastic': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'decel': 'cubic-bezier(0, 0, 0.2, 1)',
        'organic': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        'breathe': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
        'float': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'glass': '400ms',
        'glass-slow': '600ms',
        'glass-morph': '500ms',
        'glass-float': '800ms',
      },
      keyframes: {
        // 呼吸动画
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.003)', opacity: '0.98' },
        },
        // 悬浮动画
        'levitate': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-6px) rotate(0.3deg)' },
          '50%': { transform: 'translateY(-3px) rotate(-0.2deg)' },
          '75%': { transform: 'translateY(-8px) rotate(0.15deg)' },
        },
        // 辉光流动
        'glow-flow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), 0 0 40px rgba(168, 85, 247, 0.15)' 
          },
          '33%': { 
            boxShadow: '0 0 20px rgba(52, 211, 153, 0.3), 0 0 40px rgba(52, 211, 153, 0.15)' 
          },
          '66%': { 
            boxShadow: '0 0 20px rgba(96, 165, 250, 0.3), 0 0 40px rgba(96, 165, 250, 0.15)' 
          },
        },
        // 闪烁高光
        'sheen': {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)', opacity: '0' },
        },
        // 涟漪
        'ripple': {
          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '0.6' },
          '100%': { transform: 'translate(-50%, -50%) scale(2.5)', opacity: '0' },
        },
        // 气泡
        'bubble': {
          '0%': { transform: 'translateY(100%) scale(0)', opacity: '0' },
          '10%': { opacity: '0.5', transform: 'translateY(80%) scale(0.5)' },
          '80%': { opacity: '0.3', transform: 'translateY(10%) scale(1)' },
          '100%': { transform: 'translateY(-10%) scale(1.2)', opacity: '0' },
        },
        // 入场
        'materialize': {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.96)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
      },
      animation: {
        'breathe': 'breathe 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        'levitate': 'levitate 8s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
        'glow-flow': 'glow-flow 6s linear infinite',
        'sheen': 'sheen 1s cubic-bezier(0.22, 1, 0.36, 1)',
        'ripple': 'ripple 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'bubble': 'bubble 12s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
        'materialize': 'materialize 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [
    // 添加液态玻璃工具类插件
    function({ addComponents, addUtilities, theme }) {
      // 核心组件类
      addComponents({
        '.glass': {
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          transition: 'all 400ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.glass-dark': {
          background: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        '.glass-hover': {
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-8px) scale(1.005)',
          },
          '&:active': {
            transform: 'translateY(-2px) scale(0.995)',
            transitionDuration: '100ms',
          },
        },
      });
      
      // 实用工具类
      addUtilities({
        '.animate-float': {
          transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-8px)',
          },
        },
        '.animate-morph': {
          transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '.will-change-transform': {
          willChange: 'transform',
        },
        '.preserve-3d': {
          transformStyle: 'preserve-3d',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
      });
    },
  ],
}
