import { buildSeedDataset, DEMO_ADMIN_UID, DEMO_STUDENT_ID, DEMO_STUDENT_UID } from '../data/seedData';
import type {
  BankAccount,
  Course,
  Department,
  Faculty,
  InstallmentSchedule,
  PaymentProof,
  SessionUser,
  SiakadDataset,
  Student,
  TuitionBill,
  UserRole,
} from '../types/siakad';
import {
  CURRENT_ACADEMIC_YEAR,
  detectScheduleConflicts,
  formatRupiah,
  generateId,
  MAX_KRS_SKS,
} from '../utils/formatters';

const STORAGE_KEY = 'siakad_al_furqan_local_demo_v1';

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let memoryDb: SiakadDataset | null = null;

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSampleReceiptDataUrl(params: {
  proofId?: string;
  bankTitle?: string;
  rekNo?: string;
  atasNama?: string;
  studentName?: string;
  studentNim?: string;
  nominal?: number;
  tanggal?: string;
  catatan?: string;
}): string {
  const proofId = params.proofId || 'proof-sample';
  const isRejectedSample = proofId === 'proof-09';
  const bankTitle = escapeXml(params.bankTitle || 'Bank Syariah Indonesia (BSI)');
  const rekNo = escapeXml(params.rekNo || '7189452011');
  const atasNama = escapeXml(params.atasNama || 'STAI AL FURQAN MAKASSAR');
  const studentName = escapeXml(params.studentName || 'Mahasiswa STAI AL FURQAN');
  const studentNim = escapeXml(params.studentNim || '2024010001');
  const nominal = escapeXml(formatRupiah(params.nominal ?? 850000));
  const tgl = escapeXml(params.tanggal || '2026-11-19');
  const refNo = escapeXml(`TRF-${proofId.toUpperCase()}-88412`);
  const note = escapeXml(params.catatan || 'Pembayaran SPP Semester Aktif');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="820" viewBox="0 0 640 820">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#146E22"/>
      <stop offset="100%" stop-color="#0F4D19"/>
    </linearGradient>
    ${isRejectedSample ? '<filter id="blur"><feGaussianBlur stdDeviation="1.4"/></filter>' : ''}
  </defs>
  <rect width="640" height="820" fill="#F2F6F2"/>
  <g ${isRejectedSample ? 'filter="url(#blur)"' : ''}>
    <rect x="40" y="36" width="560" height="748" rx="18" fill="#FFFFFF" stroke="#D5E4D7" stroke-width="2"/>
    <rect x="40" y="36" width="560" height="128" rx="18" fill="url(#hdr)"/>
    <rect x="40" y="130" width="560" height="34" fill="url(#hdr)"/>
    <text x="320" y="88" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="700">BUKTI TRANSFER ELEKTRONIK</text>
    <text x="320" y="118" text-anchor="middle" fill="#E9D67A" font-family="sans-serif" font-size="15" font-weight="600">${bankTitle}</text>
    <text x="320" y="146" text-anchor="middle" fill="#D4EAD7" font-family="monospace" font-size="13">No. Referensi: ${refNo}</text>

    <circle cx="320" cy="218" r="28" fill="#ECF7EE" stroke="#146E22" stroke-width="2.5"/>
    <path d="M308 218 L317 227 L334 209" fill="none" stroke="#146E22" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="320" y="272" text-anchor="middle" fill="#122B18" font-family="sans-serif" font-size="18" font-weight="700">Transaksi Berhasil</text>
    <text x="320" y="308" text-anchor="middle" fill="#146E22" font-family="monospace" font-size="30" font-weight="700">${nominal}</text>

    <line x1="80" y1="336" x2="560" y2="336" stroke="#D5E4D7" stroke-dasharray="6 4" stroke-width="1.5"/>

    <text x="80" y="376" fill="#4A6350" font-family="sans-serif" font-size="14">Tanggal Transaksi</text>
    <text x="560" y="376" text-anchor="end" fill="#122B18" font-family="monospace" font-size="14" font-weight="600">${tgl}</text>

    <text x="80" y="416" fill="#4A6350" font-family="sans-serif" font-size="14">Pengirim (Mahasiswa)</text>
    <text x="560" y="416" text-anchor="end" fill="#122B18" font-family="sans-serif" font-size="14" font-weight="600">${studentName}</text>

    <text x="80" y="456" fill="#4A6350" font-family="sans-serif" font-size="14">NIM Mahasiswa</text>
    <text x="560" y="456" text-anchor="end" fill="#122B18" font-family="monospace" font-size="14" font-weight="600">${studentNim}</text>

    <line x1="80" y1="484" x2="560" y2="484" stroke="#E5EFE7" stroke-width="1.5"/>

    <text x="80" y="524" fill="#4A6350" font-family="sans-serif" font-size="14">Rekening Tujuan</text>
    <text x="560" y="524" text-anchor="end" fill="#122B18" font-family="sans-serif" font-size="14" font-weight="700">${atasNama}</text>

    <text x="80" y="564" fill="#4A6350" font-family="sans-serif" font-size="14">Nomor Rekening</text>
    <text x="560" y="564" text-anchor="end" fill="#122B18" font-family="monospace" font-size="15" font-weight="700">${rekNo}</text>

    <text x="80" y="604" fill="#4A6350" font-family="sans-serif" font-size="14">Berita Transfer</text>
    <text x="560" y="604" text-anchor="end" fill="#122B18" font-family="sans-serif" font-size="13">${note.slice(0, 48)}</text>

    <rect x="80" y="646" width="480" height="86" rx="10" fill="#FBF5DF" stroke="#E6D28B" stroke-width="1.2"/>
    <text x="320" y="680" text-anchor="middle" fill="#6F560C" font-family="sans-serif" font-size="13" font-weight="700">STAI AL FURQAN MAKASSAR — PORTAL KEUANGAN SPP</text>
    <text x="320" y="706" text-anchor="middle" fill="#7B6520" font-family="sans-serif" font-size="12">Simpan resi elektronik ini sebagai bukti sah pembayaran akademik.</text>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hydrateReceiptUrls(dataset: SiakadDataset): SiakadDataset {
  const paymentProofs = dataset.paymentProofs.map((proof) => {
    if (!proof.file_url.startsWith('/api/sample-receipt/')) {
      return proof;
    }
    const student = dataset.students.find((s) => s.id === proof.student_id);
    const bank = dataset.bankAccounts.find((b) => b.id === proof.bank_account_id);
    return {
      ...proof,
      file_url: buildSampleReceiptDataUrl({
        proofId: proof.id,
        bankTitle: bank?.nama_bank,
        rekNo: bank?.nomor_rekening,
        atasNama: bank?.atas_nama,
        studentName: student?.nama_lengkap,
        studentNim: student?.nim,
        nominal: proof.nominal_transfer,
        tanggal: proof.tanggal_transfer,
        catatan: proof.catatan,
      }),
    };
  });
  return { ...dataset, paymentProofs };
}

function loadLocalDb(): SiakadDataset {
  if (memoryDb) return memoryDb;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SiakadDataset;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.faculties)) {
        memoryDb = hydrateReceiptUrls(parsed);
        return memoryDb;
      }
    }
  } catch {
    // Ignore storage read errors and fall back to fresh seed
  }
  memoryDb = hydrateReceiptUrls(buildSeedDataset(DEMO_STUDENT_UID));
  persistLocalDb(memoryDb);
  return memoryDb;
}

function persistLocalDb(db: SiakadDataset): SiakadDataset {
  memoryDb = db;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore quota errors in private browsing mode
  }
  return db;
}

export function localLogin(params: {
  role?: UserRole;
  email?: string;
  password?: string;
}): SessionUser {
  const db = loadLocalDb();
  let resolvedRole: UserRole | null = null;

  if (params.role === 'admin' || params.role === 'mahasiswa') {
    resolvedRole = params.role;
  } else if (typeof params.email === 'string' && typeof params.password === 'string') {
    const normalized = params.email.trim().toLowerCase();
    if (normalized === 'admin@staialfurqan.ac.id' && params.password === 'admin123') {
      resolvedRole = 'admin';
    } else if (
      (normalized === 'fauzan.ramadhan@staialfurqan.ac.id' || normalized === '2024010001') &&
      params.password === 'mahasiswa123'
    ) {
      resolvedRole = 'mahasiswa';
    } else {
      throw new Error(
        'Email/NIM atau kata sandi tidak sesuai. Gunakan tombol Quick Login atau kredensial demo di bawah.'
      );
    }
  }

  if (!resolvedRole) {
    throw new Error('Peran login tidak valid.');
  }

  const demoStudent = db.students.find((s) => s.id === DEMO_STUDENT_ID) || db.students[0];

  if (resolvedRole === 'admin') {
    return {
      uid: DEMO_ADMIN_UID,
      role: 'admin',
      nama_lengkap: 'Drs. H. Abd. Rahman, M.Pd. (Admin SIAKAD)',
      email: 'admin@staialfurqan.ac.id',
      mode: 'demo',
      localDemo: true,
    };
  }

  return {
    uid: DEMO_STUDENT_UID,
    role: 'mahasiswa',
    student_id: demoStudent?.id || DEMO_STUDENT_ID,
    nama_lengkap: demoStudent?.nama_lengkap || 'Ahmad Fauzan Ramadhan',
    email: demoStudent?.email || 'fauzan.ramadhan@staialfurqan.ac.id',
    mode: 'demo',
    localDemo: true,
  };
}

export function localGetScopedDataset(role: UserRole, studentId = DEMO_STUDENT_ID): SiakadDataset {
  const db = loadLocalDb();
  if (role === 'admin') {
    return { ...db };
  }
  const student = db.students.find((s) => s.id === studentId);
  return {
    faculties: db.faculties,
    departments: db.departments,
    students: student ? [student] : [],
    courses: db.courses.filter((c) => c.is_active),
    enrollments: db.enrollments.filter((e) => e.student_id === studentId),
    bankAccounts: db.bankAccounts.filter((b) => b.is_active),
    tuitionBills: db.tuitionBills.filter((b) => b.student_id === studentId),
    installments: db.installments.filter((i) => i.student_id === studentId),
    paymentProofs: db.paymentProofs.filter((p) => p.student_id === studentId),
  };
}

export function readFileAsProofDataUrl(
  file: File
): Promise<{ file_url: string; file_name: string; file_type: string }> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      reject(new Error('Format file harus JPG, PNG, atau PDF.'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('Ukuran file maksimal 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        file_url: String(reader.result || ''),
        file_name: file.name.slice(0, 180),
        file_type: file.type,
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas bukti pembayaran.'));
    reader.readAsDataURL(file);
  });
}

// --- Admin Local Mutations ---

export function localSaveFaculty(payload: Partial<Faculty>): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (!payload.kode_fakultas || !payload.nama_fakultas || !payload.dekan) {
    throw new Error('Kode fakultas, nama fakultas, dan dekan wajib diisi.');
  }
  if (payload.id) {
    db.faculties = db.faculties.map((f) =>
      f.id === payload.id
        ? {
            ...f,
            kode_fakultas: payload.kode_fakultas!.trim(),
            nama_fakultas: payload.nama_fakultas!.trim(),
            dekan: payload.dekan!.trim(),
          }
        : f
    );
  } else {
    db.faculties = [
      ...db.faculties,
      {
        id: generateId('fac'),
        kode_fakultas: payload.kode_fakultas.trim(),
        nama_fakultas: payload.nama_fakultas.trim(),
        dekan: payload.dekan.trim(),
        is_public: true,
      },
    ];
  }
  return persistLocalDb(db);
}

export function localDeleteFaculty(id: string): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (db.departments.some((d) => d.faculty_id === id)) {
    throw new Error('Fakultas masih memiliki jurusan. Hapus jurusan terkait terlebih dahulu.');
  }
  db.faculties = db.faculties.filter((f) => f.id !== id);
  return persistLocalDb(db);
}

export function localSaveDepartment(payload: Partial<Department>): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (!payload.faculty_id || !payload.kode_jurusan || !payload.nama_jurusan) {
    throw new Error('Fakultas, kode jurusan, dan nama jurusan wajib diisi.');
  }
  const spp = Number(payload.biaya_spp_default) || 0;
  if (payload.id) {
    db.departments = db.departments.map((d) =>
      d.id === payload.id
        ? {
            ...d,
            faculty_id: payload.faculty_id!,
            kode_jurusan: payload.kode_jurusan!.trim(),
            nama_jurusan: payload.nama_jurusan!.trim(),
            jenjang: payload.jenjang || 'S1',
            biaya_spp_default: spp,
          }
        : d
    );
  } else {
    db.departments = [
      ...db.departments,
      {
        id: generateId('dept'),
        faculty_id: payload.faculty_id,
        kode_jurusan: payload.kode_jurusan.trim(),
        nama_jurusan: payload.nama_jurusan.trim(),
        jenjang: payload.jenjang || 'S1',
        biaya_spp_default: spp,
        is_public: true,
      },
    ];
  }
  return persistLocalDb(db);
}

export function localDeleteDepartment(id: string): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (db.students.some((s) => s.department_id === id)) {
    throw new Error('Jurusan masih memiliki data mahasiswa terdaftar.');
  }
  db.departments = db.departments.filter((d) => d.id !== id);
  db.courses = db.courses.filter((c) => c.department_id !== id);
  return persistLocalDb(db);
}

export function localSaveStudent(payload: Partial<Student>): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (!payload.nim || !payload.nama_lengkap || !payload.faculty_id || !payload.department_id) {
    throw new Error('NIM, Nama Lengkap, Fakultas, dan Jurusan wajib diisi.');
  }
  const duplicateNim = db.students.some(
    (s) => s.nim.toLowerCase() === payload.nim!.trim().toLowerCase() && s.id !== payload.id
  );
  if (duplicateNim) {
    throw new Error(`NIM ${payload.nim} sudah terdaftar pada mahasiswa lain.`);
  }

  if (payload.id) {
    db.students = db.students.map((s) =>
      s.id === payload.id
        ? {
            ...s,
            nim: payload.nim!.trim(),
            nama_lengkap: payload.nama_lengkap!.trim(),
            email: (payload.email || s.email).trim(),
            no_hp: (payload.no_hp || '').trim(),
            jenis_kelamin: payload.jenis_kelamin || s.jenis_kelamin,
            alamat: (payload.alamat || '').trim(),
            faculty_id: payload.faculty_id!,
            department_id: payload.department_id!,
            angkatan: Number(payload.angkatan) || s.angkatan,
            semester_aktif: Number(payload.semester_aktif) || s.semester_aktif,
            status: payload.status || s.status,
          }
        : s
    );
  } else {
    const newId = generateId('std');
    db.students = [
      {
        id: newId,
        user_id: `uid-${newId}`,
        nim: payload.nim.trim(),
        nama_lengkap: payload.nama_lengkap.trim(),
        email: (payload.email || `${payload.nim.trim()}@staialfurqan.ac.id`).trim(),
        no_hp: (payload.no_hp || '-').trim(),
        jenis_kelamin: payload.jenis_kelamin || 'Laki-laki',
        alamat: (payload.alamat || 'Makassar').trim(),
        faculty_id: payload.faculty_id,
        department_id: payload.department_id,
        angkatan: Number(payload.angkatan) || 2026,
        semester_aktif: Number(payload.semester_aktif) || 1,
        status: payload.status || 'Aktif',
      },
      ...db.students,
    ];
  }
  return persistLocalDb(db);
}

export function localDeleteStudent(id: string): SiakadDataset {
  const db = { ...loadLocalDb() };
  const billIds = new Set(db.tuitionBills.filter((b) => b.student_id === id).map((b) => b.id));
  db.students = db.students.filter((s) => s.id !== id);
  db.enrollments = db.enrollments.filter((e) => e.student_id !== id);
  db.tuitionBills = db.tuitionBills.filter((b) => b.student_id !== id);
  db.installments = db.installments.filter((i) => !billIds.has(i.tuition_bill_id));
  db.paymentProofs = db.paymentProofs.filter((p) => p.student_id !== id);
  return persistLocalDb(db);
}

export function localSaveCourse(payload: Partial<Course>): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (!payload.department_id || !payload.kode_mk || !payload.nama_mk) {
    throw new Error('Jurusan, Kode MK, dan Nama Mata Kuliah wajib diisi.');
  }
  if (payload.id) {
    db.courses = db.courses.map((c) =>
      c.id === payload.id
        ? {
            ...c,
            department_id: payload.department_id!,
            kode_mk: payload.kode_mk!.trim(),
            nama_mk: payload.nama_mk!.trim(),
            sks: Number(payload.sks) || c.sks,
            semester: Number(payload.semester) || c.semester,
            dosen_pengampu: (payload.dosen_pengampu || c.dosen_pengampu).trim(),
            hari: payload.hari || c.hari,
            jam_mulai: payload.jam_mulai || c.jam_mulai,
            jam_selesai: payload.jam_selesai || c.jam_selesai,
            ruangan: (payload.ruangan || c.ruangan).trim(),
            is_active: payload.is_active ?? c.is_active,
          }
        : c
    );
  } else {
    db.courses = [
      {
        id: generateId('mk'),
        department_id: payload.department_id,
        kode_mk: payload.kode_mk.trim(),
        nama_mk: payload.nama_mk.trim(),
        sks: Number(payload.sks) || 3,
        semester: Number(payload.semester) || 1,
        dosen_pengampu: (payload.dosen_pengampu || 'Dosen Tetap').trim(),
        hari: payload.hari || 'Senin',
        jam_mulai: payload.jam_mulai || '08:00',
        jam_selesai: payload.jam_selesai || '10:30',
        ruangan: (payload.ruangan || 'R. 101').trim(),
        is_active: payload.is_active ?? true,
      },
      ...db.courses,
    ];
  }
  return persistLocalDb(db);
}

export function localDeleteCourse(id: string): SiakadDataset {
  const db = { ...loadLocalDb() };
  db.courses = db.courses.filter((c) => c.id !== id);
  db.enrollments = db.enrollments.filter((e) => e.course_id !== id);
  return persistLocalDb(db);
}

export function localSaveBankAccount(payload: Partial<BankAccount>): SiakadDataset {
  const db = { ...loadLocalDb() };
  if (!payload.nama_bank || !payload.nomor_rekening || !payload.atas_nama) {
    throw new Error('Nama bank, nomor rekening, dan atas nama wajib diisi.');
  }
  if (payload.id) {
    db.bankAccounts = db.bankAccounts.map((b) =>
      b.id === payload.id
        ? {
            ...b,
            nama_bank: payload.nama_bank!.trim(),
            nomor_rekening: payload.nomor_rekening!.trim(),
            atas_nama: payload.atas_nama!.trim(),
            keterangan: (payload.keterangan || '').trim(),
            is_active: payload.is_active ?? b.is_active,
          }
        : b
    );
  } else {
    db.bankAccounts = [
      ...db.bankAccounts,
      {
        id: generateId('bank'),
        nama_bank: payload.nama_bank.trim(),
        nomor_rekening: payload.nomor_rekening.trim(),
        atas_nama: payload.atas_nama.trim(),
        keterangan: (payload.keterangan || '').trim(),
        is_active: payload.is_active ?? true,
      },
    ];
  }
  return persistLocalDb(db);
}

export function localDeleteBankAccount(id: string): SiakadDataset {
  const db = { ...loadLocalDb() };
  db.bankAccounts = db.bankAccounts.filter((b) => b.id !== id);
  return persistLocalDb(db);
}

export function localGenerateBills(
  tahunAkademik = CURRENT_ACADEMIC_YEAR,
  departmentId?: string
): { data: SiakadDataset; createdCount: number } {
  const db = { ...loadLocalDb(), tuitionBills: [...loadLocalDb().tuitionBills] };
  const activeStudents = db.students.filter(
    (s) => s.status === 'Aktif' && (!departmentId || s.department_id === departmentId)
  );
  let createdCount = 0;
  for (const s of activeStudents) {
    const exists = db.tuitionBills.some(
      (b) => b.student_id === s.id && b.semester === s.semester_aktif && b.tahun_akademik === tahunAkademik
    );
    if (!exists) {
      const dept = db.departments.find((d) => d.id === s.department_id);
      const bill: TuitionBill = {
        id: generateId('bill'),
        student_id: s.id,
        user_id: s.user_id || `uid-${s.id}`,
        semester: s.semester_aktif,
        tahun_akademik: tahunAkademik,
        total_tagihan: dept?.biaya_spp_default || 2500000,
        total_terbayar: 0,
        skema_bayar: 'Lunas Sekali Bayar',
        status: 'Belum Bayar',
      };
      db.tuitionBills.unshift(bill);
      createdCount++;
    }
  }
  return { data: persistLocalDb(db), createdCount };
}

export function localConfigureInstallments(
  billId: string,
  skemaBayar: 'Lunas Sekali Bayar' | 'Cicilan',
  schedules: {
    termin_ke: number;
    nominal_termin: number;
    tanggal_jatuh_tempo: string;
    status?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas';
  }[]
): SiakadDataset {
  const current = loadLocalDb();
  const bill = current.tuitionBills.find((b) => b.id === billId);
  if (!bill) throw new Error('Tagihan SPP tidak ditemukan.');

  if (skemaBayar === 'Lunas Sekali Bayar') {
    const updatedBill: TuitionBill = {
      ...bill,
      skema_bayar: 'Lunas Sekali Bayar',
      status: bill.total_terbayar >= bill.total_tagihan ? 'Lunas' : 'Belum Bayar',
    };
    return persistLocalDb({
      ...current,
      tuitionBills: current.tuitionBills.map((b) => (b.id === billId ? updatedBill : b)),
      installments: current.installments.filter((i) => i.tuition_bill_id !== billId),
    });
  }

  if (!Array.isArray(schedules) || schedules.length < 2 || schedules.length > 4) {
    throw new Error('Skema cicilan harus terdiri dari 2 hingga 4 termin.');
  }

  const sumNominal = schedules.reduce((acc, s) => acc + Number(s.nominal_termin || 0), 0);
  if (Math.abs(sumNominal - bill.total_tagihan) > 100) {
    throw new Error(
      `Total nominal seluruh termin (${formatRupiah(sumNominal)}) harus sama dengan total tagihan (${formatRupiah(bill.total_tagihan)}).`
    );
  }

  const updatedBill: TuitionBill = {
    ...bill,
    skema_bayar: 'Cicilan',
    status:
      bill.total_terbayar >= bill.total_tagihan
        ? 'Lunas'
        : bill.total_terbayar > 0
          ? 'Cicilan Berjalan'
          : 'Belum Bayar',
  };

  const created: InstallmentSchedule[] = schedules.map((item, idx) => ({
    id: generateId(`inst-${idx + 1}`),
    tuition_bill_id: bill.id,
    student_id: bill.student_id,
    user_id: bill.user_id,
    termin_ke: idx + 1,
    nominal_termin: Number(item.nominal_termin),
    tanggal_jatuh_tempo: item.tanggal_jatuh_tempo,
    status: item.status || 'Belum Bayar',
  }));

  return persistLocalDb({
    ...current,
    tuitionBills: current.tuitionBills.map((b) => (b.id === billId ? updatedBill : b)),
    installments: [...current.installments.filter((i) => i.tuition_bill_id !== billId), ...created],
  });
}

export function localApprovePaymentProof(proofId: string): SiakadDataset {
  const current = loadLocalDb();
  const proof = current.paymentProofs.find((p) => p.id === proofId);
  if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');
  if (proof.status_verifikasi === 'Disetujui') {
    throw new Error('Bukti pembayaran ini sudah disetujui sebelumnya.');
  }

  const verifiedAt = new Date().toISOString();
  const paymentProofs = current.paymentProofs.map((p) =>
    p.id === proofId
      ? { ...p, status_verifikasi: 'Disetujui' as const, alasan_penolakan: '', verified_at: verifiedAt }
      : p
  );

  const tuitionBills = current.tuitionBills.map((b) => {
    if (b.id !== proof.tuition_bill_id) return b;
    const total_terbayar = Math.min(b.total_tagihan, b.total_terbayar + proof.nominal_transfer);
    const status =
      total_terbayar >= b.total_tagihan
        ? ('Lunas' as const)
        : total_terbayar > 0
          ? ('Cicilan Berjalan' as const)
          : b.status;
    return { ...b, total_terbayar, status };
  });

  const installments = current.installments.map((i) =>
    proof.installment_id && i.id === proof.installment_id ? { ...i, status: 'Lunas' as const } : i
  );

  return persistLocalDb({ ...current, paymentProofs, tuitionBills, installments });
}

export function localRejectPaymentProof(proofId: string, alasanPenolakan: string): SiakadDataset {
  if (!alasanPenolakan || alasanPenolakan.trim().length < 5) {
    throw new Error('Alasan penolakan wajib diisi minimal 5 karakter.');
  }
  const current = loadLocalDb();
  const proof = current.paymentProofs.find((p) => p.id === proofId);
  if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');

  const verifiedAt = new Date().toISOString();
  const paymentProofs = current.paymentProofs.map((p) =>
    p.id === proofId
      ? {
          ...p,
          status_verifikasi: 'Ditolak' as const,
          alasan_penolakan: alasanPenolakan.trim(),
          verified_at: verifiedAt,
        }
      : p
  );

  const installments = current.installments.map((i) =>
    proof.installment_id && i.id === proof.installment_id && i.status === 'Menunggu Verifikasi'
      ? { ...i, status: 'Belum Bayar' as const }
      : i
  );

  return persistLocalDb({ ...current, paymentProofs, installments });
}

// --- Student Local Mutations ---

export function localSaveStudentKrs(
  studentId: string,
  courseIds: string[]
): SiakadDataset['enrollments'] {
  const current = loadLocalDb();
  const student = current.students.find((s) => s.id === studentId);
  if (!student) throw new Error('Data mahasiswa tidak ditemukan.');

  const selectedCourses = current.courses.filter(
    (c) => courseIds.includes(c.id) && c.is_active && c.department_id === student.department_id
  );
  const totalSks = selectedCourses.reduce((sum, c) => sum + c.sks, 0);
  if (totalSks > MAX_KRS_SKS) {
    throw new Error(`Total SKS (${totalSks}) melebihi batas maksimal ${MAX_KRS_SKS} SKS.`);
  }
  const conflicts = detectScheduleConflicts(selectedCourses);
  if (conflicts.length > 0) {
    throw new Error(conflicts[0].reason);
  }

  const remaining = current.enrollments.filter(
    (e) => !(e.student_id === student.id && e.semester_diambil === student.semester_aktif)
  );
  const nowIso = new Date().toISOString();
  const created = selectedCourses.map((c) => ({
    id: generateId('enr'),
    student_id: student.id,
    user_id: student.user_id || DEMO_STUDENT_UID,
    course_id: c.id,
    semester_diambil: student.semester_aktif,
    tahun_akademik: CURRENT_ACADEMIC_YEAR,
    created_at: nowIso,
  }));

  const updated = persistLocalDb({ ...current, enrollments: [...remaining, ...created] });
  return updated.enrollments.filter((e) => e.student_id === student.id);
}

export function localSubmitPaymentProof(
  studentId: string,
  payload: {
    tuition_bill_id: string;
    installment_id: string;
    bank_account_id: string;
    nominal_transfer: number;
    tanggal_transfer: string;
    file_url: string;
    file_name: string;
    file_type: string;
    catatan: string;
  }
): {
  paymentProofs: SiakadDataset['paymentProofs'];
  installments: SiakadDataset['installments'];
} {
  const current = loadLocalDb();
  const student = current.students.find((s) => s.id === studentId);
  if (!student) throw new Error('Data mahasiswa tidak ditemukan.');

  const bill = current.tuitionBills.find(
    (b) => b.id === payload.tuition_bill_id && b.student_id === student.id
  );
  if (!bill) throw new Error('Tagihan SPP tidak ditemukan untuk mahasiswa ini.');

  const bank = current.bankAccounts.find((b) => b.id === payload.bank_account_id && b.is_active);
  if (!bank) throw new Error('Rekening bank tujuan tidak valid atau nonaktif.');

  const nominal = Number(payload.nominal_transfer);
  if (!nominal || nominal <= 0) {
    throw new Error('Nominal transfer harus lebih dari Rp 0.');
  }
  if (!payload.tanggal_transfer || !payload.file_url) {
    throw new Error('Tanggal transfer dan file bukti bayar wajib diisi.');
  }

  const newProof: PaymentProof = {
    id: generateId('proof'),
    student_id: student.id,
    user_id: student.user_id || DEMO_STUDENT_UID,
    tuition_bill_id: bill.id,
    installment_id: payload.installment_id || '',
    bank_account_id: bank.id,
    nominal_transfer: nominal,
    tanggal_transfer: payload.tanggal_transfer,
    file_url: payload.file_url,
    file_name: payload.file_name || 'bukti_bayar',
    file_type: payload.file_type || 'image/jpeg',
    catatan: (payload.catatan || '').trim().slice(0, 400),
    status_verifikasi: 'Menunggu Verifikasi',
    alasan_penolakan: '',
    verified_at: '',
    created_at: new Date().toISOString(),
  };

  const installments = current.installments.map((i) =>
    payload.installment_id &&
    i.id === payload.installment_id &&
    i.tuition_bill_id === bill.id &&
    i.student_id === student.id &&
    i.status === 'Belum Bayar'
      ? { ...i, status: 'Menunggu Verifikasi' as const }
      : i
  );

  const updated = persistLocalDb({
    ...current,
    paymentProofs: [newProof, ...current.paymentProofs],
    installments,
  });

  return {
    paymentProofs: updated.paymentProofs.filter((p) => p.student_id === student.id),
    installments: updated.installments.filter((i) => i.student_id === student.id),
  };
}

export function localUpdateStudentContact(
  studentId: string,
  no_hp: string,
  alamat: string
): Student {
  const current = loadLocalDb();
  const target = current.students.find((s) => s.id === studentId);
  if (!target) throw new Error('Data mahasiswa tidak ditemukan.');

  const updatedStudent: Student = {
    ...target,
    no_hp: no_hp.trim().slice(0, 30),
    alamat: alamat.trim().slice(0, 400),
  };

  persistLocalDb({
    ...current,
    students: current.students.map((s) => (s.id === studentId ? updatedStudent : s)),
  });

  return updatedStudent;
}
