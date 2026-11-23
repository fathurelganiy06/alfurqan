# Security Specification — SIAKAD STAI AL FURQAN Makassar

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every unspecified path in Firestore is denied read and write access (`allow read, write: if false`).
2. **RBAC Isolation**: Admin privileges are verified strictly via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or the bootstrapped verified admin email (`fathurelgani@gmail.com` with `request.auth.token.email_verified == true`). Students cannot self-assign `role: "admin"`.
3. **PII Isolation**: Student personal records (`students`), tuition bills (`tuition_bills`), installment schedules (`installment_schedules`), enrollments (`student_enrollments`), and payment proofs (`payment_proofs`) are readable only by `isAdmin()` or the owning verified student (`resource.data.user_id == request.auth.uid`).
4. **Action-Based Updates**: Students may only update `no_hp` and `alamat` on their own `students` document, and may never alter `nim`, `status`, `department_id`, `total_terbayar`, or `status_verifikasi`.
5. **Terminal State Locking**: Once a `payment_proofs` document reaches `Disetujui` or `Ditolak`, non-admins cannot mutate it.
6. **Parent Integrity**: `departments` require an existing `faculty_id`; `courses` require an existing `department_id`; `student_enrollments` require existing `student_id` and `course_id`; `payment_proofs` require existing `tuition_bill_id` and `bank_account_id`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation (Profile Create)**: Student attempts to create `/profiles/{uid}` with `{ "user_id": uid, "role": "admin", "nama_lengkap": "Attacker" }`. Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection (Student Update)**: Student updates own `/students/{id}` with `{ "no_hp": "08123", "status": "Lulus", "isVerified": true }`. Expected: `PERMISSION_DENIED`.
3. **Cross-Student PII Read**: Student A attempts `get` on Student B's `/students/std-02`. Expected: `PERMISSION_DENIED`.
4. **Blanket List Scraping**: Student A attempts unfiltered `list` on `/students` or `/tuition_bills`. Expected: `PERMISSION_DENIED`.
5. **Fake Payment Self-Approval**: Student attempts to create `/payment_proofs/{id}` with `{ "status_verifikasi": "Disetujui" }`. Expected: `PERMISSION_DENIED`.
6. **Tuition Bill Tampering**: Student attempts to update `/tuition_bills/{id}` setting `total_terbayar = total_tagihan` and `status = "Lunas"`. Expected: `PERMISSION_DENIED`.
7. **Unverified Admin Email Spoof**: Caller with `email: "fathurelgani@gmail.com"` and `email_verified: false` attempts admin write on `/faculties/f1`. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: Caller attempts create with document ID containing invalid characters or >128 chars (`/courses/../../evil$id`). Expected: `PERMISSION_DENIED`.
9. **Oversized String Exhaustion**: Student updates `alamat` with a 5000-character string exceeding `maxLength: 400`. Expected: `PERMISSION_DENIED`.
10. **Orphaned Enrollment**: Student creates `/student_enrollments/{id}` referencing a non-existent `course_id: "nonexistent-mk"`. Expected: `PERMISSION_DENIED`.
11. **Inactive Bank Account Tampering**: Student attempts to create or modify `/bank_accounts/bank-1`. Expected: `PERMISSION_DENIED`.
12. **Terminal Proof Mutation**: Student attempts to edit `/payment_proofs/{id}` after Admin already marked `status_verifikasi: "Disetujui"`. Expected: `PERMISSION_DENIED`.
