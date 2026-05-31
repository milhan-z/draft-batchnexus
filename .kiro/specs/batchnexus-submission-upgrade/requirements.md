# Requirements Document

## Introduction

Paket update besar ("submission upgrade") untuk aplikasi **BatchNexus Control Tower** menjelang submission CyberHack 2026 untuk klien Sima Arôme (produsen natural extracts). Aplikasi sudah berjalan (Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Mantine) dengan modul Dashboard, Inbound Intake, QC Release Station, PPIC Board, Lots Traceability, Warehouse Digital Twin, Dispatch, Ops Copilot, AI Summary, Policy Rules, Audit Log, dan Login/role selector.

Tujuan update ini adalah menutup bug yang berisiko saat demo live, menambah kontrol manual (human override) yang diminta user, meredesain beberapa layar agar lebih nyaman dibaca, dan memperkuat sinyal *enterprise-ready* yang dinilai juri (Enterprise Readiness 30%, Problem-Solution Fit 20%, Innovation 20%, UX 20%, Pitch 10%, plus special prize "Most Enterprise-Ready"). Empat focus area yang dibidik: Integrated Operations, AI Raw-Material QC, AI Extract/Powder QC, dan AI Warehousing & Cold-chain.

Requirement dikelompokkan menjadi lima kategori: **Bug Fixes & Konsistensi (A)**, **Manual Controls (B)**, **UI/UX Redesign (C)**, **Enterprise Readiness (D)**, dan **Stretch / Nice-to-have (E)**. Selain itu ada requirement lintas-modul (cross-cutting) untuk AI fallback, audit logging, dan kompatibilitas data.

Catatan rekayasa penting yang berlaku untuk seluruh dokumen ini:
- Semua jalur AI HARUS memiliki fallback deterministik/offline (tanpa API key) karena demo dijalankan live.
- Setiap aksi kritis (create/approve/assign/override/dispatch/intake manual/acknowledge) HARUS tercatat di koleksi `audit_logs`.
- Perubahan skema data HARUS menjaga kompatibilitas dengan fallback store (`lib/demoStore.ts`) dan seed (`lib/demoData.ts`); bila bentuk data berubah, `SEED_VERSION` HARUS dinaikkan.

## Glossary

- **BatchNexus**: Aplikasi web Control Tower yang menjadi sistem dalam dokumen ini. Bila sebuah requirement merujuk "system" secara umum, yang dimaksud adalah BatchNexus.
- **Inbound_Module**: Subsistem yang menangani halaman daftar Inbound Intake (`app/inbound/page.tsx`) dan jalur intake (`app/inbound/new/page.tsx`).
- **QC_Module**: Subsistem QC Release Station (`app/qc/page.tsx`) termasuk Visual QC analyzer (`lib/visionQC.ts`).
- **Warehouse_Module**: Subsistem Warehouse Digital Twin (`app/warehouse/page.tsx`) termasuk smart-slot engine dan cold-chain monitoring.
- **Lots_Module**: Subsistem Lots Traceability (`app/lots/page.tsx`) dengan tab Traceability, Overview, QC Data, dan Audit Log.
- **Dashboard_Module**: Halaman beranda Operations Control Tower (`app/page.tsx`).
- **Summary_Module**: Halaman AI Operations Summary (`app/summary/page.tsx`).
- **TopBar**: Komponen header global (`components/Layout/TopBar.tsx`) berisi search, notifikasi, role switcher, dan profil.
- **RBAC_Service**: Modul kontrol akses berbasis peran (`lib/rbac.ts`), termasuk `ROLE_ACCESS`, `canAccessRoute`, dan helper `can*`.
- **Data_Layer**: Lapisan akses data (`lib/api/client.ts`) yang memanggil DaaS via proxy `/api/items` dengan fallback ke `Fallback_Store`.
- **Fallback_Store**: Penyimpanan lokal demo (`lib/demoStore.ts`) yang di-seed dari `lib/demoData.ts`.
- **Seed_Data**: Data awal demo (`lib/demoData.ts`) dengan konstanta `SEED_VERSION`.
- **Audit_Log**: Koleksi `audit_logs` dan halaman Audit Log (`app/audit/page.tsx`); setiap entri berisi `timestamp`, `actor`, `role`, `action`, `entity`, `change_detail`.
- **Actor_Persona**: Nama persona aktif yang dikembalikan `getActorName(role)` di RBAC_Service, dipakai sebagai `actor` pada Audit_Log.
- **Receipt**: Record `inbound_receipts` (penerimaan bahan baku).
- **QC_Inspection**: Record `qc_inspections` (hasil inspeksi QC).
- **Lot**: Record `lots`; memiliki `source_receipt_id` (referensi receipt asal) dan `receipt_id`.
- **Bin**: Record `warehouse_bins` (lokasi penyimpanan terkecil) yang bernaung di bawah Zone.
- **Zone**: Record `warehouse_zones` dengan `hazard_policy`, `temp_min`, `temp_max`, dan `status`.
- **Slot_Recommendation**: Rekomendasi bin/zone dari smart-slot engine berdasarkan hazard class dan kebutuhan suhu Lot.
- **Manual_Override**: Aksi Warehouse Admin memilih bin/zone secara manual yang berbeda dari Slot_Recommendation.
- **Manual_Entry**: Jalur intake melalui form lengkap tanpa ekstraksi AI.
- **Master_Data**: Data referensi `materials` dan `suppliers`.
- **Cold_Chain_Alert**: Status Zone "Cold-chain Alert" akibat pembacaan suhu di luar rentang `temp_min`–`temp_max`.
- **AI_Fallback**: Mekanisme deterministik/offline yang dipakai ketika DaaS atau layanan AI eksternal tidak tersedia.
- **Roles**: Tujuh peran pada RBAC_Service — Receiving Operator, QC Staff, PPIC Planner, Warehouse Admin, Operations Manager, Customer Service, Admin.

---

## Requirements

**Kelompok A — Bug Fixes & Konsistensi**

### Requirement 1: Toggle List/Grid pada Inbound Intake

**User Story:** Sebagai Receiving Operator, saya ingin beralih antara tampilan tabel (list) dan kartu (grid) pada daftar Inbound Intake, sehingga saya dapat memilih cara membaca data penerimaan yang paling nyaman.

#### Acceptance Criteria

1. WHEN halaman Inbound Intake dimuat, THE Inbound_Module SHALL menampilkan daftar Receipt dalam tampilan list (tabel) sebagai tampilan default.
2. WHEN Receiving Operator menekan tombol grid view, THE Inbound_Module SHALL menampilkan Receipt yang sama dalam tampilan kartu (grid).
3. WHEN Receiving Operator menekan tombol list view, THE Inbound_Module SHALL menampilkan Receipt yang sama dalam tampilan tabel.
4. THE Inbound_Module SHALL menandai tombol tampilan yang sedang aktif dengan indikator visual yang berbeda dari tombol non-aktif.
5. WHILE sebuah tampilan aktif, THE Inbound_Module SHALL menampilkan kumpulan Receipt yang identik (data dan urutan sama) di kedua tampilan.
6. WHERE tampilan grid aktif, THE Inbound_Module SHALL menampilkan untuk setiap Receipt minimal batch reference, nama material, supplier, quantity beserta unit, priority, dan status.

### Requirement 2: Menu Aksi pada Baris Inbound

**User Story:** Sebagai Receiving Operator, saya ingin membuka menu aksi pada setiap baris Receipt, sehingga saya dapat menindaklanjuti penerimaan tanpa menebak fungsi tombol.

#### Acceptance Criteria

1. WHEN Receiving Operator menekan tombol aksi (more_vert) pada sebuah baris Receipt, THE Inbound_Module SHALL menampilkan menu aksi yang berisi minimal opsi "View in QC" dan "View Detail".
2. WHEN Receiving Operator memilih "View in QC" dari menu aksi, THE Inbound_Module SHALL membuka QC_Module dengan Receipt terkait terpilih.
3. WHEN Receiving Operator memilih "View Detail" dari menu aksi, THE Inbound_Module SHALL menampilkan detail Receipt terkait.
4. WHEN Receiving Operator menekan tombol aksi pada sebuah baris, THE Inbound_Module SHALL mencegah klik tersebut memicu navigasi baris default secara bersamaan.
5. WHEN Receiving Operator menutup menu aksi atau memilih area di luar menu, THE Inbound_Module SHALL menutup menu aksi tanpa mengubah data Receipt.

### Requirement 3: Skema qc_inspections yang Konsisten

**User Story:** Sebagai QC Staff, saya ingin hasil inspeksi yang saya setujui tersimpan dengan skema yang konsisten, sehingga lot baru menampilkan skor dan rekomendasi QC yang benar di seluruh aplikasi.

#### Acceptance Criteria

1. THE QC_Module SHALL menulis QC_Inspection menggunakan nama field yang identik dengan yang dibaca oleh Lots_Module dan dengan Seed_Data, mencakup `colour_score`, `defect_risk`, `foreign_matter_risk`, `recommendation`, `confidence`, dan `human_decision`.
2. WHEN QC Staff menyetujui pelepasan QC, THE QC_Module SHALL menyimpan `colour_score` sebagai nilai numerik 0–100 dan `confidence` sebagai nilai pecahan 0–1 yang konsisten dengan Seed_Data.
3. WHEN Lots_Module menampilkan tab QC Data untuk sebuah Lot, THE Lots_Module SHALL menampilkan nilai `colour_score`, `defect_risk`, `foreign_matter_risk`, `recommendation`, `confidence`, dan `human_decision` tanpa menampilkan `undefined` atau `NaN`.
4. IF sebuah QC_Inspection tidak memiliki salah satu field skor yang diharapkan, THEN THE Lots_Module SHALL menampilkan penanda kosong (mis. "—") alih-alih `undefined` atau `NaN`.
5. WHERE perubahan skema field QC mengubah bentuk data Seed_Data, THE Seed_Data SHALL menaikkan nilai `SEED_VERSION`.

### Requirement 4: Penyimpanan source_receipt_id pada Lot Baru

**User Story:** Sebagai QC Staff, saya ingin lot yang dibuat dari pelepasan QC tertaut ke receipt asalnya, sehingga tab Overview dan QC Data pada Lots menampilkan data lengkap untuk lot baru.

#### Acceptance Criteria

1. WHEN QC_Module membuat Lot dari sebuah Receipt yang dilepas, THE QC_Module SHALL menyimpan `source_receipt_id` Lot yang merujuk ke `id` Receipt asal.
2. WHEN Lots_Module menampilkan tab Overview untuk Lot yang baru dibuat, THE Lots_Module SHALL menampilkan supplier, source receipt, dan quantity berdasarkan `source_receipt_id`.
3. WHEN Lots_Module menampilkan tab QC Data untuk Lot yang baru dibuat, THE Lots_Module SHALL menampilkan QC_Inspection yang tertaut melalui `source_receipt_id`.
4. THE QC_Module SHALL tetap menyimpan `receipt_id` agar kompatibel dengan record dan kode yang sudah ada.

### Requirement 5: Dashboard AI Insight dan Banner Cold-chain Data-Driven

**User Story:** Sebagai Operations Manager, saya ingin AI Insight dan banner cold-chain di Dashboard mencerminkan data nyata, sehingga angka dan peringatan yang ditampilkan selalu konsisten dengan record operasional.

#### Acceptance Criteria

1. WHEN Dashboard_Module dimuat, THE Dashboard_Module SHALL menurunkan isi kartu AI Insight (lot yang disorot dan dispatch terkait) dari record `lots` dan `sample_dispatches` yang sedang aktif.
2. WHEN Dashboard_Module dimuat, THE Dashboard_Module SHALL menurunkan banner cold-chain (zona dan nilai suhu) dari Zone yang berstatus Cold_Chain_Alert pada record `warehouse_zones` dan `temperature_readings`.
3. IF tidak ada Zone berstatus Cold_Chain_Alert, THEN THE Dashboard_Module SHALL menyembunyikan banner cold-chain atau menampilkan keadaan "tidak ada deviasi" tanpa nilai yang di-hardcode.
4. THE Dashboard_Module SHALL TIDAK menampilkan identifier lot atau nilai suhu yang ditulis tetap (hardcoded) pada AI Insight maupun banner cold-chain.
5. IF tidak ada record lot yang memenuhi kriteria prioritas dispatch, THEN THE Dashboard_Module SHALL menampilkan keadaan kosong yang informatif pada kartu AI Insight.

### Requirement 6: Notifikasi TopBar Berbasis Data Nyata

**User Story:** Sebagai pengguna aplikasi, saya ingin daftar notifikasi di TopBar mencerminkan kejadian operasional nyata, sehingga notifikasi terasa dapat dipercaya saat demo.

#### Acceptance Criteria

1. WHEN TopBar dimuat, THE TopBar SHALL menurunkan daftar notifikasi dari record operasional nyata seperti Cold_Chain_Alert, entri Audit_Log terbaru, atau Receipt berstatus "Pending QC".
2. THE TopBar SHALL menampilkan jumlah notifikasi belum dibaca (unread) sesuai jumlah notifikasi nyata yang belum ditandai dibaca.
3. WHEN pengguna menekan "Mark all read", THE TopBar SHALL menandai seluruh notifikasi sebagai dibaca dan memperbarui indikator unread menjadi nol.
4. IF tidak ada kejadian operasional yang relevan, THEN THE TopBar SHALL menampilkan keadaan "tidak ada notifikasi" tanpa entri yang di-hardcode.
5. THE TopBar SHALL TIDAK menampilkan notifikasi dengan identifier lot atau pesan yang ditulis tetap (hardcoded) yang tidak bersumber dari data.

### Requirement 7: Konsistensi RBAC Route vs Kapabilitas

**User Story:** Sebagai Operations Manager, saya ingin akses rute dan kapabilitas tiap peran selaras, sehingga peran tidak dapat membuka halaman yang melampaui kewenangannya.

#### Acceptance Criteria

1. THE RBAC_Service SHALL menyelaraskan `ROLE_ACCESS` untuk rute `/audit` dengan kapabilitas `canViewAudit`, sehingga hanya peran yang lolos `canViewAudit` yang diberi akses rute `/audit`.
2. WHEN peran QC Staff mencoba mengakses rute `/audit`, THE RBAC_Service SHALL menolak akses karena QC Staff tidak lolos `canViewAudit`.
3. WHEN peran Operations Manager atau Admin mengakses rute `/audit`, THE RBAC_Service SHALL mengizinkan akses.
4. THE RBAC_Service SHALL menjaga agar daftar rute pada `ROLE_ACCESS` tidak memberikan akses ke modul yang kapabilitas aksinya tidak dimiliki peran tersebut.
5. WHEN sebuah peran mencoba mengakses rute yang tidak diizinkan, THE BatchNexus SHALL mengalihkan pengguna ke halaman yang diizinkan atau menampilkan pesan akses ditolak yang jelas.

### Requirement 8: Penyelesaian Dead Code Route AI

**User Story:** Sebagai developer, saya ingin route AI yang tidak terpakai diselesaikan secara konsisten, sehingga basis kode bebas dari endpoint yang membingungkan saat penilaian.

#### Acceptance Criteria

1. THE BatchNexus SHALL memastikan setiap route di `app/api/ai/*` yang dipertahankan dipanggil oleh minimal satu halaman atau modul.
2. WHERE route `app/api/ai/qc-score`, `app/api/ai/summary`, atau `app/api/ai/copilot` diputuskan untuk dipertahankan, THE BatchNexus SHALL menyambungkan route tersebut ke modul terkait dengan AI_Fallback yang berfungsi tanpa API key.
3. WHERE route `app/api/ai/qc-score`, `app/api/ai/summary`, atau `app/api/ai/copilot` diputuskan untuk dihapus, THE BatchNexus SHALL menghapus route tersebut beserta referensinya tanpa merusak fungsi halaman yang ada.
4. WHEN modul memanggil route AI yang dipertahankan dan layanan AI eksternal tidak tersedia, THE BatchNexus SHALL menghasilkan output melalui AI_Fallback deterministik.

---

**Kelompok B — Manual Controls**

### Requirement 9: Slotting Manual / Override pada Warehouse

**User Story:** Sebagai Warehouse Admin, saya ingin memilih bin/zone secara manual selain menerima rekomendasi AI, sehingga saya dapat menangani situasi nyata sambil tetap mematuhi policy dan tercatat di audit.

#### Acceptance Criteria

1. WHEN Warehouse Admin membuka panel slotting sebuah Lot, THE Warehouse_Module SHALL menyediakan opsi menerima Slot_Recommendation maupun opsi memilih bin/zone secara manual.
2. WHEN Warehouse Admin memilih bin/zone secara manual, THE Warehouse_Module SHALL memvalidasi pilihan terhadap policy Zone, mencakup kompatibilitas hazard class dan rentang suhu (`temp_min`–`temp_max`).
3. IF bin/zone yang dipilih manual melanggar policy hazard atau suhu, THEN THE Warehouse_Module SHALL menampilkan pelanggaran policy secara eksplisit dan mencegah penyimpanan sampai diselesaikan.
4. IF pilihan manual berbeda dari Slot_Recommendation, THEN THE Warehouse_Module SHALL mewajibkan Warehouse Admin mengisi alasan override sebelum penugasan dapat disimpan.
5. WHEN Warehouse Admin menyimpan penugasan slot, THE Warehouse_Module SHALL mencatat entri Audit_Log yang memuat Actor_Persona, role, bin tujuan, alasan (bila override), dan penanda apakah penugasan berasal dari "accepted-AI" atau "manual-override".
6. WHEN penugasan slot tersimpan, THE Warehouse_Module SHALL memperbarui status Lot menjadi "Stored" dan `current_location` ke bin terpilih, serta membuat record `inventory_moves` yang sesuai.
7. WHERE Lot mengandung material hazard, THE Warehouse_Module SHALL membatasi pilihan manual hanya pada Zone yang `hazard_policy`-nya mengizinkan material tersebut, kecuali override disertai alasan dan tetap memenuhi batasan policy keselamatan.

### Requirement 10: Jalur Entry Manual pada Inbound Intake

**User Story:** Sebagai Receiving Operator, saya ingin mengisi penerimaan melalui form manual lengkap selain jalur ekstraksi AI, sehingga saya tetap dapat mencatat penerimaan ketika input teks atau AI tidak sesuai.

#### Acceptance Criteria

1. WHEN Receiving Operator membuka halaman intake, THE Inbound_Module SHALL menyediakan jalur ekstraksi AI dan jalur Manual_Entry sebagai dua alternatif yang dapat dipilih.
2. WHEN Receiving Operator memilih Manual_Entry, THE Inbound_Module SHALL menampilkan form berisi field supplier, material, quantity, unit, batch reference, arrival date, temperature requirement, dan hazard class.
3. WHEN Receiving Operator mengirim form Manual_Entry, THE Inbound_Module SHALL memvalidasi material dan supplier terhadap Master_Data sebelum membuat Receipt.
4. IF material atau supplier pada Manual_Entry tidak ditemukan di Master_Data, THEN THE Inbound_Module SHALL menampilkan peringatan validasi yang jelas sebelum Receiving Operator melanjutkan.
5. IF field wajib pada Manual_Entry kosong atau tidak valid, THEN THE Inbound_Module SHALL mencegah pengiriman dan menandai field yang bermasalah.
6. WHEN Receipt berhasil dibuat melalui Manual_Entry, THE Inbound_Module SHALL menyetel status Receipt ke "Pending QC" dan mencatat entri Audit_Log dengan Actor_Persona, role, action, entity, dan change_detail yang menandai sumber "Manual Entry".
7. THE Inbound_Module SHALL TIDAK memerlukan layanan AI eksternal untuk menyelesaikan jalur Manual_Entry.

---

**Kelompok C — UI/UX Redesign**

### Requirement 11: Redesign Panel QC Analysis menjadi Vertical Flow

**User Story:** Sebagai QC Staff, saya ingin panel QC Analysis tersusun memanjang ke bawah, sehingga rekomendasi AI, metrik, dan Visual QC analyzer nyaman dibaca di desktop maupun mobile.

#### Acceptance Criteria

1. THE QC_Module SHALL menyusun area QC Analysis dalam alur vertikal (vertical flow) yang memanjang ke bawah alih-alih terjepit dalam kotak ber-scroll yang sempit.
2. WHEN QC Staff melihat panel QC Analysis, THE QC_Module SHALL menampilkan AI recommendation card, metrik (colour, defect, foreign matter), dan Visual QC analyzer secara berurutan tanpa terpotong di area sempit.
3. WHILE aplikasi ditampilkan pada viewport mobile, THE QC_Module SHALL menyusun konten QC Analysis dalam satu kolom yang dapat di-scroll secara wajar.
4. WHILE aplikasi ditampilkan pada viewport desktop, THE QC_Module SHALL memanfaatkan ruang layar sehingga AI recommendation dan Visual QC analyzer terbaca tanpa nested scroll yang menjepit.
5. THE QC_Module SHALL mempertahankan seluruh fungsi keputusan QC yang ada (Approve, Recheck, Block) setelah redesign.

### Requirement 12: Pengayaan AI Operations Summary

**User Story:** Sebagai Operations Manager, saya ingin AI Summary yang kaya dan dapat diekspor, sehingga saya memperoleh laporan harian siap-manajemen lengkap dengan KPI, item butuh perhatian, dan rekomendasi tindakan.

#### Acceptance Criteria

1. WHEN Operations Manager menghasilkan ringkasan, THE Summary_Module SHALL menampilkan ringkasan per-modul untuk intake, QC, warehouse, cold-chain, dan dispatch.
2. WHEN Operations Manager menghasilkan ringkasan, THE Summary_Module SHALL menampilkan KPI ringkas yang diturunkan dari record operasional nyata.
3. WHEN Operations Manager menghasilkan ringkasan, THE Summary_Module SHALL menampilkan daftar item yang butuh perhatian beserta tautan menuju record terkait.
4. WHEN Operations Manager menghasilkan ringkasan, THE Summary_Module SHALL menampilkan rekomendasi tindakan yang diturunkan dari kondisi operasional saat itu.
5. WHEN Operations Manager memilih export atau print, THE Summary_Module SHALL menghasilkan laporan yang dapat diekspor atau dicetak berisi ringkasan yang ditampilkan.
6. WHEN ringkasan berhasil dibuat, THE Summary_Module SHALL mencatat entri Audit_Log dengan Actor_Persona, role, action, dan change_detail.
7. IF layanan AI eksternal tidak tersedia, THEN THE Summary_Module SHALL menghasilkan ringkasan terstruktur melalui AI_Fallback deterministik dari record nyata.
8. IF peran pengguna tidak lolos `canGenerateSummary`, THEN THE Summary_Module SHALL mencegah pembuatan ringkasan dan menampilkan pesan akses yang jelas.

### Requirement 13: Pass Desain Konsisten Lintas Halaman

**User Story:** Sebagai pengguna aplikasi, saya ingin tampilan dan perilaku yang konsisten di seluruh halaman, sehingga aplikasi terasa rapi dan profesional saat dinilai juri.

#### Acceptance Criteria

1. THE BatchNexus SHALL menerapkan hierarki visual yang konsisten (judul halaman, deskripsi, dan penempatan aksi utama) di seluruh modul.
2. WHEN sebuah daftar atau panel tidak memiliki data, THE BatchNexus SHALL menampilkan empty state yang informatif pada modul terkait.
3. WHILE data sedang dimuat, THE BatchNexus SHALL menampilkan loading state yang konsisten pada modul terkait.
4. WHILE aplikasi ditampilkan pada viewport mobile, THE BatchNexus SHALL menjaga seluruh modul utama tetap dapat digunakan dan terbaca (responsif).
5. THE BatchNexus SHALL menggunakan komponen bersama yang konsisten untuk badge status, kartu, tombol, dan modal di seluruh modul.
6. THE BatchNexus SHALL menyediakan atribut aksesibilitas dasar (label pada kontrol interaktif dan urutan fokus yang wajar) pada kontrol interaktif utama.

---

**Kelompok D — Enterprise Readiness**

### Requirement 14: Penguatan Sinyal Enterprise-Ready

**User Story:** Sebagai Operations Manager, saya ingin RBAC, audit trail, penegakan policy, dan human-in-the-loop terlihat jelas, sehingga aplikasi membuktikan kesiapan enterprise kepada juri.

#### Acceptance Criteria

1. THE BatchNexus SHALL menampilkan indikator peran aktif yang jelas dan menerapkan RBAC_Service secara konsisten pada akses modul dan aksi.
2. WHEN aksi kritis dilakukan (create, approve, assign, override, dispatch, intake manual, acknowledge), THE BatchNexus SHALL mencatat entri Audit_Log berisi `actor` (Actor_Persona dari `getActorName`), `role`, `action`, `entity`, dan `change_detail`.
3. WHEN sebuah aksi melanggar policy (hazard/suhu/quarantine), THE BatchNexus SHALL menampilkan pelanggaran policy tersebut secara terlihat pada modul terkait.
4. WHEN sebuah output AI ditampilkan, THE BatchNexus SHALL menampilkan penanda human-in-the-loop yang menegaskan bahwa keputusan final memerlukan persetujuan manusia.
5. IF peran pengguna tidak memiliki kapabilitas untuk sebuah aksi, THEN THE BatchNexus SHALL menonaktifkan kontrol aksi tersebut dan menampilkan alasan keterbatasan akses.
6. THE Audit_Log SHALL menyertakan aksi intake manual (Requirement 10) dan slotting manual/override (Requirement 9) sebagai entri yang dapat ditelusuri.

---

**Kelompok Cross-Cutting — AI Fallback & Kompatibilitas Data**

### Requirement 15: AI Fallback Deterministik di Semua Jalur AI

**User Story:** Sebagai tim demo, saya ingin setiap fitur AI tetap berfungsi tanpa koneksi atau API key, sehingga demo live tidak gagal ketika DaaS atau layanan AI mati.

#### Acceptance Criteria

1. IF DaaS tidak tersedia saat membaca data, THEN THE Data_Layer SHALL mengambil data dari Fallback_Store.
2. IF DaaS tidak tersedia saat membuat atau memperbarui data, THEN THE Data_Layer SHALL menulis perubahan ke Fallback_Store.
3. IF layanan AI eksternal tidak tersedia pada jalur intake, QC, slotting, summary, atau copilot, THEN THE BatchNexus SHALL menghasilkan output melalui AI_Fallback deterministik tanpa API key.
4. THE BatchNexus SHALL menyelesaikan seluruh aksi kritis tanpa bergantung pada ketersediaan layanan eksternal.

### Requirement 16: Kompatibilitas Data dan SEED_VERSION

**User Story:** Sebagai developer, saya ingin perubahan skema tetap kompatibel dengan fallback store dan seed, sehingga data demo tidak menjadi kosong atau usang setelah update.

#### Acceptance Criteria

1. WHERE sebuah requirement mengubah bentuk data yang disimpan, THE Seed_Data SHALL menaikkan nilai `SEED_VERSION`.
2. WHEN `SEED_VERSION` pada Seed_Data lebih baru daripada versi tersimpan, THE Fallback_Store SHALL melakukan reseed otomatis pada pemuatan berikutnya.
3. THE Seed_Data SHALL tetap menyediakan record contoh yang konsisten untuk setiap koleksi yang skemanya berubah, sehingga seluruh layar tetap terisi.
4. THE BatchNexus SHALL menjaga field lama yang masih dibaca kode existing tetap tersedia ketika menambah field baru.

---

**Kelompok E — Stretch / Nice-to-have**

### Requirement 17: Recall / Impact Simulation pada Lots (Opsional)

**User Story:** Sebagai Customer Service, saya ingin mensimulasikan dampak recall sebuah lot, sehingga saya dapat mengidentifikasi pelanggan dan sample terdampak dengan cepat.

#### Acceptance Criteria

1. WHERE fitur Recall/Impact diaktifkan, THE Lots_Module SHALL menampilkan daftar pelanggan dan sample dispatch yang terdampak oleh Lot terpilih.
2. WHEN Customer Service menjalankan simulasi recall pada sebuah Lot, THE Lots_Module SHALL menurunkan daftar dampak dari record `sample_dispatches` yang tertaut ke Lot tersebut.
3. WHEN Customer Service mengekspor hasil simulasi recall, THE Lots_Module SHALL menghasilkan berkas ekspor berisi pelanggan dan sample terdampak.
4. IF tidak ada dispatch yang tertaut ke Lot, THEN THE Lots_Module SHALL menampilkan keadaan "tidak ada dampak" yang informatif.

### Requirement 18: Acknowledge Cold-chain Alert (Opsional)

**User Story:** Sebagai Warehouse Admin, saya ingin meng-acknowledge alert cold-chain, sehingga status zona diperbarui dan tindak lanjut tercatat di audit.

#### Acceptance Criteria

1. WHERE fitur acknowledge diaktifkan, THE Warehouse_Module SHALL menyediakan aksi acknowledge pada Zone berstatus Cold_Chain_Alert.
2. WHEN Warehouse Admin meng-acknowledge sebuah Cold_Chain_Alert, THE Warehouse_Module SHALL memperbarui status Zone untuk menandakan alert telah ditangani.
3. WHEN Warehouse Admin meng-acknowledge sebuah Cold_Chain_Alert, THE Warehouse_Module SHALL mencatat entri Audit_Log dengan Actor_Persona, role, entity Zone, dan change_detail.
4. IF peran pengguna tidak memiliki kapabilitas slotting/warehouse, THEN THE Warehouse_Module SHALL mencegah aksi acknowledge dan menampilkan alasan keterbatasan akses.

### Requirement 19: Lot Genealogy Mini-Graph (Opsional)

**User Story:** Sebagai Operations Manager, saya ingin melihat genealogy mini-graph sebuah lot, sehingga saya memahami keterkaitan upstream dan downstream secara sekilas.

#### Acceptance Criteria

1. WHERE fitur genealogy diaktifkan, THE Lots_Module SHALL menampilkan graf ringkas yang menautkan node upstream (receipt, QC) ke node downstream (warehouse, dispatch) untuk Lot terpilih.
2. THE Lots_Module SHALL menurunkan node dan keterkaitan graf dari record nyata yang tertaut melalui `source_receipt_id` dan `lot_id`.
3. WHEN Operations Manager memilih sebuah node pada graf, THE Lots_Module SHALL menampilkan informasi ringkas record yang diwakili node tersebut.
4. IF sebuah tahap belum memiliki record (mis. belum ada dispatch), THEN THE Lots_Module SHALL menandai node tahap tersebut sebagai belum tersedia tanpa menampilkan error.
