import React, { useEffect, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';
import { buildSampleReceiptDataUrl } from '../services/localDemoEngine';
import { formatDateID, formatRupiah } from '../utils/formatters';

interface ProofPreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  title?: string;
  nominal?: number;
  tanggal?: string;
  bankName?: string;
  catatan?: string;
}

export const ProofPreviewModal: React.FC<ProofPreviewModalProps> = ({
  open,
  onClose,
  fileUrl,
  fileName,
  fileType,
  title = 'Pratinjau Bukti Pembayaran',
  nominal,
  tanggal,
  bankName,
  catatan,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState(fileUrl);

  useEffect(() => {
    setResolvedUrl(fileUrl);
  }, [fileUrl]);

  if (!open) return null;

  const isPdf =
    fileType === 'application/pdf' || resolvedUrl.toLowerCase().endsWith('.pdf');

  const handleImageError = () => {
    if (resolvedUrl.startsWith('/api/sample-receipt/')) {
      const proofId = resolvedUrl.split('/').pop() || 'sample';
      setResolvedUrl(
        buildSampleReceiptDataUrl({
          proofId,
          bankTitle: bankName,
          nominal,
          tanggal,
          catatan,
        })
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#122B18]/50 backdrop-blur-[2px] flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#D5E4D7] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#D5E4D7] bg-[#F7FAF7]">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#122B18] truncate">{title}</h3>
            {fileName && (
              <p className="text-xs text-[#4A6350] truncate mt-0.5">{fileName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={resolvedUrl}
              download={fileName || 'bukti-bayar'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#146E22] bg-white border border-[#D5E4D7] hover:bg-[#ECF4ED] rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#4A6350] hover:text-[#122B18] hover:bg-[#ECF4ED] rounded-lg transition-colors"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {(nominal !== undefined || tanggal || bankName) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-3 bg-[#FBF5DF]/50 border-b border-[#E8DCA8] text-xs">
            {nominal !== undefined && (
              <div>
                <span className="text-[#6F560C] block">Nominal Transfer</span>
                <span className="font-mono font-bold text-[#122B18] text-sm tabular-nums">
                  {formatRupiah(nominal)}
                </span>
              </div>
            )}
            {tanggal && (
              <div>
                <span className="text-[#6F560C] block">Tanggal Transfer</span>
                <span className="font-semibold text-[#122B18]">{formatDateID(tanggal)}</span>
              </div>
            )}
            {bankName && (
              <div>
                <span className="text-[#6F560C] block">Rekening Tujuan</span>
                <span className="font-semibold text-[#122B18]">{bankName}</span>
              </div>
            )}
            {catatan && (
              <div className="sm:col-span-3 pt-1 border-t border-[#E8DCA8]/70">
                <span className="text-[#6F560C]">Catatan Mahasiswa: </span>
                <span className="text-[#122B18]">{catatan}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-6 bg-[#F2F6F2] flex items-center justify-center min-h-[360px]">
          {isPdf ? (
            <div className="w-full h-[520px] flex flex-col bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#ECF4ED] border-b border-[#D5E4D7] flex items-center gap-2 text-xs text-[#122B18] font-medium">
                <FileText className="w-4 h-4 text-[#146E22]" />
                Dokumen PDF Bukti Pembayaran
              </div>
              <iframe
                src={resolvedUrl}
                title={fileName || 'Dokumen Bukti Bayar PDF'}
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            <img
              src={resolvedUrl}
              alt={fileName || 'Bukti Transfer SPP'}
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className="max-h-[62vh] max-w-full object-contain rounded-xl border border-[#D5E4D7] bg-white shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
};
