/**
 * Security Rules Verification Spec — Dirty Dozen Payloads
 * Mirrors the 12 adversarial scenarios in security_spec.md against firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  actor: 'student_a' | 'unverified_admin' | 'unauthenticated';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation via self-assigned admin role on profiles',
    actor: 'student_a',
    operation: 'create',
    path: '/profiles/uid_student_a',
    payload: { user_id: 'uid_student_a', role: 'admin', nama_lengkap: 'Attacker' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow field & unauthorized status update on students',
    actor: 'student_a',
    operation: 'update',
    path: '/students/std-01',
    payload: { no_hp: '08123456789', status: 'Lulus', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-student PII read on another student document',
    actor: 'student_a',
    operation: 'get',
    path: '/students/std-02',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unfiltered list query on tuition_bills by non-admin',
    actor: 'student_a',
    operation: 'list',
    path: '/tuition_bills',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Self-approval on payment_proofs create',
    actor: 'student_a',
    operation: 'create',
    path: '/payment_proofs/proof-evil',
    payload: {
      student_id: 'std-01',
      user_id: 'uid_student_a',
      tuition_bill_id: 'bill-01',
      installment_id: '',
      bank_account_id: 'bank-bsi',
      nominal_transfer: 2500000,
      tanggal_transfer: '2026-11-20',
      file_url: '/api/uploads/sample.png',
      file_name: 'sample.png',
      file_type: 'image/png',
      catatan: '',
      status_verifikasi: 'Disetujui',
      alasan_penolakan: '',
      verified_at: '',
      created_at: '2026-11-20T10:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Tuition bill tampering by student',
    actor: 'student_a',
    operation: 'update',
    path: '/tuition_bills/bill-01',
    payload: { total_terbayar: 2500000, status: 'Lunas' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unverified admin email spoof on faculties create',
    actor: 'unverified_admin',
    operation: 'create',
    path: '/faculties/fac-spoof',
    payload: { kode_fakultas: 'SPF', nama_fakultas: 'Spoof', dekan: 'Fake', is_public: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Document ID poisoning with invalid characters',
    actor: 'student_a',
    operation: 'create',
    path: '/student_enrollments/bad$id..evil',
    payload: { student_id: 'std-01', user_id: 'uid_student_a', course_id: 'mk-pai-1', semester_diambil: 3, tahun_akademik: '2026/2027', created_at: '2026-11-20T10:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Oversized string exhaustion on student alamat',
    actor: 'student_a',
    operation: 'update',
    path: '/students/std-01',
    payload: { alamat: 'A'.repeat(5000) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned enrollment referencing missing course_id',
    actor: 'student_a',
    operation: 'create',
    path: '/student_enrollments/enr-orphan',
    payload: { student_id: 'std-01', user_id: 'uid_student_a', course_id: 'mk-nonexistent', semester_diambil: 3, tahun_akademik: '2026/2027', created_at: '2026-11-20T10:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Student attempting to modify campus bank account',
    actor: 'student_a',
    operation: 'update',
    path: '/bank_accounts/bank-bsi',
    payload: { nomor_rekening: '9999999999' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Mutation on terminal approved payment proof',
    actor: 'student_a',
    operation: 'update',
    path: '/payment_proofs/proof-01',
    payload: { catatan: 'edited after approval' },
    expected: 'PERMISSION_DENIED',
  },
];
