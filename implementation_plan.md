# Rencana Perbaikan Menyeluruh BatchNexus (Revisi Final)

Dokumen ini memuat rencana perubahan komprehensif untuk memperbaiki alur kerja end-to-end, RBAC, AI Copilot, serta menyelesaikan seluruh bug dari hasil evaluasi testing.

---

## 1. Normalisasi Alur Status Lot

Status lot harus mengikuti progresi yang jelas dan konsisten di seluruh modul:

```
Pending QC → QC Released → Ready for Warehouse → Stored → In Dispatch → Dispatched
```

Side statuses (status samping):
- `Needs Review` → kembali ke antrian QC untuk inspeksi ulang.
- `On Hold` → ditunda sementara oleh PPIC, bisa kembali ke `QC Released` atau lanjut ke `Ready for Warehouse`.
- `Blocked` → **gagal QC atau pelanggaran policy**. Tidak boleh masuk ke tahap manapun kecuali melalui **Manager/Admin override** atau **QC Staff re-inspection**.

> **PENTING:** `Blocked` ≠ `On Hold`. Blocked berarti material gagal dan butuh intervensi senior. On Hold berarti PPIC sementara menunda karena alasan operasional (kapasitas, jadwal produksi, dll). Jangan mencampurkan keduanya agar dashboard, copilot, audit, dan summary tidak salah membaca lot sebagai gagal QC.

Saat ini aplikasi menggunakan satu field `status`. Untuk MVP hackathon ini tetap pakai satu field, tapi progresi di atas harus ditegakkan secara ketat di setiap modul.

---

## 2. Perbaikan Bug Utama

### Bug 1 — Lot Baru Tidak Muncul di PPIC & Lots

**File:** `app/qc/page.tsx`

- Saat QC Staff klik "Approve Release", sistem saat ini membuat Lot dengan status `"Awaiting Slot"`.
- **Perbaikan:** Ubah status lot baru menjadi `"QC Released"` agar muncul di kolom "QC Released" pada PPIC Board.
- Pastikan lot baru memiliki semua field esensial: `lot_number`, `receipt_id`, `source_receipt_id`, `material_id`, `quantity`, `status`, `date_created`.

### Bug 2 — Drag & Drop PPIC Memantul Kembali

**File:** `app/ppic/page.tsx`

- Card yang di-drag kembali ke posisi semula karena status tidak benar-benar tersimpan.
- **Perbaikan:** Pastikan `handleDrop` melakukan optimistic update pada UI state DAN menyimpan ke database. Jika gagal simpan, rollback UI dan tampilkan error toast.

**Validasi transisi yang diperbolehkan untuk PPIC Planner:**
  - `QC Released` → `Ready for Warehouse` ✅
  - `QC Released` → `On Hold` ✅
  - `Ready for Warehouse` → `On Hold` ✅
  - `On Hold` → `QC Released` ✅
  - `On Hold` → `Ready for Warehouse` ✅

**Validasi transisi yang TIDAK diperbolehkan:**
  - `Pending QC` → apapun ❌
  - `Needs Review` → apapun ❌
  - `Blocked` → apapun ❌ melalui PPIC drag-and-drop
  - `Stored` → status PPIC sebelumnya ❌
  - `Dispatched` → status sebelumnya ❌

**Catatan:** Jika lot `Blocked` perlu dibuka kembali, hanya **Operations Manager/Admin** atau **QC Staff** melalui re-inspection flow yang boleh melakukannya. Bukan melalui drag-and-drop PPIC.

### Bug 3 — Ops Copilot Menampilkan Placeholder

**File:** `app/api/ai/copilot/route.ts`

- Copilot saat ini mengandalkan API Groq yang bisa gagal, menghasilkan teks `<brave_search>`.
- **Perbaikan:** Implementasi sistem hybrid:
  1. **Utama:** Tetap gunakan Groq/Llama API dengan system prompt yang diperkuat dengan data real-time dari database.
  2. **Fallback:** Jika API gagal, gunakan rule-based engine yang membaca langsung dari database untuk menjawab pertanyaan kritis.
- Copilot wajib bisa menjawab minimal:
  - "Where is LOT-2026-051?"
  - "Where is LOT-2026-120?"
  - "What batches are blocked today?"
  - "Any cold-chain alerts today?"
  - "Which samples used this lot?"
  - "Show system status summary"
  - "Is REC-2026-001 ready for production?"
- Jawaban wajib menyertakan sumber data (`Sources: lots, qc_inspections, inventory_moves`).
- Tidak boleh pernah menampilkan `<brave_search>` atau placeholder internal lainnya.

### Bug 4 — Search Tidak Konsisten

**File:** `app/lots/page.tsx`, `app/inbound/page.tsx`, `app/audit/page.tsx`

- Search harus bisa mencari lintas field:
  - Lot ID, Material, Supplier, Receipt Number, Status
- Global search header juga harus berfungsi.

### Bug 5 — Customer Service Melihat Form Dispatch

**File:** `app/dispatch/page.tsx`

- Customer Service seharusnya read-only.
- **Perbaikan:** Jika role = "Customer Service", sembunyikan seluruh form "New Dispatch". Tampilkan pesan: *"View-only role: hubungi Operations Manager untuk membuat pengiriman baru."*
- Hanya tampilkan tabel Dispatch History.

### Bug 6 — Policy & UI State Tidak Sinkron

**File:** `app/qc/page.tsx`

- Terapkan validasi confidence AI sesuai policy:
  - ≥ 85%: Direkomendasikan approve (tombol Approve aktif, label hijau)
  - 70–84%: Review recommended (tampilkan warning kuning)
  - < 70%: Re-inspection required (tampilkan peringatan merah, wajibkan recheck)
- Jika `foreign_matter_risk` = "High": otomatis flag atau blokir.

---

## 3. Warehouse Slotting End-to-End

**File:** `app/warehouse/page.tsx`

Warehouse sudah memiliki fitur yang cukup lengkap (zone map, AI recommendation, manual override, policy validation). Yang perlu dipastikan:

- Lot dengan status `"Ready for Warehouse"` harus muncul di daftar Pending Slotting (saat ini hanya mendeteksi `"Awaiting Slot"`).
- **Perbaikan:** Tambahkan filter agar `"Ready for Warehouse"` juga masuk ke antrian pending slotting.
- Setelah Assign Slot:
  - `lot.status` → `"Stored"`
  - `lot.current_location` → slot ID yang dipilih
  - Buat `inventory_move` record
  - Update occupancy zona warehouse
  - Buat audit log: `"Assigned warehouse slot"`

---

## 4. Dispatch Harus Update Traceability

**File:** `app/dispatch/page.tsx`

- Operations Manager hanya bisa membuat dispatch dari lot berstatus `"Stored"` atau `"Ready for Dispatch"`.
- Validasi: quantity dispatch tidak boleh melebihi `availableQuantity` lot.
- Setelah dispatch dibuat:
  - `lot.availableQuantity` berkurang
  - Dispatch record ditambahkan ke `sample_dispatches`
  - Lot timeline di traceability bertambah event "Sample dispatch created"
  - Audit log mencatat `"Dispatched sample"` / `"DISPATCH_CREATED"`

---

## 5. Audit Log Terpusat (Cross-Module)

**File:** `lib/audit.ts` (baru, opsional — atau tetap inline di setiap modul)

Setiap aksi kritis wajib membuat audit event dengan format konsisten:

| Field | Keterangan |
|-------|-----------|
| `id` | UUID otomatis |
| `timestamp` | Waktu aksi |
| `actor` | Nama persona (dari PERSONA_NAMES) |
| `role` | Role yang sedang aktif |
| `action` | Nama aksi (contoh: "Approved QC release") |
| `entity` | ID entitas terkait (lot number, receipt ID) |
| `change_detail` | Detail perubahan (status sebelum → sesudah) |

Aksi yang wajib menghasilkan audit:
- AI extraction completed
- Receipt submitted to QC
- QC release approved / recheck / blocked
- PPIC status moved
- Warehouse slot assigned
- Dispatch created
- AI summary generated

---

## 6. Role-Based Access Control (RBAC)

**File:** `lib/rbac.ts`, `components/Layout/PageLayout.tsx`

### Matriks Akses per Role:

| Role | Halaman yang Boleh Diakses |
|------|---------------------------|
| Admin | Semua (`*`) |
| Operations Manager | Semua (`*`) |
| Receiving Operator | Dashboard, Inbound, Lots (read-only) |
| QC Staff | Dashboard, QC Station, Lots, Audit Log |
| PPIC Planner | Dashboard, PPIC Board, Lots, Ops Copilot |
| Warehouse Admin | Dashboard, Warehouse, Lots, Audit Log |
| Customer Service | Lots (read-only), Dispatch (read-only), Ops Copilot |

### Mekanisme Guard:
- Jika role mencoba akses halaman terlarang → **redirect otomatis ke Dashboard** + toast merah "Akses Ditolak".
- Guard dipasang di `PageLayout.tsx` agar berlaku global.

---

## 7. AI Auto-Fill (Inbound)

**File:** `app/inbound/new/page.tsx` atau komponen AI Auto-Fill terkait

- Harus bisa memproses input Bahasa Indonesia:
  - *"tolong catat 400kg cengkeh dari Madura, tiba hari ini"*
- Default temperature: `Ambient` jika tidak disebutkan.
- Deteksi bahan seperti clove oil / cengkeh sebagai `Flammable`.
- Jika supplier tidak ditemukan di master data: tampilkan warning kuning.
- Jika material cocok: tampilkan label "Material verified ✓".

---

## 8. Rencana Verifikasi (Definition of Done)

Semua kriteria berikut HARUS terpenuhi:

- [ ] Receipt baru dari Receiving Operator muncul di QC queue
- [ ] QC approve menghasilkan entitas Lot yang nyata
- [ ] Lot baru muncul di: Lots, PPIC Board, Dashboard, Copilot, dan Audit Log
- [ ] PPIC drag-and-drop bertahan setelah refresh
- [ ] Lot "Ready for Warehouse" muncul di Warehouse pending slotting
- [ ] Assign Slot mengupdate lokasi lot dan audit log
- [ ] Dispatch mengupdate quantity, history, timeline, dan audit
- [ ] Customer Service tidak bisa membuat dispatch (read-only)
- [ ] Ops Copilot tidak pernah menampilkan `<brave_search>` atau placeholder
- [ ] RBAC URL guard memblokir akses tidak sah
- [ ] `npm run build` berhasil tanpa error

### Pengecekan Manual:
- **Test 1-2:** Buat receipt manual dan via AI Auto-fill bahasa Indonesia
- **Test 3-5:** Approve, Block, dan Recheck di QC → cek propagasi ke modul lain
- **Test 6-7:** Drag & drop di PPIC → cek persistensi
- **Test 8:** Warehouse slotting → cek rekomendasi zone dan audit
- **Test 9:** Dispatch → cek pengurangan stok dan audit
- **Test 10:** Customer Service → pastikan read-only
- **Test 11:** Tanya Copilot pertanyaan wajib → pastikan jawaban akurat
- **Test 12:** Akses URL terlarang → pastikan redirect
