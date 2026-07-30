import React from 'react';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  processing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal de confirmación reutilizable para acciones irreversibles del flujo
 * jurídico (rechazar, eliminar convocatoria/invitación, etc.), reemplazando
 * `window.confirm()` nativo para mantener consistencia visual con el resto de la app.
 */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'default', processing = false, onConfirm, onCancel,
}: Props) {
  if (!open) return null;

  const danger = variant === 'danger';
  const headerBg = danger
    ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #1e3a5f 0%, #2f6fa3 100%)';
  const confirmBg = danger ? '#dc2626' : '#2f6fa3';
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 70, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget && !processing) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ fontFamily: 'Gabarito, sans-serif' }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: headerBg }}>
          <Icon size={18} className="text-white" />
          <h3 className="font-black text-white">{title}</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-700 leading-snug">{message}</div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-60"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={processing}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-all ${
                processing ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95 cursor-pointer'
              }`}
              style={{ backgroundColor: confirmBg, fontFamily: 'Gabarito, sans-serif' }}
            >
              {processing && <Loader2 size={16} className="animate-spin" />}
              {processing ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
