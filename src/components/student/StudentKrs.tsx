import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, History, Printer, Save } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { DEMO_STUDENT_ID } from '../../data/seedData';
import {
  CURRENT_ACADEMIC_YEAR,
  detectScheduleConflicts,
  MAX_KRS_SKS,
} from '../../utils/formatters';
import { OfficialLetterhead, OfficialSignatureFooter } from '../OfficialLetterhead';

export const StudentKrs: React.FC = () => {
  const { user, data, saveStudentKrs, showToast } = useSiakad();
  const studentId = user?.student_id || DEMO_STUDENT_ID;

  const student = useMemo(
    () => data.students.find((s) => s.id === studentId) || data.students[0],
    [data.students, studentId]
  );
  const faculty = data.faculties.find((f) => f.id === student?.faculty_id);
  const department = data.departments.find((d) => d.id === student?.department_id);

  const [activeTab, setActiveTab] = useState<'pengisian' | 'riwayat'>('pengisian');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Courses offered for student's department & active semester (active only)
  const offeredCourses = useMemo(() => {
    if (!student) return [];
    return data.courses
      .filter(
        (c) =>
          c.is_active &&
          c.department_id === student.department_id &&
          c.semester === student.semester_aktif
      )
      .sort((a, b) => a.kode_mk.localeCompare(b.kode_mk));
  }, [data.courses, student]);

  // Sync saved enrollments into checkbox selection
  useEffect(() => {
    if (!student) return;
    const saved = data.enrollments
      .filter((e) => e.student_id === student.id && e.semester_diambil === student.semester_aktif)
      .map((e) => e.course_id);
    setSelectedIds(saved);
  }, [data.enrollments, student]);

  const selectedCourses = useMemo(
    () => offeredCourses.filter((c) => selectedIds.includes(c.id)),
    [offeredCourses, selectedIds]
  );

  const totalSks = selectedCourses.reduce((sum, c) => sum + c.sks, 0);
  const exceedsSks = totalSks > MAX_KRS_SKS;
  const conflicts = useMemo(() => detectScheduleConflicts(selectedCourses), [selectedCourses]);
  const conflictingIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of conflicts) {
      s.add(c.courseA.id);
      s.add(c.courseB.id);
    }
    return s;
  }, [conflicts]);

  const toggleCourse = (courseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSaveKrs = async () => {
    if (exceedsSks) {
      showToast(`Total SKS (${totalSks}) melebihi batas maksimal ${MAX_KRS_SKS} SKS.`, 'error');
      return;
    }
    if (conflicts.length > 0) {
      showToast('Masih terdapat bentrok jadwal kuliah. Mohon selesaikan terlebih dahulu.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveStudentKrs(selectedIds);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan KRS.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Previous semesters history
  const historyGroups = useMemo(() => {
    if (!student) return [];
    const past = data.enrollments.filter(
      (e) => e.student_id === student.id && e.semester_diambil < student.semester_aktif
    );
    const sems = Array.from(new Set(past.map((e) => e.semester_diambil))).sort((a, b) => b - a);
    return sems.map((sem) => {
      const enrs = past.filter((e) => e.semester_diambil === sem);
      const courses = enrs
        .map((e) => data.courses.find((c) => c.id === e.course_id))
        .filter(Boolean);
      const sks = courses.reduce((acc, c) => acc + (c?.sks || 0), 0);
      return {
        semester: sem,
        tahun_akademik: enrs[0]?.tahun_akademik || '-',
        courses,
        sks,
      };
    });
  }, [data.enrollments, data.courses, student]);

  if (!student) return null;

  return (
    <div className="space-y-5">
      {/* Official Print Header for KRS */}
      <OfficialLetterhead
        documentTitle="KARTU RENCANA STUDI (KRS) MAHASISWA"
        subtitle={`Semester ${student.semester_aktif} · Tahun Akademik ${CURRENT_ACADEMIC_YEAR}`}
      />
      <div className="print-only mb-4 text-xs grid grid-cols-2 gap-2 border border-[#D5E4D7] p-3 rounded">
        <div>
          <p><strong>Nama:</strong> {student.nama_lengkap}</p>
          <p><strong>NIM:</strong> {student.nim}</p>
        </div>
        <div>
          <p><strong>Program Studi:</strong> {department?.nama_jurusan} ({department?.jenjang})</p>
          <p><strong>Fakultas:</strong> {faculty?.nama_fakultas}</p>
        </div>
      </div>

      {/* Header & Tabs */}
      <div className="bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-1 p-1 bg-[#ECF4ED] rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('pengisian')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'pengisian'
                ? 'bg-white text-[#146E22] shadow-xs'
                : 'text-[#4A6350] hover:text-[#122B18]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Pengisian KRS Semester {student.semester_aktif}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'riwayat'
                ? 'bg-white text-[#146E22] shadow-xs'
                : 'text-[#4A6350] hover:text-[#122B18]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Semester ({historyGroups.length})
          </button>
        </div>

        {activeTab === 'pengisian' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#122B18] bg-[#F7FAF7] hover:bg-[#ECF4ED] border border-[#C8DBC9] rounded-lg whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#146E22]" />
              Cetak KRS
            </button>
            <button
              type="button"
              disabled={saving || exceedsSks || conflicts.length > 0}
              onClick={() => void handleSaveKrs()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan Pilihan KRS'}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'pengisian' ? (
        <>
          {/* SKS Bar & Conflict Validation Alerts */}
          <div className="bg-white border border-[#D5E4D7] rounded-xl p-5 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-[#122B18]">Kalkulasi SKS Semester {student.semester_aktif}</span>
                <span className="text-[#4A6350] ml-2">
                  ({selectedCourses.length} mata kuliah dipilih dari {offeredCourses.length} tersedia)
                </span>
              </div>
              <span
                className={`font-mono font-extrabold text-sm tabular-nums ${
                  exceedsSks ? 'text-[#B91C1C]' : 'text-[#146E22]'
                }`}
              >
                {totalSks} / {MAX_KRS_SKS} SKS
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#ECF4ED] overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  exceedsSks ? 'bg-[#B91C1C]' : 'bg-[#146E22]'
                }`}
                style={{ width: `${Math.min(100, (totalSks / MAX_KRS_SKS) * 100)}%` }}
              />
            </div>

            {exceedsSks && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#B91C1C]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Total SKS yang Anda pilih ({totalSks} SKS) melebihi batas maksimal {MAX_KRS_SKS} SKS. Kurangi pilihan mata kuliah untuk dapat menyimpan KRS.
                </span>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-1.5 text-xs text-[#B91C1C]">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Terdeteksi Bentrok Jadwal Kuliah ({conflicts.length})
                </div>
                {conflicts.map((conf, idx) => (
                  <p key={idx} className="pl-6">
                    • {conf.reason}
                  </p>
                ))}
              </div>
            )}

            {!exceedsSks && conflicts.length === 0 && selectedCourses.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#15803D] font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Jadwal kuliah aman tanpa bentrok dan memenuhi batas maksimal {MAX_KRS_SKS} SKS.
              </div>
            )}
          </div>

          {/* Course Selection Table */}
          <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden print-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                    <th className="py-3 px-4 w-12 text-center no-print">Pilih</th>
                    <th className="py-3 px-4">Kode MK</th>
                    <th className="py-3 px-4">Nama Mata Kuliah</th>
                    <th className="py-3 px-4 text-center">SKS</th>
                    <th className="py-3 px-4">Dosen Pengampu</th>
                    <th className="py-3 px-4">Jadwal</th>
                    <th className="py-3 px-4">Ruangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF3EE]">
                  {offeredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#4A6350]">
                        Belum ada mata kuliah aktif yang dibuka oleh Admin untuk {department?.nama_jurusan} Semester {student.semester_aktif}.
                      </td>
                    </tr>
                  ) : (
                    offeredCourses.map((c) => {
                      const checked = selectedIds.includes(c.id);
                      const isConflicting = conflictingIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleCourse(c.id)}
                          className={`cursor-pointer transition-colors ${
                            !checked ? 'no-print' : ''
                          } ${
                            isConflicting
                              ? 'bg-red-50/75 hover:bg-red-50'
                              : checked
                              ? 'bg-[#ECF4ED]/55 hover:bg-[#ECF4ED]/80'
                              : 'hover:bg-[#F7FAF7]'
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCourse(c.id)}
                              className="w-4 h-4 rounded border-[#C8DBC9] text-[#146E22] focus:ring-[#146E22] cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#146E22]">{c.kode_mk}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#122B18]">{c.nama_mk}</p>
                            {isConflicting && (
                              <span className="text-[11px] font-semibold text-[#B91C1C]">
                                Jadwal bentrok dengan mata kuliah terpilih lain
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold tabular-nums">{c.sks}</td>
                          <td className="py-3.5 px-4 text-[#214228]">{c.dosen_pengampu}</td>
                          <td className="py-3.5 px-4 font-mono text-[#122B18]">
                            {c.hari}, {c.jam_mulai}–{c.jam_selesai}
                          </td>
                          <td className="py-3.5 px-4 text-[#4A6350]">{c.ruangan}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D5E4D7] bg-[#ECF4ED]/60 font-bold text-[#122B18]">
                    <td className="py-3 px-4 no-print" />
                    <td colSpan={2} className="py-3 px-4">
                      Total Mata Kuliah Dipilih ({selectedCourses.length} MK)
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">{totalSks} SKS</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <OfficialSignatureFooter
            signerTitle="Dosen Penasihat Akademik / Ketua Program Studi"
            signerName="Dr. H. Muhammad Ruslan, M.Pd.I."
          />
        </>
      ) : (
        /* Riwayat Semester Tab */
        <div className="space-y-4">
          {historyGroups.length === 0 ? (
            <div className="bg-white border border-[#D5E4D7] rounded-xl p-10 text-center text-xs text-[#4A6350]">
              Belum ada arsip riwayat KRS dari semester sebelumnya.
            </div>
          ) : (
            historyGroups.map((grp) => (
              <div key={grp.semester} className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#122B18]">Semester {grp.semester}</h3>
                    <p className="text-[11px] text-[#4A6350]">Tahun Akademik {grp.tahun_akademik}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#146E22] tabular-nums">
                    {grp.courses.length} MK · {grp.sks} SKS
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EDF3EE] text-[11px] text-[#4A6350]">
                        <th className="py-2.5 px-4">Kode MK</th>
                        <th className="py-2.5 px-4">Mata Kuliah</th>
                        <th className="py-2.5 px-4 text-center">SKS</th>
                        <th className="py-2.5 px-4">Dosen Pengampu</th>
                        <th className="py-2.5 px-4">Jadwal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F6F2]">
                      {grp.courses.map((c) =>
                        c ? (
                          <tr key={c.id}>
                            <td className="py-2.5 px-4 font-mono font-bold text-[#146E22]">{c.kode_mk}</td>
                            <td className="py-2.5 px-4 font-medium text-[#122B18]">{c.nama_mk}</td>
                            <td className="py-2.5 px-4 text-center font-mono tabular-nums">{c.sks}</td>
                            <td className="py-2.5 px-4 text-[#4A6350]">{c.dosen_pengampu}</td>
                            <td className="py-2.5 px-4 font-mono text-[#4A6350]">
                              {c.hari}, {c.jam_mulai}–{c.jam_selesai}
                            </td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
