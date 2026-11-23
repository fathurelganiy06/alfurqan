import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { buildSeedDataset, DEMO_ADMIN_UID, DEMO_STUDENT_ID, DEMO_STUDENT_UID } from './src/data/seedData.ts';
import type {
  BankAccount,
  Course,
  Department,
  Faculty,
  InstallmentSchedule,
  PaymentProof,
  SiakadDataset,
  Student,
  TuitionBill,
  UserRole,
} from './src/types/siakad.ts';
import {
  CURRENT_ACADEMIC_YEAR,
  detectScheduleConflicts,
  formatRupiah,
  generateId,
  MAX_KRS_SKS,
} from './src/utils/formatters.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) {
      return cb(new Error('Format berkas tidak didukung. Gunakan JPG, PNG, atau PDF.'), '');
    }
    const safeName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Format file harus JPG, PNG, atau PDF.'));
    }
  },
});

interface DemoSession {
  token: string;
  uid: string;
  role: UserRole;
  student_id?: string;
  nama_lengkap: string;
  email: string;
  createdAt: number;
}

const demoSessions = new Map<string, DemoSession>();
let demoDb: SiakadDataset = buildSeedDataset(DEMO_STUDENT_UID);

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDemoSessionFromReq(req: express.Request): DemoSession | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return demoSessions.get(token) || null;
}

function requireDemoAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = getDemoSessionFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
    return;
  }
  (req as express.Request & { demoSession?: DemoSession }).demoSession = session;
  next();
}

function requireDemoAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = (req as express.Request & { demoSession?: DemoSession }).demoSession;
  if (!session || session.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Fitur ini hanya untuk Admin STAI AL FURQAN Makassar.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Sample Bank Transfer Receipt SVG (for seeded payment proofs preview)
  app.get('/api/sample-receipt/:proofId', (req, res) => {
    const proofId = req.params.proofId;
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(proofId)) {
      res.status(400).send('Invalid receipt ID');
      return;
    }

    const proof = demoDb.paymentProofs.find((p) => p.id === proofId);
    const student = proof ? demoDb.students.find((s) => s.id === proof.student_id) : null;
    const bank = proof ? demoDb.bankAccounts.find((b) => b.id === proof.bank_account_id) : null;
    const isRejectedSample = proofId === 'proof-09';

    const bankTitle = escapeXml(bank?.nama_bank || 'Bank Syariah Indonesia (BSI)');
    const rekNo = escapeXml(bank?.nomor_rekening || '7189452011');
    const atasNama = escapeXml(bank?.atas_nama || 'STAI AL FURQAN MAKASSAR');
    const studentName = escapeXml(student?.nama_lengkap || 'Mahasiswa STAI AL FURQAN');
    const studentNim = escapeXml(student?.nim || '2024010001');
    const nominal = escapeXml(formatRupiah(proof?.nominal_transfer || 850000));
    const tgl = escapeXml(proof?.tanggal_transfer || '2026-11-19');
    const refNo = escapeXml(`TRF-${proofId.toUpperCase()}-88412`);
    const note = escapeXml(proof?.catatan || 'Pembayaran SPP Semester Aktif');

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

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(svg);
  });

  // 2. Secure File Upload (JPG, PNG, PDF)
  app.post('/api/uploads', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Autentikasi diperlukan untuk mengunggah bukti pembayaran.' });
      return;
    }
    const token = authHeader.slice(7).trim();
    const isDemoValid = demoSessions.has(token);
    const isJwtShape = token.split('.').length === 3 && token.length > 40;
    if (!isDemoValid && !isJwtShape) {
      res.status(401).json({ error: 'Token sesi tidak valid untuk mengunggah berkas.' });
      return;
    }

    upload.single('file')(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Gagal mengunggah file.';
        res.status(400).json({ error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'File bukti pembayaran wajib dipilih.' });
        return;
      }
      res.json({
        file_url: `/api/uploads/${req.file.filename}`,
        file_name: req.file.originalname.slice(0, 180),
        file_type: req.file.mimetype,
      });
    });
  });

  // 3. Serve Uploaded Payment Proof with Strict Path Confinement
  app.get('/api/uploads/:filename', (req, res) => {
    const rawName = req.params.filename;
    if (!/^[a-zA-Z0-9._-]+$/.test(rawName)) {
      res.status(400).json({ error: 'Nama file tidak valid.' });
      return;
    }
    const resolved = path.resolve(UPLOAD_DIR, rawName);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
      res.status(403).json({ error: 'Akses ditolak.' });
      return;
    }
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'File bukti bayar tidak ditemukan.' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  // 4. Demo Quick Login & Credentials Login
  app.post('/api/demo/login', (req, res) => {
    const { role, email, password } = req.body as {
      role?: UserRole;
      email?: string;
      password?: string;
    };

    let resolvedRole: UserRole | null = null;
    if (role === 'admin' || role === 'mahasiswa') {
      resolvedRole = role;
    } else if (typeof email === 'string' && typeof password === 'string') {
      const normalized = email.trim().toLowerCase();
      if (normalized === 'admin@staialfurqan.ac.id' && password === 'admin123') {
        resolvedRole = 'admin';
      } else if (
        (normalized === 'fauzan.ramadhan@staialfurqan.ac.id' || normalized === '2024010001') &&
        password === 'mahasiswa123'
      ) {
        resolvedRole = 'mahasiswa';
      } else {
        res.status(401).json({
          error:
            'Email/NIM atau kata sandi tidak sesuai. Gunakan tombol Quick Login atau kredensial demo di bawah.',
        });
        return;
      }
    }

    if (!resolvedRole) {
      res.status(400).json({ error: 'Peran login tidak valid.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const demoStudent = demoDb.students.find((s) => s.id === DEMO_STUDENT_ID) || demoDb.students[0];

    const session: DemoSession =
      resolvedRole === 'admin'
        ? {
            token,
            uid: DEMO_ADMIN_UID,
            role: 'admin',
            nama_lengkap: 'Drs. H. Abd. Rahman, M.Pd. (Admin SIAKAD)',
            email: 'admin@staialfurqan.ac.id',
            createdAt: Date.now(),
          }
        : {
            token,
            uid: DEMO_STUDENT_UID,
            role: 'mahasiswa',
            student_id: demoStudent?.id || DEMO_STUDENT_ID,
            nama_lengkap: demoStudent?.nama_lengkap || 'Ahmad Fauzan Ramadhan',
            email: demoStudent?.email || 'fauzan.ramadhan@staialfurqan.ac.id',
            createdAt: Date.now(),
          };

    demoSessions.set(token, session);

    res.json({
      token,
      user: {
        uid: session.uid,
        role: session.role,
        nama_lengkap: session.nama_lengkap,
        email: session.email,
        student_id: session.student_id,
        mode: 'demo',
      },
    });
  });

  app.post('/api/demo/logout', (req, res) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      demoSessions.delete(header.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // 5. Role-Scoped Demo Dataset Fetch (Enforces Student Isolation Like RLS)
  app.get('/api/demo/state', requireDemoAuth, (req, res) => {
    const session = (req as express.Request & { demoSession: DemoSession }).demoSession;
    if (session.role === 'admin') {
      res.json(demoDb);
      return;
    }

    const studentId = session.student_id || DEMO_STUDENT_ID;
    const student = demoDb.students.find((s) => s.id === studentId);
    const scoped: SiakadDataset = {
      faculties: demoDb.faculties,
      departments: demoDb.departments,
      students: student ? [student] : [],
      courses: demoDb.courses.filter((c) => c.is_active),
      enrollments: demoDb.enrollments.filter((e) => e.student_id === studentId),
      bankAccounts: demoDb.bankAccounts.filter((b) => b.is_active),
      tuitionBills: demoDb.tuitionBills.filter((b) => b.student_id === studentId),
      installments: demoDb.installments.filter((i) => i.student_id === studentId),
      paymentProofs: demoDb.paymentProofs.filter((p) => p.student_id === studentId),
    };
    res.json(scoped);
  });

  // 6. Demo Mutations (Admin & Student Scoped)
  app.post('/api/demo/admin/faculty', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const payload = req.body as Partial<Faculty>;
    if (!payload.kode_fakultas || !payload.nama_fakultas || !payload.dekan) {
      res.status(400).json({ error: 'Kode fakultas, nama fakultas, dan dekan wajib diisi.' });
      return;
    }
    if (payload.id) {
      demoDb.faculties = demoDb.faculties.map((f) =>
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
      demoDb.faculties.push({
        id: generateId('fac'),
        kode_fakultas: payload.kode_fakultas.trim(),
        nama_fakultas: payload.nama_fakultas.trim(),
        dekan: payload.dekan.trim(),
        is_public: true,
      });
    }
    res.json(demoDb);
  });

  app.delete('/api/demo/admin/faculty/:id', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const id = req.params.id;
    const hasDept = demoDb.departments.some((d) => d.faculty_id === id);
    if (hasDept) {
      res.status(400).json({ error: 'Fakultas masih memiliki jurusan. Hapus jurusan terkait terlebih dahulu.' });
      return;
    }
    demoDb.faculties = demoDb.faculties.filter((f) => f.id !== id);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/department', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const payload = req.body as Partial<Department>;
    if (!payload.faculty_id || !payload.kode_jurusan || !payload.nama_jurusan) {
      res.status(400).json({ error: 'Fakultas, kode jurusan, dan nama jurusan wajib diisi.' });
      return;
    }
    const spp = Number(payload.biaya_spp_default) || 0;
    if (payload.id) {
      demoDb.departments = demoDb.departments.map((d) =>
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
      demoDb.departments.push({
        id: generateId('dept'),
        faculty_id: payload.faculty_id,
        kode_jurusan: payload.kode_jurusan.trim(),
        nama_jurusan: payload.nama_jurusan.trim(),
        jenjang: payload.jenjang || 'S1',
        biaya_spp_default: spp,
        is_public: true,
      });
    }
    res.json(demoDb);
  });

  app.delete('/api/demo/admin/department/:id', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const id = req.params.id;
    const hasStudents = demoDb.students.some((s) => s.department_id === id);
    if (hasStudents) {
      res.status(400).json({ error: 'Jurusan masih memiliki data mahasiswa terdaftar.' });
      return;
    }
    demoDb.departments = demoDb.departments.filter((d) => d.id !== id);
    demoDb.courses = demoDb.courses.filter((c) => c.department_id !== id);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/student', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const payload = req.body as Partial<Student>;
    if (!payload.nim || !payload.nama_lengkap || !payload.faculty_id || !payload.department_id) {
      res.status(400).json({ error: 'NIM, Nama Lengkap, Fakultas, dan Jurusan wajib diisi.' });
      return;
    }
    const duplicateNim = demoDb.students.some(
      (s) => s.nim.toLowerCase() === payload.nim!.trim().toLowerCase() && s.id !== payload.id
    );
    if (duplicateNim) {
      res.status(400).json({ error: `NIM ${payload.nim} sudah terdaftar pada mahasiswa lain.` });
      return;
    }

    if (payload.id) {
      demoDb.students = demoDb.students.map((s) =>
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
      demoDb.students.unshift({
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
      });
    }
    res.json(demoDb);
  });

  app.delete('/api/demo/admin/student/:id', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const id = req.params.id;
    demoDb.students = demoDb.students.filter((s) => s.id !== id);
    demoDb.enrollments = demoDb.enrollments.filter((e) => e.student_id !== id);
    const billIds = new Set(demoDb.tuitionBills.filter((b) => b.student_id === id).map((b) => b.id));
    demoDb.tuitionBills = demoDb.tuitionBills.filter((b) => b.student_id !== id);
    demoDb.installments = demoDb.installments.filter((i) => !billIds.has(i.tuition_bill_id));
    demoDb.paymentProofs = demoDb.paymentProofs.filter((p) => p.student_id !== id);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/course', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const payload = req.body as Partial<Course>;
    if (!payload.department_id || !payload.kode_mk || !payload.nama_mk) {
      res.status(400).json({ error: 'Jurusan, Kode MK, dan Nama Mata Kuliah wajib diisi.' });
      return;
    }
    if (payload.id) {
      demoDb.courses = demoDb.courses.map((c) =>
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
      demoDb.courses.unshift({
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
      });
    }
    res.json(demoDb);
  });

  app.delete('/api/demo/admin/course/:id', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const id = req.params.id;
    demoDb.courses = demoDb.courses.filter((c) => c.id !== id);
    demoDb.enrollments = demoDb.enrollments.filter((e) => e.course_id !== id);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/bank', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const payload = req.body as Partial<BankAccount>;
    if (!payload.nama_bank || !payload.nomor_rekening || !payload.atas_nama) {
      res.status(400).json({ error: 'Nama bank, nomor rekening, dan atas nama wajib diisi.' });
      return;
    }
    if (payload.id) {
      demoDb.bankAccounts = demoDb.bankAccounts.map((b) =>
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
      demoDb.bankAccounts.push({
        id: generateId('bank'),
        nama_bank: payload.nama_bank.trim(),
        nomor_rekening: payload.nomor_rekening.trim(),
        atas_nama: payload.atas_nama.trim(),
        keterangan: (payload.keterangan || '').trim(),
        is_active: payload.is_active ?? true,
      });
    }
    res.json(demoDb);
  });

  app.delete('/api/demo/admin/bank/:id', requireDemoAuth, requireDemoAdmin, (req, res) => {
    demoDb.bankAccounts = demoDb.bankAccounts.filter((b) => b.id !== req.params.id);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/bills/generate', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const { tahun_akademik = CURRENT_ACADEMIC_YEAR, department_id } = req.body as {
      tahun_akademik?: string;
      department_id?: string;
    };
    const activeStudents = demoDb.students.filter(
      (s) => s.status === 'Aktif' && (!department_id || s.department_id === department_id)
    );
    let createdCount = 0;
    for (const s of activeStudents) {
      const exists = demoDb.tuitionBills.some(
        (b) => b.student_id === s.id && b.semester === s.semester_aktif && b.tahun_akademik === tahun_akademik
      );
      if (!exists) {
        const dept = demoDb.departments.find((d) => d.id === s.department_id);
        const bill: TuitionBill = {
          id: generateId('bill'),
          student_id: s.id,
          user_id: s.user_id || `uid-${s.id}`,
          semester: s.semester_aktif,
          tahun_akademik,
          total_tagihan: dept?.biaya_spp_default || 2500000,
          total_terbayar: 0,
          skema_bayar: 'Lunas Sekali Bayar',
          status: 'Belum Bayar',
        };
        demoDb.tuitionBills.unshift(bill);
        createdCount++;
      }
    }
    res.json({ data: demoDb, createdCount });
  });

  app.post('/api/demo/admin/bills/:billId/installments', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const billId = req.params.billId;
    const { skema_bayar, schedules } = req.body as {
      skema_bayar: 'Lunas Sekali Bayar' | 'Cicilan';
      schedules: { termin_ke: number; nominal_termin: number; tanggal_jatuh_tempo: string; status?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas' }[];
    };
    const bill = demoDb.tuitionBills.find((b) => b.id === billId);
    if (!bill) {
      res.status(404).json({ error: 'Tagihan SPP tidak ditemukan.' });
      return;
    }

    if (skema_bayar === 'Lunas Sekali Bayar') {
      bill.skema_bayar = 'Lunas Sekali Bayar';
      demoDb.installments = demoDb.installments.filter((i) => i.tuition_bill_id !== billId);
      if (bill.total_terbayar >= bill.total_tagihan) {
        bill.status = 'Lunas';
      } else {
        bill.status = 'Belum Bayar';
      }
      res.json(demoDb);
      return;
    }

    if (!Array.isArray(schedules) || schedules.length < 2 || schedules.length > 4) {
      res.status(400).json({ error: 'Skema cicilan harus terdiri dari 2 hingga 4 termin.' });
      return;
    }

    const sumNominal = schedules.reduce((acc, s) => acc + Number(s.nominal_termin || 0), 0);
    if (Math.abs(sumNominal - bill.total_tagihan) > 100) {
      res.status(400).json({
        error: `Total nominal seluruh termin (${formatRupiah(sumNominal)}) harus sama dengan total tagihan (${formatRupiah(bill.total_tagihan)}).`,
      });
      return;
    }

    bill.skema_bayar = 'Cicilan';
    bill.status = bill.total_terbayar >= bill.total_tagihan ? 'Lunas' : bill.total_terbayar > 0 ? 'Cicilan Berjalan' : 'Belum Bayar';
    demoDb.installments = demoDb.installments.filter((i) => i.tuition_bill_id !== billId);
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
    demoDb.installments.push(...created);
    res.json(demoDb);
  });

  app.post('/api/demo/admin/proofs/:proofId/approve', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const proof = demoDb.paymentProofs.find((p) => p.id === req.params.proofId);
    if (!proof) {
      res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan.' });
      return;
    }
    if (proof.status_verifikasi === 'Disetujui') {
      res.status(400).json({ error: 'Bukti pembayaran ini sudah disetujui sebelumnya.' });
      return;
    }
    proof.status_verifikasi = 'Disetujui';
    proof.alasan_penolakan = '';
    proof.verified_at = new Date().toISOString();

    const bill = demoDb.tuitionBills.find((b) => b.id === proof.tuition_bill_id);
    if (bill) {
      bill.total_terbayar = Math.min(bill.total_tagihan, bill.total_terbayar + proof.nominal_transfer);
      if (bill.total_terbayar >= bill.total_tagihan) {
        bill.status = 'Lunas';
      } else if (bill.total_terbayar > 0) {
        bill.status = 'Cicilan Berjalan';
      }
    }

    if (proof.installment_id) {
      const inst = demoDb.installments.find((i) => i.id === proof.installment_id);
      if (inst) {
        inst.status = 'Lunas';
      }
    }
    res.json(demoDb);
  });

  app.post('/api/demo/admin/proofs/:proofId/reject', requireDemoAuth, requireDemoAdmin, (req, res) => {
    const { alasan_penolakan } = req.body as { alasan_penolakan?: string };
    if (!alasan_penolakan || alasan_penolakan.trim().length < 5) {
      res.status(400).json({ error: 'Alasan penolakan wajib diisi minimal 5 karakter.' });
      return;
    }
    const proof = demoDb.paymentProofs.find((p) => p.id === req.params.proofId);
    if (!proof) {
      res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan.' });
      return;
    }
    proof.status_verifikasi = 'Ditolak';
    proof.alasan_penolakan = alasan_penolakan.trim();
    proof.verified_at = new Date().toISOString();

    if (proof.installment_id) {
      const inst = demoDb.installments.find((i) => i.id === proof.installment_id);
      if (inst && inst.status === 'Menunggu Verifikasi') {
        inst.status = 'Belum Bayar';
      }
    }
    res.json(demoDb);
  });

  // Student-scoped Demo Mutations
  app.post('/api/demo/student/krs', requireDemoAuth, (req, res) => {
    const session = (req as express.Request & { demoSession: DemoSession }).demoSession;
    const studentId = session.student_id || DEMO_STUDENT_ID;
    const student = demoDb.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Data mahasiswa tidak ditemukan.' });
      return;
    }
    const { course_ids } = req.body as { course_ids?: string[] };
    if (!Array.isArray(course_ids)) {
      res.status(400).json({ error: 'Daftar mata kuliah tidak valid.' });
      return;
    }

    const selectedCourses = demoDb.courses.filter(
      (c) => course_ids.includes(c.id) && c.is_active && c.department_id === student.department_id
    );
    const totalSks = selectedCourses.reduce((sum, c) => sum + c.sks, 0);
    if (totalSks > MAX_KRS_SKS) {
      res.status(400).json({ error: `Total SKS (${totalSks}) melebihi batas maksimal ${MAX_KRS_SKS} SKS.` });
      return;
    }

    const conflicts = detectScheduleConflicts(selectedCourses);
    if (conflicts.length > 0) {
      res.status(400).json({ error: conflicts[0].reason });
      return;
    }

    // Replace active semester enrollments
    demoDb.enrollments = demoDb.enrollments.filter(
      (e) => !(e.student_id === student.id && e.semester_diambil === student.semester_aktif)
    );
    const nowIso = new Date().toISOString();
    for (const c of selectedCourses) {
      demoDb.enrollments.push({
        id: generateId('enr'),
        student_id: student.id,
        user_id: student.user_id || DEMO_STUDENT_UID,
        course_id: c.id,
        semester_diambil: student.semester_aktif,
        tahun_akademik: CURRENT_ACADEMIC_YEAR,
        created_at: nowIso,
      });
    }

    res.json({
      enrollments: demoDb.enrollments.filter((e) => e.student_id === student.id),
    });
  });

  app.post('/api/demo/student/payment-proof', requireDemoAuth, (req, res) => {
    const session = (req as express.Request & { demoSession: DemoSession }).demoSession;
    const studentId = session.student_id || DEMO_STUDENT_ID;
    const student = demoDb.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Data mahasiswa tidak ditemukan.' });
      return;
    }

    const {
      tuition_bill_id,
      installment_id = '',
      bank_account_id,
      nominal_transfer,
      tanggal_transfer,
      file_url,
      file_name = 'bukti_bayar',
      file_type = 'image/jpeg',
      catatan = '',
    } = req.body as Partial<PaymentProof>;

    const bill = demoDb.tuitionBills.find((b) => b.id === tuition_bill_id && b.student_id === student.id);
    if (!bill) {
      res.status(404).json({ error: 'Tagihan SPP tidak ditemukan untuk mahasiswa ini.' });
      return;
    }
    const bank = demoDb.bankAccounts.find((b) => b.id === bank_account_id && b.is_active);
    if (!bank) {
      res.status(400).json({ error: 'Rekening bank tujuan tidak valid atau nonaktif.' });
      return;
    }
    const nominal = Number(nominal_transfer);
    if (!nominal || nominal <= 0) {
      res.status(400).json({ error: 'Nominal transfer harus lebih dari Rp 0.' });
      return;
    }
    if (!tanggal_transfer || !file_url) {
      res.status(400).json({ error: 'Tanggal transfer dan file bukti bayar wajib diisi.' });
      return;
    }

    const newProof: PaymentProof = {
      id: generateId('proof'),
      student_id: student.id,
      user_id: student.user_id || DEMO_STUDENT_UID,
      tuition_bill_id: bill.id,
      installment_id: installment_id || '',
      bank_account_id: bank.id,
      nominal_transfer: nominal,
      tanggal_transfer,
      file_url,
      file_name,
      file_type,
      catatan: catatan.trim().slice(0, 400),
      status_verifikasi: 'Menunggu Verifikasi',
      alasan_penolakan: '',
      verified_at: '',
      created_at: new Date().toISOString(),
    };
    demoDb.paymentProofs.unshift(newProof);

    if (installment_id) {
      const inst = demoDb.installments.find(
        (i) => i.id === installment_id && i.tuition_bill_id === bill.id && i.student_id === student.id
      );
      if (inst && inst.status === 'Belum Bayar') {
        inst.status = 'Menunggu Verifikasi';
      }
    }

    res.json({
      paymentProofs: demoDb.paymentProofs.filter((p) => p.student_id === student.id),
      installments: demoDb.installments.filter((i) => i.student_id === student.id),
    });
  });

  app.patch('/api/demo/student/profile', requireDemoAuth, (req, res) => {
    const session = (req as express.Request & { demoSession: DemoSession }).demoSession;
    const studentId = session.student_id || DEMO_STUDENT_ID;
    const { no_hp, alamat } = req.body as { no_hp?: string; alamat?: string };
    const student = demoDb.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Data mahasiswa tidak ditemukan.' });
      return;
    }
    if (typeof no_hp === 'string') {
      student.no_hp = no_hp.trim().slice(0, 30);
    }
    if (typeof alamat === 'string') {
      student.alamat = alamat.trim().slice(0, 400);
    }
    res.json({ student });
  });

  // 7. Vite dev middleware or production dist static files
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SIAKAD STAI AL FURQAN Makassar server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
