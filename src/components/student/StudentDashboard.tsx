import React, { useMemo } from 'react';
import { AlertCircle, ArrowRight, BookOpen, CreditCard, Upload } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { DEMO_STUDENT_ID } from '../../data/seedData';
import type { StudentMenuKey } from '../../types/siakad';
import { CURRENT_ACADEMIC_YEAR, formatDateID, formatRupiah } from '../../utils/formatters';
import { StatusText } from '../StatusText';
import { PaymentDueReminder } from './PaymentDueReminder';

interface StudentDashboardProps {
  onNavigate: (page: StudentMenuKey) => void;
  onGoToUpload: (preset: { billId: string; installmentId?: string; nominal?: number }) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
  onGoToUpload,
}) => {
  const { user, data } = useSiakad();
  const studentId = user?.student_id || DEMO_STUDENT_ID;

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId) || data.students[0],
    [data.students, studentId]
  );

  const faculty = data.faculties.find((f) => f.id === student?.faculty_id);
  const department = data.departments.find((d) => d.id === student?.department_id);

  const currentEnrollments = useMemo(() => {
    if (!student) return [];
    return data.enrollments.filter(
      (e) => e.student_id === student.id && e.semester_diambil === student.semester_aktif
    );
  }, [data.enrollments, student]);

  const enrolledCourses = useMemo(() => {
    return currentEnrollments
      .map((e) => data.courses.find((c) => c.id === e.course_id))
      .filter(Boolean);
  }, [currentEnrollments, data.courses]);

  const totalSks = enrolledCourses.reduce((acc, c) => acc + (c?.sks || 0), 0);

  const studentBills = useMemo(() => {
    if (!student) return [];
    return data.tuitionBills.filter((b) => b.student_id === student.id);
  }, [data.tuitionBills, student]);

  const studentInstallments = useMemo(() => {
    if (!student) return [];
    return data.installments.filter((i) => i.student_id === student.id);
  }, [data.installments, student]);

  const activeBill = useMemo(() => {
    if (!student) return undefined;
    return (
      studentBills.find((b) => b.semester === student.semester_aktif) || studentBills[0]
    );
  }, [studentBills, student]);

  const sisaTagihan = activeBill
    ? Math.max(0, activeBill.total_tagihan - activeBill.total_terbayar)
    : 0;

  const billInstallments = useMemo(() => {
    if (!activeBill) return [];
    return studentInstallments
      .filter((i) => i.tuition_bill_id === activeBill.id)
      .sort((a, b) => a.termin_ke - b.termin_ke);
  }, [studentInstallments, activeBill]);

  const rejectedProofs = useMemo(
    () => data.paymentProofs.filter((p) => p.student_id === student?.id && p.status_verifikasi === 'Ditolak'),
    [data.paymentProofs, student?.id]
  );

  if (!student) {
    return (
      <div className="bg-white border border-[#D5E4D7] rounded-xl p-8 text-center text-sm text-[#4A6350]">
        Data profil mahasiswa sedang dimuat...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Profile Banner */}
      <section className="bg-[#ECF4ED] border border-[#D5E4D7] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-[#7B6110]">
            Portal Akademik Mahasiswa · Tahun Akademik {CURRENT_ACADEMIC_YEAR}
          </p>
          <h2 className="text-2xl font-extrabold text-[#103A18] mt-1 tracking-tight">
            {student.nama_lengkap}
          </h2>
          <p className="text-xs text-[#3E5844] mt-1.5 font-mono">
            NIM {student.nim} · {department?.nama_jurusan} ({department?.jenjang}) · {faculty?.nama_fakultas} · Semester {student.semester_aktif}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('student_krs')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            Isi / Kelola KRS
          </button>
          <button
            type="button"
            onClick={() => onNavigate('student_upload')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#5C4507] bg-[#FBF5DF] hover:bg-[#F5E9BD] border border-[#E5CF80] rounded-lg transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Upload Bukti SPP
          </button>
        </div>
      </section>

      {/* Reminder Tagihan SPP Mendekati Jatuh Tempo (<= 7 Hari) */}
      <PaymentDueReminder
        bills={studentBills}
        installments={studentInstallments}
        onPayNow={onGoToUpload}
        onViewBilling={() => onNavigate('student_billing')}
      />

      {/* Alert if there is any rejected proof */}
      {rejectedProofs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-[#B91C1C]">
                Terdapat {rejectedProofs.length} bukti pembayaran yang ditolak oleh Admin Keuangan
              </p>
              <p className="text-red-800 mt-0.5">
                Alasan terakhir: “{rejectedProofs[0].alasan_penolakan}”
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('student_upload')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-red-800 rounded-lg whitespace-nowrap shrink-0"
          >
            Upload Ulang Sekarang
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Real-Time Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Beban SKS Semester {student.semester_aktif}</p>
          <p className="text-2xl font-extrabold font-mono text-[#122B18] mt-2 tabular-nums">
            {totalSks} SKS
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">
            {enrolledCourses.length} mata kuliah diambil (maks. 24 SKS)
          </p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Total Tagihan SPP</p>
          <p className="text-xl font-extrabold font-mono text-[#122B18] mt-2 tabular-nums">
            {formatRupiah(activeBill?.total_tagihan || 0)}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">
            Skema: {activeBill?.skema_bayar || 'Belum diterbitkan'}
          </p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">SPP Sudah Dibayar</p>
          <p className="text-xl font-extrabold font-mono text-[#146E22] mt-2 tabular-nums">
            {formatRupiah(activeBill?.total_terbayar || 0)}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">Terverifikasi bagian keuangan</p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#4A6350]">Sisa Tagihan SPP</p>
            {activeBill && <StatusText status={activeBill.status} />}
          </div>
          <p className="text-xl font-extrabold font-mono text-[#B91C1C] mt-2 tabular-nums">
            {sisaTagihan > 0 ? formatRupiah(sisaTagihan) : <span className="text-[#15803D]">Rp 0</span>}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">
            {sisaTagihan === 0 ? 'Kewajiban semester ini terpenuhi' : 'Selesaikan sesuai jadwal termin'}
          </p>
        </div>
      </section>

      {/* Bottom 2-column summary: Active KRS Schedule & Installment Progress */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D5E4D7] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#122B18]">
              Jadwal Kuliah Semester {student.semester_aktif}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('student_krs')}
              className="text-xs font-semibold text-[#146E22] hover:underline"
            >
              Kelola KRS →
            </button>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#4A6350]">
              Anda belum mengambil mata kuliah di semester ini. Klik Kelola KRS untuk mulai memilih.
            </div>
          ) : (
            <div className="divide-y divide-[#EDF3EE]">
              {enrolledCourses.map((c) =>
                c ? (
                  <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#122B18] truncate">
                        <span className="font-mono text-[#146E22] mr-2">{c.kode_mk}</span>
                        {c.nama_mk}
                      </p>
                      <p className="text-[11px] text-[#4A6350] mt-0.5">
                        {c.dosen_pengampu} · {c.ruangan}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-[#122B18]">
                        {c.hari}, {c.jam_mulai}–{c.jam_selesai}
                      </p>
                      <p className="font-mono text-[11px] text-[#7B6110]">{c.sks} SKS</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D5E4D7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#146E22]" />
              <h3 className="text-sm font-bold text-[#122B18]">Ringkasan Pembayaran SPP</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('student_billing')}
              className="text-xs font-semibold text-[#146E22] hover:underline"
            >
              Lihat Rekening →
            </button>
          </div>

          <div className="p-5 space-y-3 text-xs">
            {billInstallments.length > 0 ? (
              <>
                <p className="text-[#4A6350]">
                  Skema <strong>Bayar Berkala (Cicilan)</strong> aktif untuk tagihan Semester{' '}
                  {activeBill?.semester}:
                </p>
                <div className="space-y-2.5">
                  {billInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-3 rounded-lg bg-[#F7FAF7] border border-[#E2ECE4] flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-[#122B18]">Termin ke-{inst.termin_ke}</p>
                        <p className="text-[11px] text-[#4A6350]">
                          Jatuh tempo: {formatDateID(inst.tanggal_jatuh_tempo)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-[#122B18] tabular-nums">
                          {formatRupiah(inst.nominal_termin)}
                        </p>
                        <div className="mt-0.5">
                          <StatusText status={inst.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[#4A6350] leading-relaxed">
                Tagihan semester aktif menggunakan skema{' '}
                <strong>{activeBill?.skema_bayar || 'Lunas Sekali Bayar'}</strong>. Anda dapat
                melihat nomor rekening resmi STAI AL-FURQAN Makassar pada menu Pembayaran SPP.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
