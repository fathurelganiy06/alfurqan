import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useSiakad } from '../context/SiakadContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSiakad();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const styleMap = {
          success: 'bg-white border-[#146E22]/30 text-[#122B18]',
          error: 'bg-white border-red-300 text-red-900',
          warning: 'bg-white border-[#C9A227]/60 text-[#5C4507]',
          info: 'bg-white border-[#D5E4D7] text-[#122B18]',
        }[t.type];

        const icon = {
          success: <CheckCircle2 className="w-4 h-4 text-[#146E22] shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
          warning: <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />,
          info: <Info className="w-4 h-4 text-[#146E22] shrink-0" />,
        }[t.type];

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-200 ${styleMap}`}
          >
            <div className="mt-0.5">{icon}</div>
            <p className="text-sm font-medium leading-snug flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#4A6350] hover:text-[#122B18] p-0.5 rounded transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
