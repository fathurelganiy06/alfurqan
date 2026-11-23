import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Eye, FileUp, RefreshCw, Upload } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { DEMO_STUDENT_ID } from '../../data/seedData';
import type { PaymentProof } from '../../types/siakad';
import { formatDateID, formatRupiah } from '../../utils/formatters';
import { ProofPreviewModal } from '../ProofPreviewModal';
import { StatusText } from '../StatusText';

interface StudentUploadProofProps {
  preset?: { billId: string; installmentId?: string; nominal?: number } | null;
}

export const StudentUploadProof: React.FC<StudentUploadProofProps> = ({ preset }) => {
  const { user, data, uploadProofFile, submitPaymentProof, showToast } = useSiakad();
  const studentId = user?.student_id || DEMO_STUDENT_ID;
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId) || data.students[0],
    [data.students, studentId]
  );

  const payableBills = useMemo(() => {
    if (!student) return [];
    return data.tuitionBills
      .filter((b) => b.student_id === student.id && b.status !== 'Lunas')
      .sort((a, b) => b.semester - a.semester);
  }, [data.tuitionBills, student]);

  const activeBanks = useMemo(
    () => data.bankAccounts.filter((b) => b.is_active),
    [data.bankAccounts]
  );

  const [billId, setBillId] = useState('');
  const [installmentId, setInstallmentId] = useState('');
  const [bankId, setBankId] = useState('');
  const [nominal, setNominal] = useState('');
  const [tanggalTransfer, setTanggalTransfer] = useState('2026-11-22');
  const [catatan, setCatatan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [previewProof, setPreviewProof] = useState<PaymentProof | null>(null);

  // Initialize form defaults or apply preset from Billing / Re-upload
  useEffect(() => {
    if (preset?.billId) {
      setBillId(preset.billId);
      setInstallmentId(preset.installmentId || '');
      if (preset.nominal) setNominal(String(preset.nominal));
    } else if (!billId && payableBills.length > 0) {
      const firstBill = payableBills[0];
      setBillId(firstBill.id);
      const firstUnpaidInst = data.installments
        .filter((i) => i.tuition_bill_id === firstBill.id && i.status === 'Belum Bayar')
        .sort((a, b) => a.termin_ke - b.termin_ke)[0];
      if (firstUnpaidInst) {
        setInstallmentId(firstUnpaidInst.id);
        setNominal(String(firstUnpaidInst.nominal_termin));
      } else {
        setNominal(String(Math.max(0, firstBill.total_tagihan - firstBill.total_terbayar)));
      }
    }
    if (!bankId && activeBanks.length > 0) {
      setBankId(activeBanks[0].id);
    }
  }, [preset, payableBills, activeBanks, data.installments, billId, bankId]);

  const selectedBill = useMemo(
    () => data.tuitionBills.find((b) => b.id === billId),
    [data.tuitionBills, billId]
  );

  const billInstallments = useMemo(() => {
    if (!selectedBill || selectedBill.skema_bayar !== 'Cicilan') return [];
    return data.installments
      .filter((i) => i.tuition_bill_id === selectedBill.id && i.status !== 'Lunas')
      .sort((a, b) => a.termin_ke - b.termin_ke);
  }, [data.installments, selectedBill]);

  const myProofs = useMemo(() => {
    if (!student) return [];
    return data.paymentProofs
      .filter((p) => p.student_id === student.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [data.paymentProofs, student]);

  const handleBillChange = (nextBillId: string) => {
    setBillId(nextBillId);
    const b = data.tuitionBills.find((item) => item.id === nextBillId);
    if (!b) return;
    const unpaidInst = data.installments
      .filter((i) => i.tuition_bill_id === b.id && i.status === 'Belum Bayar')
      .sort((x, y) => x.termin_ke - y.termin_ke)[0];
    if (b.skema_bayar === 'Cicilan' && unpaidInst) {
      setInstallmentId(unpaidInst.id);
      setNominal(String(unpaidInst.nominal_termin));
    } else {
      setInstallmentId('');
      setNominal(String(Math.max(0, b.total_tagihan - b.total_terbayar)));
    }
  };

  const handleInstallmentChange = (nextInstId: string) => {
    setInstallmentId(nextInstId);
    const found = data.installments.find((i) => i.id === nextInstId);
    if (found) {
      setNominal(String(found.nominal_termin));
    }
  };

  const handleReuploadShortcut = (rejected: PaymentProof) => {
    setBillId(rejected.tuition_bill_id);
    setInstallmentId(rejected.installment_id || '');
    setBankId(rejected.bank_account_id);
    setNominal(String(rejected.nominal_transfer));
    setCatatan(`Upload ulang menggantikan bukti yang ditolak sebelumnya`);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Form telah diisi ulang otomatis. Silakan pilih file bukti transfer baru.', 'info');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      showToast('Format file harus JPG, PNG, atau PDF.', 'error');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5 MB.', 'error');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billId || !bankId || !nominal || !selectedFile) {
      showToast('Mohon lengkapi tagihan, rekening, nominal, dan pilih file bukti transfer.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadProofFile(selectedFile);
      await submitPaymentProof({
        tuition_bill_id: billId,
        installment_id: installmentId,
        bank_account_id: bankId,
        nominal_transfer: Number(nominal),
        tanggal_transfer: tanggalTransfer,
        file_url: uploaded.file_url,
        file_name: uploaded.file_name,
        file_type: uploaded.file_type,
        catatan,
      });
      setSelectedFile(null);
      setCatatan('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim bukti pembayaran.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) return null;

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-[#D5E4D7] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECF4ED] text-[#146E22] flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Upload Bukti Pembayaran SPP</h2>
            <p className="text-xs text-[#4A6350]">
              Unggah struk transfer ATM, Mobile Banking, atau resi PDF (JPG, PNG, PDF · maks. 5 MB)
            </p>
          </div>
        </div>

        {payableBills.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#15803D] font-semibold">
            Seluruh tagihan SPP Anda saat ini sudah berstatus Lunas. Terima kasih!
          </div>
        ) : (
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">Tagihan Semester *</label>
                <select
                  required
                  value={billId}
                  onChange={(e) => handleBillChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  {payableBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      Semester {b.semester} (TA {b.tahun_akademik}) — Sisa{' '}
                      {formatRupiah(Math.max(0, b.total_tagihan - b.total_terbayar))}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBill?.skema_bayar === 'Cicilan' && billInstallments.length > 0 && (
                <div>
                  <label className="block font-bold text-[#122B18] mb-1.5">
                    Pilih Termin Cicilan *
                  </label>
                  <select
                    value={installmentId}
                    onChange={(e) => handleInstallmentChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                  >
                    <option value="">Pembayaran Umum / Non-Termin</option>
                    {billInstallments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        Termin ke-{inst.termin_ke} — {formatRupiah(inst.nominal_termin)} (Tempo{' '}
                        {formatDateID(inst.tanggal_jatuh_tempo)} · {inst.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">Rekening Bank Tujuan *</label>
                <select
                  required
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  {activeBanks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.nama_bank} — {bank.nomor_rekening} (a.n. {bank.atas_nama})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">Nominal Transfer (Rp) *</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  placeholder="Contoh: 850000"
                  className="w-full px-3 py-2.5 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">Tanggal Transfer *</label>
                <input
                  type="date"
                  required
                  value={tanggalTransfer}
                  onChange={(e) => setTanggalTransfer(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#122B18] mb-1.5">
                  File Bukti Transfer (JPG, PNG, PDF) *
                </label>
                <label className="flex items-center gap-3 px-3.5 py-2 border border-dashed border-[#146E22]/50 bg-[#F7FAF7] hover:bg-[#ECF4ED] rounded-lg cursor-pointer transition-colors">
                  <FileUp className="w-4 h-4 text-[#146E22] shrink-0" />
                  <span className="truncate text-[#122B18] font-medium">
                    {selectedFile ? selectedFile.name : 'Pilih file bukti transfer (maks. 5 MB)'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#122B18] mb-1.5">Catatan (Opsional)</label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Transfer melalui BSI Mobile atas nama orang tua"
                className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {submitting ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Upload History Table */}
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D5E4D7]">
          <h3 className="text-sm font-bold text-[#122B18]">Riwayat Upload Bukti Pembayaran</h3>
          <p className="text-xs text-[#4A6350] mt-0.5">
            Pantau status verifikasi Admin secara real-time beserta catatan jika perlu perbaikan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">Tagihan / Termin</th>
                <th className="py-3 px-4">Bank & Tanggal</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4">Status Verifikasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE]">
              {myProofs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#4A6350]">
                    Anda belum pernah mengunggah bukti pembayaran SPP.
                  </td>
                </tr>
              ) : (
                myProofs.map((proof) => {
                  const bill = data.tuitionBills.find((b) => b.id === proof.tuition_bill_id);
                  const inst = proof.installment_id
                    ? data.installments.find((i) => i.id === proof.installment_id)
                    : null;
                  const bank = data.bankAccounts.find((b) => b.id === proof.bank_account_id);
                  return (
                    <tr key={proof.id} className="hover:bg-[#F7FAF7]/70 align-top">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#122B18]">
                          SPP Semester {bill?.semester || '-'} ({bill?.tahun_akademik || '-'})
                        </p>
                        <p className="text-[11px] text-[#4A6350]">
                          {inst ? `Cicilan Termin ke-${inst.termin_ke}` : 'Pembayaran Langsung'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#122B18]">{bank?.nama_bank || '-'}</p>
                        <p className="font-mono text-[11px] text-[#4A6350]">
                          {formatDateID(proof.tanggal_transfer)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#122B18] tabular-nums">
                        {formatRupiah(proof.nominal_transfer)}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <StatusText status={proof.status_verifikasi} />
                        {proof.status_verifikasi === 'Ditolak' && proof.alasan_penolakan && (
                          <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-[#B91C1C] flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>Alasan Admin:</strong> {proof.alasan_penolakan}
                            </span>
                          </div>
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
                            Preview
                          </button>
                          {proof.status_verifikasi === 'Ditolak' && (
                            <button
                              type="button"
                              onClick={() => handleReuploadShortcut(proof)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Upload Ulang
                            </button>
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
      </section>

      <ProofPreviewModal
        open={Boolean(previewProof)}
        onClose={() => setPreviewProof(null)}
        fileUrl={previewProof?.file_url || ''}
        fileName={previewProof?.file_name}
        fileType={previewProof?.file_type}
        nominal={previewProof?.nominal_transfer}
        tanggal={previewProof?.tanggal_transfer}
        bankName={data.bankAccounts.find((b) => b.id === previewProof?.bank_account_id)?.nama_bank}
        catatan={previewProof?.catatan}
      />
    </div>
  );
};
