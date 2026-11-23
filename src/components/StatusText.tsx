import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusTextProps {
  status: string;
}

export const StatusText: React.FC<StatusTextProps> = ({ status }) => {
  const normalized = status.trim();

  if (normalized === 'Lunas' || normalized === 'Disetujui' || normalized === 'Aktif') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        {normalized}
      </span>
    );
  }

  if (
    normalized === 'Cicilan Berjalan' ||
    normalized === 'Menunggu Verifikasi' ||
    normalized === 'Cuti'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {normalized}
      </span>
    );
  }

  if (normalized === 'Ditolak' || normalized === 'Belum Bayar' || normalized === 'Nonaktif') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C] whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        {normalized}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6350] whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {normalized}
    </span>
  );
};
