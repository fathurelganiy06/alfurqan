import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CreditCard,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { JenisKelamin, PaymentProof, Student, StudentStatus } from '../../types/siakad';
import { formatDateID, formatRupiah } from '../../utils/formatters';
import { ProofPreviewModal } from '../ProofPreviewModal';
import { StatusText } from '../StatusText';

interface AdminStudentsProps {
  selectedStudentId: string | null;
  onSelectStudent: (id: string | null) => void;
}

const EMPTY_FORM: Partial<Student> = {
  nim: '',
  nama_lengkap: '',
  email: '',
  no_hp: '',
  jenis_kelamin: 'Laki-laki',
  alamat: '',
  faculty_id: '',
  department_id: '',
  angkatan: 2026,
  semester_aktif: 1,
  status: 'Aktif',
};

export const AdminStudents: React.FC<AdminStudentsProps> = ({
  selectedStudentId,
  onSelectStudent,
}) => {
  const { data, saveStudent, deleteStudent, showToast } = useSiakad();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Student>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [previewProof, setPreviewProof] = useState<PaymentProof | null>(null);

  const angkatanOptions = useMemo(() => {
    const s = new Set(data.students.map((st) => st.angkatan));
    return Array.from(s).sort((a, b) => b - a);
  }, [data.students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.students.filter((s) => {
      if (q && !s.nama_lengkap.toLowerCase().includes(q) && !s.nim.toLowerCase().includes(q)) {
        return false;
      }
      if (filterDept !== 'ALL' && s.department_id !== filterDept) return false;
      if (filterAngkatan !== 'ALL' && String(s.angkatan) !== filterAngkatan) return false;
      if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
      return true;
    });
  }, [data.students, search, filterDept, filterAngkatan, filterStatus]);

  const availableDeptsForForm = useMemo(() => {
    if (!form.faculty_id) return data.departments;
    return data.departments.filter((d) => d.faculty_id === form.faculty_id);
  }, [data.departments, form.faculty_id]);

  const openAddModal = () => {
    const firstFac = data.faculties[0];
    const firstDept = data.departments.find((d) => d.faculty_id === firstFac?.id) || data.departments[0];
    setForm({
      ...EMPTY_FORM,
      faculty_id: firstFac?.id || '',
      department_id: firstDept?.id || '',
    });
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setForm({ ...student });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveStudent(form);
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan data mahasiswa.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteStudent(confirmDelete.id);
      if (selectedStudentId === confirmDelete.id) {
        onSelectStudent(null);
      }
      setConfirmDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus mahasiswa.', 'error');
    }
  };

  // --- Detail Mahasiswa View ---
  const detailStudent = selectedStudentId
    ? data.students.find((s) => s.id === selectedStudentId) || null
    : null;

  if (detailStudent) {
    const faculty = data.faculties.find((f) => f.id === detailStudent.faculty_id);
    const dept = data.departments.find((d) => d.id === detailStudent.department_id);
    const studentEnrollments = data.enrollments.filter((e) => e.student_id === detailStudent.id);
    const semestersTaken = Array.from(new Set(studentEnrollments.map((e) => e.semester_diambil))).sort(
      (a, b) => b - a
    );
    const studentBills = data.tuitionBills
      .filter((b) => b.student_id === detailStudent.id)
      .sort((a, b) => b.semester - a.semester);
    const studentProofs = data.paymentProofs.filter((p) => p.student_id === detailStudent.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectStudent(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#146E22] hover:text-[#0F561A]"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Mahasiswa
          </button>
          <button
            type="button"
            onClick={() => openEditModal(detailStudent)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profil Mahasiswa
          </button>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-white border border-[#D5E4D7] rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EDF3EE]">
            <div>
              <h2 className="text-xl font-extrabold text-[#122B18]">{detailStudent.nama_lengkap}</h2>
              <p className="text-xs text-[#4A6350] mt-1 font-mono">
                NIM {detailStudent.nim} · {dept?.nama_jurusan || '-'} ({dept?.jenjang || 'S1'}) · Angkatan {detailStudent.angkatan}
              </p>
            </div>
            <StatusText status={detailStudent.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-5 text-xs">
            <div>
              <span className="text-[#4A6350] block">Fakultas</span>
              <span className="font-semibold text-[#122B18] mt-0.5 block">
                {faculty?.nama_fakultas || '-'}
              </span>
            </div>
            <div>
              <span className="text-[#4A6350] block">Semester Aktif</span>
              <span className="font-mono font-bold text-[#122B18] mt-0.5 block">
                Semester {detailStudent.semester_aktif}
              </span>
            </div>
            <div>
              <span className="text-[#4A6350] block">Email & No. HP</span>
              <span className="font-semibold text-[#122B18] mt-0.5 block">{detailStudent.email}</span>
              <span className="font-mono text-[#4A6350] block">{detailStudent.no_hp}</span>
            </div>
            <div>
              <span className="text-[#4A6350] block">Jenis Kelamin & Alamat</span>
              <span className="font-semibold text-[#122B18] mt-0.5 block">
                {detailStudent.jenis_kelamin}
              </span>
              <span className="text-[#4A6350] block">{detailStudent.alamat}</span>
            </div>
          </div>
        </div>

        {/* Riwayat KRS */}
        <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D5E4D7] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#146E22]" />
            <h3 className="text-sm font-bold text-[#122B18]">Riwayat Pengambilan KRS</h3>
          </div>
          {semestersTaken.length === 0 ? (
            <p className="p-6 text-xs text-[#4A6350]">Belum ada mata kuliah KRS tercatat untuk mahasiswa ini.</p>
          ) : (
            <div className="divide-y divide-[#D5E4D7]">
              {semestersTaken.map((sem) => {
                const items = studentEnrollments.filter((e) => e.semester_diambil === sem);
                const courses = items
                  .map((e) => data.courses.find((c) => c.id === e.course_id))
                  .filter(Boolean);
                const totalSks = courses.reduce((acc, c) => acc + (c?.sks || 0), 0);
                return (
                  <div key={sem} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-[#122B18]">
                        Semester {sem} · TA {items[0]?.tahun_akademik}
                      </p>
                      <span className="text-xs font-mono font-bold text-[#146E22] tabular-nums">
                        {courses.length} Mata Kuliah · {totalSks} SKS
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EDF3EE] text-[11px] text-[#4A6350]">
                            <th className="py-2 pr-3">Kode</th>
                            <th className="py-2 pr-3">Mata Kuliah</th>
                            <th className="py-2 pr-3 text-center">SKS</th>
                            <th className="py-2 pr-3">Dosen</th>
                            <th className="py-2">Jadwal & Ruang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2F6F2]">
                          {courses.map((c) =>
                            c ? (
                              <tr key={c.id}>
                                <td className="py-2 pr-3 font-mono font-semibold text-[#146E22]">{c.kode_mk}</td>
                                <td className="py-2 pr-3 font-medium text-[#122B18]">{c.nama_mk}</td>
                                <td className="py-2 pr-3 text-center font-mono">{c.sks}</td>
                                <td className="py-2 pr-3 text-[#4A6350]">{c.dosen_pengampu}</td>
                                <td className="py-2 text-[#4A6350] font-mono">
                                  {c.hari} {c.jam_mulai}–{c.jam_selesai} · {c.ruangan}
                                </td>
                              </tr>
                            ) : null
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Riwayat Pembayaran SPP */}
        <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D5E4D7] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#146E22]" />
            <h3 className="text-sm font-bold text-[#122B18]">Riwayat Tagihan & Bukti Pembayaran SPP</h3>
          </div>
          <div className="p-5 space-y-5">
            {studentBills.length === 0 ? (
              <p className="text-xs text-[#4A6350]">Belum ada tagihan SPP diterbitkan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D5E4D7] text-[11px] text-[#4A6350]">
                      <th className="py-2.5 pr-4">Semester / TA</th>
                      <th className="py-2.5 pr-4">Skema</th>
                      <th className="py-2.5 pr-4 text-right">Total Tagihan</th>
                      <th className="py-2.5 pr-4 text-right">Sudah Dibayar</th>
                      <th className="py-2.5 pr-4 text-right">Sisa</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF3EE]">
                    {studentBills.map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 pr-4 font-semibold text-[#122B18]">
                          Semester {b.semester} ({b.tahun_akademik})
                        </td>
                        <td className="py-2.5 pr-4 text-[#4A6350]">{b.skema_bayar}</td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{formatRupiah(b.total_tagihan)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-[#146E22] tabular-nums">{formatRupiah(b.total_terbayar)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-bold text-[#B91C1C] tabular-nums">
                          {formatRupiah(Math.max(0, b.total_tagihan - b.total_terbayar))}
                        </td>
                        <td className="py-2.5">
                          <StatusText status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {studentProofs.length > 0 && (
              <div className="pt-4 border-t border-[#EDF3EE]">
                <h4 className="text-xs font-bold text-[#122B18] mb-3">Riwayat Upload Bukti Transfer</h4>
                <div className="space-y-2">
                  {studentProofs.map((p) => {
                    const bank = data.bankAccounts.find((b) => b.id === p.bank_account_id);
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-3.5 rounded-lg bg-[#F7FAF7] border border-[#E2ECE4] text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-[#122B18] tabular-nums">
                            {formatRupiah(p.nominal_transfer)}
                          </span>
                          <span className="text-[#4A6350] ml-2">
                            · {formatDateID(p.tanggal_transfer)} · {bank?.nama_bank || 'Bank Kampus'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusText status={p.status_verifikasi} />
                          <button
                            type="button"
                            onClick={() => setPreviewProof(p)}
                            className="text-xs font-semibold text-[#146E22] hover:underline"
                          >
                            Lihat Bukti
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

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

        {renderModal()}
      </div>
    );
  }

  function renderModal() {
    if (!modalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
        <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="px-6 py-4 border-b border-[#D5E4D7] flex items-center justify-between bg-[#F7FAF7]">
            <h3 className="text-base font-bold text-[#122B18]">
              {form.id ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-1 text-[#4A6350] hover:text-[#122B18]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">NIM *</label>
                <input
                  required
                  value={form.nim || ''}
                  onChange={(e) => setForm({ ...form, nim: e.target.value })}
                  placeholder="Contoh: 2026010001"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={form.nama_lengkap || ''}
                  onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                  placeholder="Nama lengkap mahasiswa"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nama@staialfurqan.ac.id"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">No. HP / WhatsApp *</label>
                <input
                  required
                  value={form.no_hp || ''}
                  onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Jenis Kelamin</label>
                <select
                  value={form.jenis_kelamin || 'Laki-laki'}
                  onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value as JenisKelamin })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Status Mahasiswa</label>
                <select
                  value={form.status || 'Aktif'}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StudentStatus })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Cuti">Cuti</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Fakultas *</label>
                <select
                  required
                  value={form.faculty_id || ''}
                  onChange={(e) => {
                    const facId = e.target.value;
                    const firstDept = data.departments.find((d) => d.faculty_id === facId);
                    setForm({ ...form, faculty_id: facId, department_id: firstDept?.id || '' });
                  }}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  <option value="">Pilih Fakultas</option>
                  {data.faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nama_fakultas}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Jurusan / Prodi *</label>
                <select
                  required
                  value={form.department_id || ''}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white focus:outline-none focus:border-[#146E22]"
                >
                  <option value="">Pilih Jurusan</option>
                  {availableDeptsForForm.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama_jurusan} ({d.jenjang})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Angkatan *</label>
                <input
                  type="number"
                  min={2015}
                  max={2035}
                  required
                  value={form.angkatan || 2026}
                  onChange={(e) => setForm({ ...form, angkatan: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#122B18] mb-1">Semester Aktif *</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  required
                  value={form.semester_aktif || 1}
                  onChange={(e) => setForm({ ...form, semester_aktif: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-[#122B18] mb-1">Alamat Domisili</label>
              <textarea
                rows={2}
                value={form.alamat || ''}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Alamat lengkap di Makassar / Sulawesi Selatan"
                className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EDF3EE]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 font-semibold text-[#4A6350] hover:bg-[#F7FAF7] border border-[#D5E4D7] rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Direktori Data Mahasiswa</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">
              Kelola biodata induk, status akademik, riwayat KRS, dan pembayaran seluruh mahasiswa
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Mahasiswa
          </button>
        </div>

        {/* Search & Filters */}
        <div className="px-5 py-3.5 bg-[#F7FAF7] border-b border-[#D5E4D7] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#4A6350] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama mahasiswa atau NIM..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
          >
            <option value="ALL">Semua Jurusan</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama_jurusan}
              </option>
            ))}
          </select>
          <select
            value={filterAngkatan}
            onChange={(e) => setFilterAngkatan(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
          >
            <option value="ALL">Semua Angkatan</option>
            {angkatanOptions.map((a) => (
              <option key={a} value={String(a)}>
                Angkatan {a}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Cuti">Cuti</option>
            <option value="Lulus">Lulus</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Jurusan / Fakultas</th>
                <th className="py-3 px-4 text-center">Angkatan / Sem</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE] text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#4A6350]">
                    Tidak ada mahasiswa yang cocok dengan pencarian atau filter Anda.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const dept = data.departments.find((d) => d.id === s.department_id);
                  const fac = data.faculties.find((f) => f.id === s.faculty_id);
                  return (
                    <tr key={s.id} className="hover:bg-[#F7FAF7]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#146E22] tabular-nums">
                        {s.nim}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#122B18]">{s.nama_lengkap}</p>
                        <p className="text-[11px] text-[#4A6350]">{s.email} · {s.no_hp}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#122B18]">{dept?.nama_jurusan || '-'}</p>
                        <p className="text-[11px] text-[#4A6350]">{fac?.nama_fakultas || '-'}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-[#214228]">
                        {s.angkatan} / Sem {s.semester_aktif}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={s.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(s.id)}
                            className="p-1.5 text-[#146E22] hover:bg-[#ECF4ED] rounded-md"
                            title="Lihat Detail Mahasiswa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-[#7B6110] hover:bg-[#FBF5DF] rounded-md"
                            title="Edit Mahasiswa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(s)}
                            className="p-1.5 text-[#B91C1C] hover:bg-red-50 rounded-md"
                            title="Hapus Mahasiswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {renderModal()}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#122B18]">Hapus Data Mahasiswa?</h3>
            <p className="text-xs text-[#4A6350] mt-2 leading-relaxed">
              Anda yakin ingin menghapus <strong>{confirmDelete.nama_lengkap}</strong> (NIM{' '}
              <span className="font-mono">{confirmDelete.nim}</span>)? Data KRS dan tagihan terkait akan ikut terhapus.
            </p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg hover:bg-[#F7FAF7]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-red-800 rounded-lg"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
