import React, { useMemo } from 'react';
import { CalendarClock, Check, Copy, CreditCard, Landmark, Upload } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { DEMO_STUDENT_ID } from '../../data/seedData';
import { formatDateID, formatRupiah } from '../../utils/formatters';
import { StatusText } from '../StatusText';

interface StudentBillingProps {
  onGoToUpload: (preset?: { billId: string; installmentId?: string; nominal?: number }) => void;
}

export const StudentBilling: React.FC<StudentBillingProps> = ({ onGoToUpload }) => {
  const { user, data, showToast } = useSiakad();
  const studentId = user?.student_id || DEMO_STUDENT_ID;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId) || data.students[0],
    [data.students, studentId]
  );

  const studentBills = useMemo(() => {
    if (!student) return [];
    return data.tuitionBills
      .filter((b) => b.student_id === student.id)
      .sort((a, b) => b.semester - a.semester);
  }, [data.tuitionBills, student]);

  const activeBill = useMemo(() => {
    if (!student) return undefined;
    return (
      studentBills.find((b) => b.semester === student.semester_aktif) || studentBills[0]
    );
  }, [studentBills, student]);

  const activeInstallments = useMemo(() => {
    if (!activeBill) return [];
    return data.installments
      .filter((i) => i.tuition_bill_id === activeBill.id)
      .sort((a, b) => a.termin_ke - b.termin_ke);
  }, [data.installments, activeBill]);

  const activeBanks = useMemo(
    () => data.bankAccounts.filter((b) => b.is_active),
    [data.bankAccounts]
  );

  const handleCopyAccount = async (bankId: string, rekening: string, bankName: string) => {
    try {
      await navigator.clipboard.writeText(rekening);
      setCopiedId(bankId);
      showToast(`Nomor rekening ${bankName} (${rekening}) berhasil disalin.`);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Gagal menyalin nomor rekening. Mohon salin secara manual.', 'error');
    }
  };

  if (!student) return null;

  const sisaActive = activeBill
    ? Math.max(0, activeBill.total_tagihan - activeBill.total_terbayar)
    : 0;

  return (
    <div className="space-y-6">
      {/* Active Semester Bill Card */}
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECF4ED] text-[#146E22] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#122B18]">
                Tagihan SPP Semester {activeBill?.semester || student.semester_aktif}
              </h2>
              <p className="text-xs text-[#4A6350]">
                Tahun Akademik {activeBill?.tahun_akademik || '2026/2027'} · Skema:{' '}
                <strong>{activeBill?.skema_bayar || '-'}</strong>
              </p>
            </div>
          </div>

          {activeBill && sisaActive > 0 && (
            <button
              type="button"
              onClick={() =>
                onGoToUpload({
                  billId: activeBill.id,
                  nominal: sisaActive,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Bukti Pembayaran
            </button>
          )}
        </div>

        {activeBill ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F7FAF7] border border-[#E2ECE4]">
              <span className="text-xs text-[#4A6350] block">Total Tagihan</span>
              <span className="font-mono text-lg font-extrabold text-[#122B18] mt-1 block tabular-nums">
                {formatRupiah(activeBill.total_tagihan)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F7FAF7] border border-[#E2ECE4]">
              <span className="text-xs text-[#4A6350] block">Sudah Dibayar</span>
              <span className="font-mono text-lg font-extrabold text-[#146E22] mt-1 block tabular-nums">
                {formatRupiah(activeBill.total_terbayar)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F7FAF7] border border-[#E2ECE4]">
              <span className="text-xs text-[#4A6350] block">Sisa Tagihan</span>
              <span className="font-mono text-lg font-extrabold text-[#B91C1C] mt-1 block tabular-nums">
                {sisaActive > 0 ? formatRupiah(sisaActive) : <span className="text-[#15803D]">Rp 0</span>}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F7FAF7] border border-[#E2ECE4] flex flex-col justify-between">
              <span className="text-xs text-[#4A6350] block">Status Pembayaran</span>
              <div className="mt-2">
                <StatusText status={activeBill.status} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#4A6350]">
            Belum ada tagihan SPP yang diterbitkan untuk semester aktif Anda.
          </div>
        )}

        {/* Installment Schedule Table if Cicilan scheme is active */}
        {activeBill?.skema_bayar === 'Cicilan' && activeInstallments.length > 0 && (
          <div className="border-t border-[#D5E4D7] p-5 bg-[#FBF5DF]/35">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-[#8F6F12]" />
              <h3 className="text-sm font-bold text-[#122B18]">
                Jadwal Bayar Berkala (Cicilan) — {activeInstallments.length} Termin
              </h3>
            </div>
            <div className="overflow-x-auto bg-white border border-[#E5CF80] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#EFE3B4] bg-[#FBF5DF]/60 text-[11px] font-bold text-[#6F560C]">
                    <th className="py-2.5 px-4">Termin</th>
                    <th className="py-2.5 px-4 text-right">Nominal Cicilan</th>
                    <th className="py-2.5 px-4">Tanggal Jatuh Tempo</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EED2]">
                  {activeInstallments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="py-3 px-4 font-bold text-[#122B18]">
                        Termin ke-{inst.termin_ke}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#122B18] tabular-nums">
                        {formatRupiah(inst.nominal_termin)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#4A6350]">
                        {formatDateID(inst.tanggal_jatuh_tempo)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={inst.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inst.status === 'Belum Bayar' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onGoToUpload({
                                billId: activeBill.id,
                                installmentId: inst.id,
                                nominal: inst.nominal_termin,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
                          >
                            <Upload className="w-3 h-3" />
                            Bayar Termin Ini
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#4A6350]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Official Active Campus Bank Accounts */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#146E22]" />
          <div>
            <h2 className="text-base font-bold text-[#122B18]">
              Nomor Rekening Resmi Kampus STAI AL-FURQAN Makassar
            </h2>
            <p className="text-xs text-[#4A6350]">
              Lakukan transfer SPP hanya ke rekening resmi yang aktif di bawah ini, lalu unggah bukti transfernya
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBanks.length === 0 ? (
            <div className="md:col-span-2 bg-white border border-[#D5E4D7] rounded-xl p-6 text-center text-xs text-[#4A6350]">
              Belum ada rekening bank aktif yang tersedia saat ini.
            </div>
          ) : (
            activeBanks.map((bank) => {
              const isCopied = copiedId === bank.id;
              return (
                <div
                  key={bank.id}
                  className="bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#122B18]">{bank.nama_bank}</p>
                    <p className="text-xs text-[#4A6350] mt-0.5">a.n. {bank.atas_nama}</p>
                    <div className="mt-4 p-3.5 rounded-lg bg-[#ECF4ED]/70 border border-[#D5E4D7] flex items-center justify-between gap-3">
                      <span className="font-mono text-lg font-extrabold text-[#103A18] tracking-wide tabular-nums">
                        {bank.nomor_rekening}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyAccount(bank.id, bank.nomor_rekening, bank.nama_bank)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Tersalin' : 'Salin No. Rekening'}
                      </button>
                    </div>
                  </div>
                  {bank.keterangan && (
                    <p className="text-xs text-[#4A6350]">{bank.keterangan}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Full Billing History Table */}
      {studentBills.length > 0 && (
        <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D5E4D7]">
            <h3 className="text-sm font-bold text-[#122B18]">Riwayat Tagihan SPP Seluruh Semester</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                  <th className="py-3 px-4">Semester / Tahun Akademik</th>
                  <th className="py-3 px-4">Skema Bayar</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-right">Terbayar</th>
                  <th className="py-3 px-4 text-right">Sisa</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF3EE]">
                {studentBills.map((b) => {
                  const rem = Math.max(0, b.total_tagihan - b.total_terbayar);
                  return (
                    <tr key={b.id}>
                      <td className="py-3 px-4 font-semibold text-[#122B18]">
                        Semester {b.semester} · TA {b.tahun_akademik}
                      </td>
                      <td className="py-3 px-4 text-[#4A6350]">{b.skema_bayar}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatRupiah(b.total_tagihan)}</td>
                      <td className="py-3 px-4 text-right font-mono text-[#146E22] tabular-nums">{formatRupiah(b.total_terbayar)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#B91C1C]">
                        {rem > 0 ? formatRupiah(rem) : <span className="text-[#15803D]">Rp 0</span>}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
