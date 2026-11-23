import React, { useEffect, useMemo, useState } from 'react';
import { Save, User } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { DEMO_STUDENT_ID } from '../../data/seedData';
import { StatusText } from '../StatusText';

export const StudentProfile: React.FC = () => {
  const { user, data, updateStudentContact, showToast } = useSiakad();
  const studentId = user?.student_id || DEMO_STUDENT_ID;

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId) || data.students[0],
    [data.students, studentId]
  );
  const faculty = data.faculties.find((f) => f.id === student?.faculty_id);
  const department = data.departments.find((d) => d.id === student?.department_id);

  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setNoHp(student.no_hp);
      setAlamat(student.alamat);
    }
  }, [student]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateStudentContact(noHp, alamat);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui kontak.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!student) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-6 bg-[#ECF4ED]/70 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#146E22] text-white flex items-center justify-center text-lg font-extrabold shrink-0">
              {student.nama_lengkap
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#122B18]">{student.nama_lengkap}</h2>
              <p className="font-mono text-xs text-[#4A6350] mt-0.5">
                NIM {student.nim} · {department?.nama_jurusan} ({department?.jenjang})
              </p>
            </div>
          </div>
          <StatusText status={student.status} />
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          <div>
            <span className="text-[#4A6350] block">Fakultas</span>
            <span className="font-semibold text-[#122B18] mt-1 block">{faculty?.nama_fakultas || '-'}</span>
          </div>
          <div>
            <span className="text-[#4A6350] block">Program Studi</span>
            <span className="font-semibold text-[#122B18] mt-1 block">{department?.nama_jurusan || '-'}</span>
          </div>
          <div>
            <span className="text-[#4A6350] block">Angkatan / Semester Aktif</span>
            <span className="font-mono font-bold text-[#122B18] mt-1 block">
              {student.angkatan} / Semester {student.semester_aktif}
            </span>
          </div>
          <div>
            <span className="text-[#4A6350] block">Email Akademik</span>
            <span className="font-semibold text-[#122B18] mt-1 block">{student.email}</span>
          </div>
          <div>
            <span className="text-[#4A6350] block">Jenis Kelamin</span>
            <span className="font-semibold text-[#122B18] mt-1 block">{student.jenis_kelamin}</span>
          </div>
          <div>
            <span className="text-[#4A6350] block">Dekan Fakultas</span>
            <span className="font-semibold text-[#122B18] mt-1 block">{faculty?.dekan || '-'}</span>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#D5E4D7] flex items-center gap-2">
          <User className="w-4 h-4 text-[#146E22]" />
          <div>
            <h3 className="text-sm font-bold text-[#122B18]">Perbarui Informasi Kontak Dasar</h3>
            <p className="text-xs text-[#4A6350]">
              Untuk perubahan data akademik (NIM, Jurusan, Nama), silakan hubungi Bagian Akademik
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label htmlFor="profile-hp" className="block font-bold text-[#122B18] mb-1.5">
              Nomor HP / WhatsApp Aktif
            </label>
            <input
              id="profile-hp"
              required
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full max-w-md px-3.5 py-2.5 border border-[#C8DBC9] rounded-lg font-mono focus:outline-none focus:border-[#146E22]"
            />
          </div>
          <div>
            <label htmlFor="profile-alamat" className="block font-bold text-[#122B18] mb-1.5">
              Alamat Domisili
            </label>
            <textarea
              id="profile-alamat"
              rows={3}
              required
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan Kontak'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
