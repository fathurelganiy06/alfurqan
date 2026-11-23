import React, { useMemo, useState } from 'react';
import { Check, Eye, X, XCircle } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { PaymentProof } from '../../types/siakad';
import { formatDateID, formatRupiah } from '../../utils/formatters';
import { ProofPreviewModal } from '../ProofPreviewModal';
import { StatusText } from '../StatusText';

export const AdminPaymentVerification: React.FC = () => {
  const { data, approvePaymentProof, rejectPaymentProof, showToast } = useSiakad();
  const [tab, setTab] = useState<'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak' | 'ALL'>(
    'Menunggu Verifikasi'
  );
  const [previewProof, setPreviewProof] = useState<PaymentProof | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentProof | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: data.paymentProofs.filter((p) => p.status_verifikasi === 'Menunggu Verifikasi').length,
      approved: data.paymentProofs.filter((p) => p.status_verifikasi === 'Disetujui').length,
      rejected: data.paymentProofs.filter((p) => p.status_verifikasi === 'Ditolak').length,
      all: data.paymentProofs.length,
    }),
    [data.paymentProofs]
  );

  const filteredProofs = useMemo(() => {
    return data.paymentProofs
      .filter((p) => (tab === 'ALL' ? true : p.status_verifikasi === tab))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data.paymentProofs, tab]);

  const handleApprove = async (proofId: string) => {
    setProcessingId(proofId);
    try {
      await approvePaymentProof(proofId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyetujui bukti bayar.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      await rejectPaymentProof(rejectTarget.id, rejectReason);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menolak bukti bayar.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Antrean Verifikasi Bukti Pembayaran</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">
              Periksa lampiran bukti transfer mahasiswa sebelum menyetujui atau menolak dengan catatan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#ECF4ED] rounded-lg">
            {(
              [
                { key: 'Menunggu Verifikasi', label: `Menunggu (${counts.pending})` },
                { key: 'Disetujui', label: `Disetujui (${counts.approved})` },
                { key: 'Ditolak', label: `Ditolak (${counts.rejected})` },
                { key: 'ALL', label: `Semua (${counts.all})` },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  tab === item.key
                    ? 'bg-white text-[#146E22] shadow-xs'
                    : 'text-[#4A6350] hover:text-[#122B18]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">Mahasiswa</th>
                <th className="py-3 px-4">Tagihan / Termin</th>
                <th className="py-3 px-4">Bank & Tanggal</th>
                <th className="py-3 px-4 text-right">Nominal Transfer</th>
                <th className="py-3 px-4">Status & Catatan</th>
                <th className="py-3 px-4 text-right">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE]">
              {filteredProofs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#4A6350]">
                    Tidak ada bukti pembayaran pada kategori ini.
                  </td>
                </tr>
              ) : (
                filteredProofs.map((proof) => {
                  const student = data.students.find((s) => s.id === proof.student_id);
                  const bill = data.tuitionBills.find((b) => b.id === proof.tuition_bill_id);
                  const inst = proof.installment_id
                    ? data.installments.find((i) => i.id === proof.installment_id)
                    : null;
                  const bank = data.bankAccounts.find((b) => b.id === proof.bank_account_id);
                  const isPending = proof.status_verifikasi === 'Menunggu Verifikasi';

                  return (
                    <tr key={proof.id} className="hover:bg-[#F7FAF7]/70 align-top">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#122B18]">
                          {student?.nama_lengkap || 'Mahasiswa'}
                        </p>
                        <p className="font-mono text-[11px] text-[#4A6350]">{student?.nim || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#122B18]">
                          SPP Semester {bill?.semester || '-'} ({bill?.tahun_akademik || '-'})
                        </p>
                        <p className="text-[11px] text-[#4A6350]">
                          {inst ? `Cicilan Termin ke-${inst.termin_ke}` : 'Pembayaran Langsung / Penuh'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#122B18]">{bank?.nama_bank || '-'}</p>
                        <p className="text-[11px] text-[#4A6350] font-mono">
                          {formatDateID(proof.tanggal_transfer)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#146E22] tabular-nums">
                        {formatRupiah(proof.nominal_transfer)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <StatusText status={proof.status_verifikasi} />
                        {proof.catatan && (
                          <p className="text-[11px] text-[#4A6350] mt-1">{proof.catatan}</p>
                        )}
                        {proof.status_verifikasi === 'Ditolak' && proof.alasan_penolakan && (
                          <p className="text-[11px] text-[#B91C1C] mt-1">
                            Alasan: {proof.alasan_penolakan}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap justify-end items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewProof(proof)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#122B18] bg-[#F7FAF7] hover:bg-[#ECF4ED] border border-[#C8DBC9] rounded-lg whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#146E22]" />
                            Lihat Bukti
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={processingId === proof.id}
                                onClick={() => void handleApprove(proof.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                              <button
                                type="button"
                                disabled={processingId === proof.id}
                                onClick={() => {
                                  setRejectTarget(proof);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg whitespace-nowrap disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      <ProofPreviewModal
        open={Boolean(previewProof)}
        onClose={() => setPreviewProof(null)}
        fileUrl={previewProof?.file_url || ''}
        fileName={previewProof?.file_name}
        fileType={previewProof?.file_type}
        title={`Bukti Transfer — ${
          data.students.find((s) => s.id === previewProof?.student_id)?.nama_lengkap || ''
        }`}
        nominal={previewProof?.nominal_transfer}
        tanggal={previewProof?.tanggal_transfer}
        bankName={data.bankAccounts.find((b) => b.id === previewProof?.bank_account_id)?.nama_bank}
        catatan={previewProof?.catatan}
      />

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#B91C1C]">Tolak Bukti Pembayaran</h3>
              <button type="button" onClick={() => setRejectTarget(null)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="p-6 space-y-4 text-xs">
              <p className="text-[#4A6350] leading-relaxed">
                Anda akan menolak bukti transfer sebesar{' '}
                <strong className="font-mono text-[#122B18]">
                  {formatRupiah(rejectTarget.nominal_transfer)}
                </strong>
                . Alasan penolakan wajib diisi agar mahasiswa mengetahui perbaikan yang diperlukan.
              </p>
              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">Alasan Penolakan *</label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Nominal pada struk tidak sesuai atau foto bukti buram."
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#B91C1C]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectTarget.id || rejectReason.trim().length < 5}
                  className="px-5 py-2 font-semibold text-white bg-[#B91C1C] hover:bg-red-800 rounded-lg disabled:opacity-50"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
