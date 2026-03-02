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
        
        // 液态玻璃 V3 色板
        'lg': {
          glass: {
            DEFAULT: 'rgba(255, 255, 255, 0.72)',
            hover: 'rgba(255, 255, 255, 0.85)',
            active: 'rgba(255, 255, 255, 0.92)',
            frost: 'rgba(255, 255, 255, 0.10)',
            fog: 'rgba(255, 255, 255, 0.06)',
            mist: 'rgba(255, 255, 255, 0.04)',
          },
          dark: {
            glass: 'rgba(30, 30, 35, 0.72)',
            hover: 'rgba(40, 40, 48, 0.80)',
            active: 'rgba(45, 45, 55, 0.90)',
          },
          border: {
            thin: 'rgba(255, 255, 255, 0.12)',
            DEFAULT: 'rgba(255, 255, 255, 0.18)',
            hover: 'rgba(255, 255, 255, 0.30)',
          },
          glow: {
            purple: 'rgba(168, 85, 247, 0.45)',
            mint: 'rgba(52, 211, 153, 0.40)',
            blue: 'rgba(96, 165, 250, 0.40)',
            pink: 'rgba(244, 114, 182, 0.35)',
            gold: 'rgba(251, 191, 36, 0.35)',
            cyan: 'rgba(34, 211, 238, 0.40)',
          },
          caustic: {
            purple: 'rgba(168, 85, 247, 0.12)',
            mint: 'rgba(52, 211, 153, 0.10)',
            blue: 'rgba(96, 165, 250, 0.10)',
          },
          resist: {
            bg: 'rgba(148, 163, 184, 0.15)',
            border: 'rgba(148, 163, 184, 0.25)',
          },
          welcome: {
            bg: 'rgba(251, 191, 36, 0.08)',
            border: 'rgba(244, 114, 182, 0.25)',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'soft': '12px',
        'glass': '20px',
        'glass-heavy': '32px',
        'glass-extreme': '48px',
      },
      borderRadius: {
        'glass-sm': '12px',
        'glass': '18px',
        'glass-lg': '24px',
        'glass-xl': '32px',
      },
      boxShadow: {
        // 液态玻璃阴影系统 V3
        'glass': '0 4px 20px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.03)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'glass-float': '0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        'glass-glow-purple': '0 0 30px rgba(168, 85, 247, 0.20)',
        'glass-glow-mint': '0 0 30px rgba(52, 211, 153, 0.20)',
        'glass-glow-blue': '0 0 30px rgba(96, 165, 250, 0.20)',
        'glass-indent': 'inset 0 3px 12px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        // 液态缓动函数 V3
        'viscous': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'elastic': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'organic': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        'damped': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'breathe': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
        'resist': 'cubic-bezier(0.68, -0.15, 0.265, 1.15)',
        'decel': 'cubic-bezier(0, 0, 0.2, 1)',
        'float': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'instant': '100ms',
        'touch': '300ms',
        'morph': '500ms',
        'flow': '800ms',
        'glass': '500ms',
        'glass-slow': '700ms',
      },
      keyframes: {
        // 呼吸动画 V3
        'breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.004)', opacity: '0.98' },
        },
        'breathe-gentle': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '25%': { transform: 'scale(1.002) translateY(-1px)' },
          '50%': { transform: 'scale(1.004) translateY(-2px)' },
          '75%': { transform: 'scale(1.002) translateY(-1px)' },
        },
        // 零重力悬浮
        'levitate': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '20%': { transform: 'translateY(-4px) rotate(0.2deg)' },
          '40%': { transform: 'translateY(-2px) rotate(-0.1deg)' },
          '60%': { transform: 'translateY(-6px) rotate(0.15deg)' },
          '80%': { transform: 'translateY(-3px) rotate(-0.05deg)' },
        },
        // 霓虹辉光流动
        'glow-flow': {
          '0%, 100%': { 
            borderColor: 'rgba(168, 85, 247, 0.30)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)'
          },
          '33%': { 
            borderColor: 'rgba(52, 211, 153, 0.30)',
            boxShadow: '0 0 20px rgba(52, 211, 153, 0.15)'
          },
          '66%': { 
            borderColor: 'rgba(96, 165, 250, 0.30)',
            boxShadow: '0 0 20px rgba(96, 165, 250, 0.15)'
          },
        },
        // 气泡上升
        'bubble-rise': {
          '0%': { transform: 'translateY(100%) scale(0)', opacity: '0' },
          '5%': { opacity: '0.5', transform: 'translateY(90%) scale(0.3)' },
          '15%': { transform: 'translateY(70%) scale(0.6)' },
          '50%': { opacity: '0.4', transform: 'translateY(40%) scale(0.9)' },
          '85%': { opacity: '0.2', transform: 'translateY(10%) scale(1)' },
          '100%': { transform: 'translateY(-5%) scale(1.1)', opacity: '0' },
        },
        // 焦散光斑
        'caustic': {
          '0%, 100%': { 
            backgroundPosition: '0% 0%, 50% 50%, 100% 0%',
            opacity: '0.4',
            transform: 'scale(1)'
          },
          '25%': { 
            backgroundPosition: '25% 75%, 75% 25%, 25% 75%',
            opacity: '0.5',
            transform: 'scale(1.02)'
          },
          '50%': { 
            backgroundPosition: '50% 100%, 100% 0%, 0% 100%',
            opacity: '0.35',
            transform: 'scale(1)'
          },
          '75%': { 
            backgroundPosition: '75% 25%, 25% 75%, 75% 25%',
            opacity: '0.45',
            transform: 'scale(1.01)'
          },
        },
        // 闪烁高光
        'sheen': {
          '0%': { transform: 'translateX(-150%) skewX(-20deg)', opacity: '0' },
          '20%': { opacity: '0.6' },
          '60%': { opacity: '0.4' },
          '100%': { transform: 'translateX(250%) skewX(-20deg)', opacity: '0' },
        },
        // 入场凝聚
        'materialize': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(24px) scale(0.96)',
            filter: 'blur(10px)'
          },
          '60%': { 
            opacity: '1', 
            transform: 'translateY(-2px) scale(1.005)',
            filter: 'blur(0)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0)'
          },
        },
        // 弹性入场
        'bounce-in': {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '50%': { transform: 'translateY(-4px) scale(1.008)' },
          '75%': { transform: 'translateY(2px) scale(0.998)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // 苏醒动画
        'awaken': {
          '0%': { 
            opacity: '0.6', 
            filter: 'blur(6px) saturate(0.6)',
            transform: 'scale(0.98) translateY(4px)'
          },
          '40%': { 
            opacity: '0.9', 
            filter: 'blur(2px) saturate(1.1)',
            transform: 'scale(1.005)'
          },
          '70%': { 
            filter: 'blur(0) saturate(1.05)',
            transform: 'scale(1.002)'
          },
          '100%': { 
            opacity: '1', 
            filter: 'blur(0) saturate(1)',
            transform: 'scale(1) translateY(0)'
          },
        },
        // 涟漪扩散
        'ripple': {
          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: '0.5' },
          '50%': { opacity: '0.2' },
          '100%': { transform: 'translate(-50%, -50%) scale(2.5)', opacity: '0' },
        },
        // 脉冲辉光
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.30)' },
        },
      },
      animation: {
        'breathe': 'breathe 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        'breathe-gentle': 'breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        'levitate': 'levitate 10s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
        'glow-flow': 'glow-flow 8s linear infinite',
        'bubble-rise': 'bubble-rise 12s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
        'caustic': 'caustic 8s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
        'sheen': 'sheen 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'materialize': 'materialize 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'bounce-in': 'bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'awaken': 'awaken 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'ripple': 'ripple 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-glow': 'pulse-glow 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
      },
    },
  },
  plugins: [
    // 添加液态玻璃工具类插件
    function({ addComponents, addUtilities, theme }) {
      // 核心组件类 V3
      addComponents({
        // 基础玻璃面板
        '.glass-v3': {
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '24px',
          transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
        // 深色模式
        '.glass-v3-dark': {
          background: 'rgba(30, 30, 35, 0.72)',
          borderColor: 'rgba(255, 255, 255, 0.10)',
        },
        // 有机形变悬停 - 凹陷效果
        '.glass-v3-hover': {
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(0.985) translateY(1px)',
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(168, 85, 247, 0.25)',
            boxShadow: 'inset 0 3px 12px rgba(0, 0, 0, 0.08), 0 0 25px rgba(168, 85, 247, 0.08)',
          },
          '&:active': {
            transform: 'scale(0.978) translateY(2px)',
            boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 15px rgba(168, 85, 247, 0.05)',
            transitionDuration: '100ms',
          },
        },
        // 液态按钮
        '.btn-liquid': {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(12px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '18px',
          fontWeight: '600',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 300ms cubic-bezier(0.68, -0.15, 0.265, 1.15)',
          '&:hover': {
            transform: 'scale(0.985) translateY(1px)',
            background: 'rgba(255, 255, 255, 0.20)',
            borderColor: 'rgba(168, 85, 247, 0.30)',
            boxShadow: '0 0 25px rgba(168, 85, 247, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
          },
          '&:active': {
            transform: 'scale(0.978) translateY(2px)',
            boxShadow: 'inset 0 3px 12px rgba(0, 0, 0, 0.12), 0 0 12px rgba(168, 85, 247, 0.06)',
            transitionDuration: '100ms',
          },
        },
        // 主按钮
        '.btn-liquid-primary': {
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.70) 0%, rgba(96, 165, 250, 0.60) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.40)',
          color: 'white',
          boxShadow: '0 6px 25px rgba(139, 92, 246, 0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.80) 0%, rgba(96, 165, 250, 0.70) 100%)',
            boxShadow: '0 10px 35px rgba(139, 92, 246, 0.35), 0 0 50px rgba(139, 92, 246, 0.12)',
          },
        },
        // 液态卡片
        '.card-liquid': {
          position: 'relative',
          padding: '28px',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '24px',
          overflow: 'hidden',
          transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
          animation: 'breathe-gentle 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
          '&:hover': {
            transform: 'scale(0.990) translateY(1px)',
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(168, 85, 247, 0.22)',
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.06), 0 0 30px rgba(168, 85, 247, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          },
        },
      });
      
      // 实用工具类
      addUtilities({
        // 折射效果
        '.glass-refraction': {
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0',
            borderRadius: 'inherit',
            background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.06) 25%, rgba(255, 255, 255, 0.10) 50%, rgba(255, 255, 255, 0.06) 75%, transparent 100%)',
            backgroundSize: '200% 200%',
            animation: 'lg-v3-refraction 12s cubic-bezier(0.25, 0.8, 0.25, 1) infinite',
            pointerEvents: 'none',
            zIndex: '1',
          },
        },
        // 性能优化
        '.will-change-transform': {
          willChange: 'transform, box-shadow',
        },
        '.gpu-accelerate': {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        },
        // 3D透视
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.preserve-3d': {
          transformStyle: 'preserve-3d',
        },
      });
    },
  ],
}
