import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Building2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleMicrosoftLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin();
    }, 800);
  };

  return (
    <div style={styles.wrapper}>
      {/* Background Image */}
      <div style={styles.bgImage} />

      {/* Overlay gradient */}
      <div style={styles.overlay} />

      {/* Floating decorative orbs */}
      <div style={{ ...styles.orb, ...styles.orbTopLeft }} />
      <div style={{ ...styles.orb, ...styles.orbBottomRight }} />

      {/* Main centered card */}
      <div style={{
        ...styles.cardContainer,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>

        {/* Top accent bar */}
        <div style={styles.accentBar} />

        {/* Logo / Brand area */}
        <div style={styles.brandArea}>
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" style={{ height: 56, width: 'auto' }} />
          <p style={styles.brandSubtitle}>Portal de Compras y Contratación</p>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Welcome text */}
        <div style={styles.welcomeArea}>
          <h2 style={styles.welcomeTitle}>Bienvenido</h2>
          <p style={styles.welcomeText}>
            Inicia sesión con tu cuenta corporativa de Microsoft para acceder al sistema.
          </p>
        </div>

        {/* Microsoft Login Button (primary) */}
        <button
          id="btn-login-microsoft"
          onClick={handleMicrosoftLogin}
          disabled={isLoading}
          style={{
            ...styles.msButton,
            opacity: isLoading ? 0.8 : 1,
            transform: isLoading ? 'scale(0.98)' : 'scale(1)',
          }}
          onMouseEnter={e => {
            if (!isLoading) {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #C73D1C 0%, #A93319 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.01)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 35px rgba(232, 73, 34, 0.30)';
            }
          }}
          onMouseLeave={e => {
            if (!isLoading) {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #E84922 0%, #C73D1C 100%)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(232, 73, 34, 0.26)';
            }
          }}
        >
          {isLoading ? (
            <div style={styles.spinnerContainer}>
              <div style={styles.spinner} />
              <span>Iniciando sesión...</span>
            </div>
          ) : (
            <>
              {/* Microsoft Logo SVG */}
              <svg width="22" height="22" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              <span>Iniciar sesión con Microsoft</span>
              <ArrowRight size={18} style={{ marginLeft: 'auto' }} />
            </>
          )}
        </button>

        {/* Info badge */}
        <div style={styles.infoBadge}>
          <Lock size={13} color="var(--brand-secondary)" />
          <span style={styles.infoText}>
            Acceso seguro mediante autenticación corporativa
          </span>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerCopy}>
            © {new Date().getFullYear()} &nbsp;
            <span style={styles.footerBrand}>Invest in Bogotá</span>
            &nbsp;· Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Bottom banner strip */}
      <div style={styles.bottomStrip}>
        <Building2 size={16} color="rgba(255,255,255,0.7)" />
        <span style={styles.bottomStripText}>
          Corporación para el Desarrollo y la Productividad — Invest in Bogotá
        </span>
      </div>
    </div>
  );
}

/* ─────────── Inline styles ─────────── */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Gabarito', sans-serif",
    overflow: 'hidden',
  },
  bgImage: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/bogota_bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(26,35,50,0.68) 0%, rgba(51,132,214,0.48) 65%, rgba(0,0,0,0.45) 100%)',
    zIndex: 1,
  },
  orb: {
    position: 'fixed',
    borderRadius: '50%',
    filter: 'blur(80px)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  orbTopLeft: {
    width: 400,
    height: 400,
    top: -120,
    left: -120,
    background: 'rgba(51,132,214,0.28)',
  },
  orbBottomRight: {
    width: 500,
    height: 500,
    bottom: -150,
    right: -150,
    background: 'rgba(0,169,224,0.24)',
  },
  cardContainer: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: 440,
    margin: '0 16px',
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    boxShadow: '0 26px 60px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  accentBar: {
    height: 5,
    background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-secondary) 50%, var(--brand-accent) 100%)',
  },
  brandArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '28px 32px 0',
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #E84922 0%, #C73D1C 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 6px 20px rgba(51, 132, 214, 0.32)',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    margin: '3px 0 0',
    fontWeight: 500,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
    margin: '22px 32px',
  },
  welcomeArea: {
    padding: '0 32px 24px',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.6,
  },
  msButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: 'calc(100% - 64px)',
    margin: '0 32px',
    padding: '15px 20px',
    background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(232, 73, 34, 0.26)',
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    letterSpacing: '0.1px',
    fontFamily: "'Gabarito', sans-serif",
  },
  spinnerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  infoBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    margin: '18px 32px 0',
    padding: '10px 16px',
    background: 'rgba(51, 132, 214, 0.08)',
    border: '1px solid rgba(51, 132, 214, 0.16)',
    borderRadius: 10,
  },
  infoText: {
    fontSize: 12,
    color: 'var(--brand-secondary)',
    fontWeight: 500,
  },
  footer: {
    padding: '20px 32px 26px',
    textAlign: 'center' as const,
  },
  footerCopy: {
    fontSize: 11,
    color: '#9ca3af',
    margin: 0,
  },
  footerBrand: {
    color: 'var(--brand-primary)',
    fontWeight: 600,
  },
  bottomStrip: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'rgba(0,0,0,0.5)',
  },
  bottomStripText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: "'Gabarito', sans-serif",
  },
};

// Inject keyframes for spinner
if (!document.head.querySelector('[data-login-spin]')) {
  const styleTag = document.createElement('style');
  styleTag.setAttribute('data-login-spin', '1');
  styleTag.innerHTML = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleTag);
}
