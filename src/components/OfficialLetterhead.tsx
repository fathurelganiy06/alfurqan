import React from 'react';
import { CAMPUS_LOGO_URL, formatDateLongID } from '../utils/formatters';

interface OfficialLetterheadProps {
  documentTitle: string;
  subtitle?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  documentTitle,
  subtitle,
}) => {
  return (
    <div className="print-only mb-6">
      <div className="flex items-center gap-4 pb-3 border-b-[3px] border-[#146E22]">
        <img
          src={CAMPUS_LOGO_URL}
          alt="Logo STAI AL FURQAN Makassar"
          referrerPolicy="no-referrer"
          className="w-20 h-20 object-contain shrink-0"
        />
        <div className="flex-1 text-center pr-12">
          <p className="text-xs font-semibold tracking-wider text-[#146E22]">
            YAYASAN PENDIDIKAN ISLAM AL-FURQAN MAKASSAR
          </p>
          <h1 className="text-xl font-extrabold text-[#122B18] tracking-tight mt-0.5">
            SEKOLAH TINGGI AGAMA ISLAM (STAI) AL-FURQAN MAKASSAR
          </h1>
          <p className="text-[11px] text-[#334155] mt-1">
            Jl. Perintis Kemerdekaan Km. 15 Daya, Kec. Biringkanaya, Kota Makassar, Sulawesi Selatan 90243
          </p>
          <p className="text-[11px] text-[#4A6350]">
            Website: www.staialfurqan.ac.id · Email: akademik@staialfurqan.ac.id · Telp. (0411) 510-284
          </p>
        </div>
      </div>
      <div className="h-[2px] bg-[#C9A227] mt-[2px] mb-5" />

      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-[#122B18] underline underline-offset-4">
          {documentTitle}
        </h2>
        {subtitle && <p className="text-xs text-[#4A6350] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export const OfficialSignatureFooter: React.FC<{
  signerTitle?: string;
  signerName?: string;
}> = ({
  signerTitle = 'Kepala Bagian Keuangan & Administrasi Akademik',
  signerName = 'Drs. H. Abd. Rahman, M.Pd.',
}) => {
  return (
    <div className="print-only mt-10 flex justify-end">
      <div className="w-64 text-center text-xs text-[#122B18]">
        <p>Makassar, {formatDateLongID()}</p>
        <p className="mt-1 font-medium">{signerTitle}</p>
        <div className="h-16" />
        <p className="font-bold underline underline-offset-2">{signerName}</p>
        <p className="text-[11px] text-[#4A6350] mt-0.5">STAI AL-FURQAN Makassar</p>
      </div>
    </div>
  );
};
