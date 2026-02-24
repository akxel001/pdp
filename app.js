/**
 * SISTEM PDP — PT ATRI PASIFIK
 * app.js — Shared utilities, email notification, audit trail
 * Sesuai UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi
 */

// ============================================================
// UTILITY: SESSION & USER
// ============================================================
function getCurrentUser() {
  const u = sessionStorage.getItem('pdp_user');
  return u ? JSON.parse(u) : { name: 'Admin PDP', role: 'admin', email: 'admin@atripasifik.co.id' };
}

function requireAuth() {
  if (!sessionStorage.getItem('pdp_user')) {
    window.location.href = 'index.html';
  }
}

function logout() {
  addAuditLog('LOGOUT', `User ${getCurrentUser().email} keluar dari sistem`);
  sessionStorage.removeItem('pdp_user');
  window.location.href = 'index.html';
}

// ============================================================
// UTILITY: SIDEBAR & NAVIGATION
// ============================================================
function initSidebar() {
  const user = getCurrentUser();
  const userNameEl = document.getElementById('sidebarUserName');
  const userRoleEl = document.getElementById('sidebarUserRole');
  const userAvatarEl = document.getElementById('sidebarUserAvatar');

  if (userNameEl) userNameEl.textContent = user.name || 'Admin PDP';
  if (userRoleEl) userRoleEl.textContent = (user.role || 'admin').toUpperCase();
  if (userAvatarEl) userAvatarEl.textContent = (user.name || 'A')[0].toUpperCase();

  // Mark active nav item
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('href') === currentPage) item.classList.add('active');
  });
}

// ============================================================
// UTILITY: TOAST NOTIFICATIONS
// ============================================================
function showToast(title, msg, type = 'success', duration = 4000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', email: '📧' };
  let tc = document.getElementById('toastContainer');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toastContainer';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : ''}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><div class="toast-text"><h5>${title}</h5><p>${msg}</p></div>`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, duration);
}

// ============================================================
// UTILITY: AUDIT TRAIL
// ============================================================
function addAuditLog(action, desc, extra = {}) {
  const user = getCurrentUser();
  const logs = JSON.parse(localStorage.getItem('pdp_audit') || '[]');
  logs.unshift({
    id: Date.now(),
    action,
    desc,
    user: user.name || '-',
    email: user.email || '-',
    role: user.role || '-',
    time: new Date().toISOString(),
    ip: '192.168.1.' + Math.floor(Math.random() * 100 + 1),
    ...extra
  });
  if (logs.length > 500) logs.pop();
  localStorage.setItem('pdp_audit', JSON.stringify(logs));
}

// ============================================================
// EMAIL NOTIFICATION SYSTEM
// Simulasi pengiriman email (dapat disambung ke EmailJS untuk produksi)
// ============================================================
const EmailNotif = {
  /**
   * Kirim notifikasi email ke subjek data
   * @param {Object} config - { to, toName, type, requestId, requestType, status, reason, dpoContact }
   */
  send(config) {
    const {
      to, toName, type = 'consent', requestId, requestType,
      status, reason = '', dpoContact = 'dpo@atripasifik.co.id'
    } = config;

    // Log email ke audit trail
    addAuditLog('EMAIL_SENT', `Notifikasi email dikirim ke ${to} — Status: ${status}`, { target: to });

    // Simpan ke riwayat email
    const emailHistory = JSON.parse(localStorage.getItem('pdp_emails') || '[]');
    const emailRecord = {
      id: 'EML-' + Date.now(),
      to, toName, type, requestId, requestType, status, reason,
      sentAt: new Date().toISOString(),
      sentBy: getCurrentUser().name
    };
    emailHistory.unshift(emailRecord);
    if (emailHistory.length > 100) emailHistory.pop();
    localStorage.setItem('pdp_emails', JSON.stringify(emailHistory));

    // Tampilkan preview modal email
    this.showEmailPreviewModal(emailRecord, dpoContact);

    return emailRecord;
  },

  /** Tampilkan modal preview email sebelum "terkirim" */
  showEmailPreviewModal(rec, dpoContact) {
    const isApproved = rec.status === 'DISETUJUI';
    const statusText = isApproved ? 'DISETUJUI ✅' : 'DITOLAK ❌';
    const statusColor = isApproved ? '#10B981' : '#EF4444';
    const typeLabel = rec.type === 'consent' ? 'Persetujuan Data' : 'Permintaan Hak Data';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'emailPreviewModal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-icon info">📧</div>
          <div>
            <div class="modal-title">Notifikasi Email Terkirim</div>
            <div class="modal-subtitle">Email sedang dikirimkan ke subjek data</div>
          </div>
          <button class="modal-close" onclick="closeEmailModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert-strip success" style="margin-bottom:16px;">
            ✅ Email berhasil dikirim ke <strong>${rec.to}</strong> pada ${formatDateTime(rec.sentAt)}
          </div>
          <div class="email-preview">
            <div class="email-preview-header">
              <h4>📧 Preview Email — Sistem PDP PT Atri Pasifik</h4>
              <p>Kepada: ${rec.toName} &lt;${rec.to}&gt;</p>
            </div>
            <div class="email-preview-body">
              <div class="email-meta">
                <p><strong>Dari:</strong> noreply-pdp@atripasifik.co.id</p>
                <p><strong>Kepada:</strong> ${rec.toName} &lt;${rec.to}&gt;</p>
                <p><strong>Subjek:</strong> [PDP Atri Pasifik] Status ${typeLabel} Anda — ${statusText}</p>
                <p><strong>Tanggal:</strong> ${formatDateTime(rec.sentAt)}</p>
                <p><strong>ID Referensi:</strong> ${rec.requestId}</p>
              </div>
              <hr style="border:none;border-top:1px solid #DDE3F0;margin:12px 0;">
              <div class="email-content">
                <p>Yth. <strong>${rec.toName}</strong>,</p>
                <br>
                <p>Kami dari Tim Perlindungan Data Pribadi PT Atri Pasifik memberitahukan bahwa <strong>${typeLabel}</strong> Anda dengan ID Referensi <strong>${rec.requestId}</strong> telah diproses.</p>
                <br>
                <div class="email-highlight" style="border-left:4px solid ${statusColor}; background:${isApproved ? '#D1FAE5' : '#FEE2E2'}; color:${statusColor};">
                  Status: <strong>${statusText}</strong>
                  ${rec.requestType ? `<br>Jenis: ${rec.requestType}` : ''}
                  ${rec.reason ? `<br>Keterangan: ${rec.reason}` : ''}
                </div>
                <p>Sesuai dengan <strong>UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi</strong>, Anda berhak untuk mengajukan keberatan atau pertanyaan lebih lanjut.</p>
                <br>
                <p><strong>Kontak DPO (Data Protection Officer):</strong><br>
                  📧 ${dpoContact}<br>
                  🏢 PT Atri Pasifik — Divisi Kepatuhan & Privasi
                </p>
                <br>
                <p style="font-size:11px;color:#8A97B8;">Email ini dikirim secara otomatis oleh Sistem PDP PT Atri Pasifik. Jangan balas email ini. Bila ada pertanyaan, hubungi DPO kami di atas.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" onclick="closeEmailModal()">Tutup</button>
          <button class="btn btn-primary btn-sm" onclick="closeEmailModal(); showToast('Email Terkirim', 'Notifikasi berhasil dikirim ke ${rec.to}', 'email')">OK, Mengerti</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
};

function closeEmailModal() {
  const m = document.getElementById('emailPreviewModal');
  if (m) m.remove();
}

// ============================================================
// MODAL UTILITIES
// ============================================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// ============================================================
// DATA UTILITIES
// ============================================================
function formatDate(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function generateId(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
}
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Badge HTML helper
function badge(text, type) { return `<span class="badge badge-${type}">${text}</span>`; }
function statusBadge(status) {
  const map = {
    'DISETUJUI': 'success', 'AKTIF': 'success', 'SELESAI': 'success',
    'DITOLAK': 'danger', 'DICABUT': 'danger', 'KRITIS': 'danger',
    'MENUNGGU': 'warning', 'PROSES': 'warning', 'INVESTIGASI': 'warning',
    'RANCANGAN': 'default', 'ARSIP': 'default',
    'RENDAH': 'info', 'SEDANG': 'warning', 'TINGGI': 'danger',
  };
  return badge(status, map[status] || 'default');
}

// ============================================================
// INIT DEMO DATA (jika localStorage kosong)
// ============================================================
function initDemoData() {
  // Demo Consent
  if (!localStorage.getItem('pdp_consents')) {
    const consents = [
      { id: 'CNS-2024-001', subjek: 'Ahmad Fauzi', email: 'ahmad.fauzi@gmail.com', jenis: 'Pemasaran & Promosi', tujuan: 'Pengiriman newsletter dan penawaran produk', dasar: 'Persetujuan (Pasal 20)', status: 'DISETUJUI', tanggal: '2024-12-15', kedaluwarsa: '2025-12-15', dept: 'Marketing' },
      { id: 'CNS-2024-002', subjek: 'Siti Rahayu', email: 'siti.rahayu@yahoo.com', jenis: 'Analitik Data', tujuan: 'Analisis perilaku pengguna untuk pengembangan produk', dasar: 'Kepentingan Sah (Pasal 21)', status: 'DISETUJUI', tanggal: '2024-11-20', kedaluwarsa: '2025-11-20', dept: 'IT' },
      { id: 'CNS-2024-003', subjek: 'Budi Santoso', email: 'budi.santoso@hotmail.com', jenis: 'Profil SDM', tujuan: 'Pengelolaan data karyawan & penggajian', dasar: 'Kontrak (Pasal 20)', status: 'MENUNGGU', tanggal: '2025-01-10', kedaluwarsa: '2026-01-10', dept: 'HR' },
      { id: 'CNS-2024-004', subjek: 'Diana Putri', email: 'diana.putri@gmail.com', jenis: 'Layanan Pelanggan', tujuan: 'Penanganan komplain dan dukungan pelanggan', dasar: 'Kontrak', status: 'DICABUT', tanggal: '2024-09-05', kedaluwarsa: '2025-09-05', dept: 'CS' },
      { id: 'CNS-2025-005', subjek: 'Rendi Wijaya', email: 'rendi.wijaya@gmail.com', jenis: 'Pihak Ketiga', tujuan: 'Berbagi data dengan mitra logistik', dasar: 'Persetujuan', status: 'MENUNGGU', tanggal: '2025-02-01', kedaluwarsa: '2026-02-01', dept: 'Procurement' },
    ];
    localStorage.setItem('pdp_consents', JSON.stringify(consents));
  }

  // Demo DSR
  if (!localStorage.getItem('pdp_dsr')) {
    const dsrs = [
      { id: 'DSR-2024-001', subjek: 'Ahmad Fauzi', email: 'ahmad.fauzi@gmail.com', hak: 'Hak Akses', deskripsi: 'Mohon salinan semua data pribadi saya yang tersimpan', status: 'SELESAI', tglMasuk: '2024-12-10', tglDeadline: '2025-01-09', tglSelesai: '2024-12-28', dept: 'IT', catatan: 'Data dikirim via email terenkripsi' },
      { id: 'DSR-2024-002', subjek: 'Siti Rahayu', email: 'siti.rahayu@yahoo.com', hak: 'Hak Koreksi', deskripsi: 'Nama saya salah ejaan, mohon diperbaiki', status: 'SELESAI', tglMasuk: '2024-11-15', tglDeadline: '2024-12-15', tglSelesai: '2024-11-20', dept: 'HR', catatan: 'Data dikoreksi di semua sistem' },
      { id: 'DSR-2025-003', subjek: 'Budi Santoso', email: 'budi.santoso@hotmail.com', hak: 'Hak Hapus', deskripsi: 'Minta penghapusan data setelah kontrak berakhir', status: 'PROSES', tglMasuk: '2025-01-20', tglDeadline: '2025-02-19', tglSelesai: null, dept: 'Legal', catatan: 'Sedang dikaji aspek hukum' },
      { id: 'DSR-2025-004', subjek: 'Diana Putri', email: 'diana.putri@gmail.com', hak: 'Hak Portabilitas', deskripsi: 'Minta data dalam format JSON/CSV', status: 'MENUNGGU', tglMasuk: '2025-02-15', tglDeadline: '2025-03-17', tglSelesai: null, dept: 'IT', catatan: '' },
      { id: 'DSR-2025-005', subjek: 'Rendi Wijaya', email: 'rendi.wijaya@gmail.com', hak: 'Hak Keberatan', deskripsi: 'Keberatan atas pemrosesan data untuk tujuan pemasaran', status: 'MENUNGGU', tglMasuk: '2025-02-20', tglDeadline: '2025-03-22', tglSelesai: null, dept: 'Marketing', catatan: '' },
    ];
    localStorage.setItem('pdp_dsr', JSON.stringify(dsrs));
  }

  // Demo Inventaris
  if (!localStorage.getItem('pdp_inventaris')) {
    const inv = [
      { id: 'INV-001', nama: 'Data Karyawan', kategori: 'SDM', subKategori: 'Data Umum', jenis: 'Nama, NIK, Alamat, Kontak, Gaji', pemilik: 'HR', penyimpanan: 'HRIS System (On-premise)', retensi: '5 tahun setelah resign', sensitif: 'TIDAK', enkripsi: 'YA', pihakKetiga: 'TIDAK', dasar: 'Kontrak Kerja', risiko: 'RENDAH' },
      { id: 'INV-002', nama: 'Data Kesehatan Karyawan', kategori: 'SDM', subKategori: 'Data Sensitif', jenis: 'Rekam medis, hasil tes kesehatan', pemilik: 'HR', penyimpanan: 'Klinik Mitra (Cloud)', retensi: '10 tahun', sensitif: 'YA', enkripsi: 'YA', pihakKetiga: 'YA', dasar: 'Kewajiban Hukum', risiko: 'TINGGI' },
      { id: 'INV-003', nama: 'Data Pelanggan', kategori: 'Komersial', subKategori: 'Data Umum', jenis: 'Nama, Email, Telepon, Alamat pengiriman', pemilik: 'Marketing', penyimpanan: 'CRM (Cloud AWS)', retensi: '3 tahun', sensitif: 'TIDAK', enkripsi: 'YA', pihakKetiga: 'YA', dasar: 'Persetujuan', risiko: 'SEDANG' },
      { id: 'INV-004', nama: 'Data Transaksi Keuangan', kategori: 'Keuangan', subKategori: 'Data Sensitif', jenis: 'Rekening, data kartu, tagihan', pemilik: 'Finance', penyimpanan: 'ERP System (On-premise)', retensi: '7 tahun', sensitif: 'YA', enkripsi: 'YA', pihakKetiga: 'TIDAK', dasar: 'Kewajiban Hukum', risiko: 'TINGGI' },
      { id: 'INV-005', nama: 'Data Log Akses IT', kategori: 'IT', subKategori: 'Data Teknis', jenis: 'IP Address, log aktivitas, device ID', pemilik: 'IT', penyimpanan: 'SIEM System (On-premise)', retensi: '1 tahun', sensitif: 'TIDAK', enkripsi: 'TIDAK', pihakKetiga: 'TIDAK', dasar: 'Kepentingan Sah', risiko: 'RENDAH' },
    ];
    localStorage.setItem('pdp_inventaris', JSON.stringify(inv));
  }

  // Demo Insiden
  if (!localStorage.getItem('pdp_insiden')) {
    const ins = [
      { id: 'INC-2024-001', judul: 'Kebocoran Data Email Pelanggan', jenis: 'Kebocoran Data', deskripsi: 'File Excel berisi 500 email pelanggan terkirim ke alamat yang salah', tglKejadian: '2024-10-15', tglDiketahui: '2024-10-16', status: 'SELESAI', dampak: 'SEDANG', subjekTerdampak: 500, laporKomnas: 'YA', tglLapor: '2024-10-18', tindakan: 'Email recall, notifikasi subjek, audit akses' },
      { id: 'INC-2025-001', judul: 'Akses Tidak Sah ke Server HR', jenis: 'Akses Tidak Sah', deskripsi: 'Terdeteksi percobaan login berulang ke server HRIS dari IP asing', tglKejadian: '2025-01-22', tglDiketahui: '2025-01-22', status: 'INVESTIGASI', dampak: 'TINGGI', subjekTerdampak: 0, laporKomnas: 'TIDAK', tglLapor: null, tindakan: 'IP diblokir, investigasi forensik digital sedang berjalan' },
      { id: 'INC-2025-002', judul: 'Kehilangan Laptop Berisi Data', jenis: 'Kehilangan Perangkat', deskripsi: 'Laptop karyawan finance hilang berisi data kontrak tidak terenkripsi', tglKejadian: '2025-02-10', tglDiketahui: '2025-02-10', status: 'PROSES', dampak: 'KRITIS', subjekTerdampak: 30, laporKomnas: 'YA', tglLapor: '2025-02-12', tindakan: 'Remote wipe dilakukan, laporan polisi dibuat' },
    ];
    localStorage.setItem('pdp_insiden', JSON.stringify(ins));
  }

  // Demo DPIA
  if (!localStorage.getItem('pdp_dpia')) {
    const dpias = [
      { id: 'DPA-2024-001', nama: 'Implementasi HR Analytics', deskripsi: 'Sistem analitik untuk pemantauan produktivitas karyawan', pemilik: 'HR & IT', tglMulai: '2024-09-01', tglSelesai: '2024-11-30', status: 'SELESAI', skor: 72, level: 'SEDANG', rekomendasi: 'Enkripsi data, batasi akses, informasikan karyawan' },
      { id: 'DPA-2024-002', nama: 'Integrasi CRM Pihak Ketiga', deskripsi: 'Transfer data pelanggan ke vendor CRM baru di cloud', pemilik: 'IT & Marketing', tglMulai: '2024-10-15', tglSelesai: '2025-01-31', status: 'PROSES', skor: 85, level: 'TINGGI', rekomendasi: 'DPA dengan vendor, enkripsi transit, pembatasan transfer lintas negara' },
      { id: 'DPA-2025-001', nama: 'CCTV & Pemantauan Kantor', deskripsi: 'Pemasangan kamera CCTV baru di area operasional', pemilik: 'GA & Legal', tglMulai: '2025-02-01', tglSelesai: null, status: 'RANCANGAN', skor: 45, level: 'RENDAH', rekomendasi: 'Pasang notifikasi area CCTV, retensi tidak lebih 30 hari' },
    ];
    localStorage.setItem('pdp_dpia', JSON.stringify(dpias));
  }

  // Demo Permintaan Data Internal
  if (!localStorage.getItem('pdp_permintaan')) {
    const now = new Date();
    const perms = [
      {
        id: 'PERM-2025-0001',
        pemohon: 'Rina Kusuma', emailPemohon: 'rina.kusuma@atripasifik.co.id',
        dept: 'Marketing', kadiv: 'Hendra Prasetyo',
        tujuan: 'Analisis segmentasi pelanggan untuk kampanye Q1 2025',
        kategori: 'Data Pelanggan (CRM)', dasar: 'Kepentingan Sah Pengendali (Pasal 21)',
        jumlah: '2500', sensitivitas: 'SEDANG',
        tglMulai: '2025-02-01', tglSelesai: '2025-03-31',
        catatan: 'Data hanya digunakan untuk segmentasi, tidak akan dibagikan ke pihak ketiga',
        status: 'DISETUJUI',
        tglDiajukan: new Date(now - 15 * 86400000).toISOString(),
        timeline: [
          { step: 'Pengajuan', status: 'done', by: 'Rina Kusuma', time: new Date(now - 15 * 86400000).toISOString(), note: 'Permohonan diajukan oleh pemohon' },
          { step: 'Disetujui Kepala Divisi', status: 'done', by: 'Hendra Prasetyo (Kadiv Marketing)', time: new Date(now - 13 * 86400000).toISOString(), note: 'Disetujui untuk keperluan kampanye, diteruskan ke DPO' },
          { step: 'Disetujui DPO', status: 'done', by: 'Budi Santoso (DPO)', time: new Date(now - 12 * 86400000).toISOString(), note: 'Akses data diberikan mulai 01 Feb 2025 hingga 31 Mar 2025.' }
        ]
      },
      {
        id: 'PERM-2025-0002',
        pemohon: 'Ahmad Fauzi', emailPemohon: 'ahmad.fauzi@atripasifik.co.id',
        dept: 'IT', kadiv: 'Dodi Hartono',
        tujuan: 'Migrasi data karyawan ke sistem HRIS baru',
        kategori: 'Data Karyawan (Identitas & Kontak)', dasar: 'Kewajiban Hukum (Pasal 20 ayat 3)',
        jumlah: '450', sensitivitas: 'TINGGI',
        tglMulai: '2025-02-15', tglSelesai: '2025-02-28',
        catatan: 'Data akan dienkripsi selama proses migrasi dan dihapus setelah selesai',
        status: 'MENUNGGU_DPO',
        tglDiajukan: new Date(now - 5 * 86400000).toISOString(),
        timeline: [
          { step: 'Pengajuan', status: 'done', by: 'Ahmad Fauzi', time: new Date(now - 5 * 86400000).toISOString(), note: 'Permohonan diajukan oleh pemohon' },
          { step: 'Disetujui Kepala Divisi', status: 'done', by: 'Dodi Hartono (Kadiv IT)', time: new Date(now - 3 * 86400000).toISOString(), note: 'Disetujui — keperluan migrasi sistem kritis, diteruskan ke DPO' }
        ]
      },
      {
        id: 'PERM-2025-0003',
        pemohon: 'Siti Rahayu', emailPemohon: 'siti.rahayu@atripasifik.co.id',
        dept: 'HR', kadiv: 'Wulandari Susanti',
        tujuan: 'Audit internal data penggajian untuk laporan tahunan',
        kategori: 'Data Keuangan & Penggajian', dasar: 'Kewajiban Hukum (Pasal 20 ayat 3)',
        jumlah: '450', sensitivitas: 'TINGGI',
        tglMulai: '2025-03-01', tglSelesai: '2025-03-15',
        catatan: '',
        status: 'MENUNGGU_KADIV',
        tglDiajukan: new Date(now - 1 * 86400000).toISOString(),
        timeline: [
          { step: 'Pengajuan', status: 'done', by: 'Siti Rahayu', time: new Date(now - 1 * 86400000).toISOString(), note: 'Permohonan diajukan oleh pemohon' }
        ]
      },
      {
        id: 'PERM-2025-0004',
        pemohon: 'Dian Pratiwi', emailPemohon: 'dian.pratiwi@atripasifik.co.id',
        dept: 'Finance', kadiv: 'Baskoro Adi',
        tujuan: 'Verifikasi data rekening untuk pembayaran bonus karyawan',
        kategori: 'Data Keuangan & Penggajian', dasar: 'Pemenuhan Kontrak (Pasal 20 ayat 2)',
        jumlah: '200', sensitivitas: 'TINGGI',
        tglMulai: '2025-01-10', tglSelesai: '2025-01-20',
        catatan: 'Akses hanya untuk tim payroll',
        status: 'DITOLAK',
        tglDiajukan: new Date(now - 20 * 86400000).toISOString(),
        timeline: [
          { step: 'Pengajuan', status: 'done', by: 'Dian Pratiwi', time: new Date(now - 20 * 86400000).toISOString(), note: 'Permohonan diajukan oleh pemohon' },
          { step: 'Ditolak DPO', status: 'rejected', by: 'Budi Santoso (DPO)', time: new Date(now - 18 * 86400000).toISOString(), note: 'Permintaan ditolak — data keuangan sensitif harus melalui sistem payroll langsung, bukan akses manual.' }
        ]
      },
      {
        id: 'PERM-2024-0089',
        pemohon: 'Rendi Wijaya', emailPemohon: 'rendi.wijaya@atripasifik.co.id',
        dept: 'Operations', kadiv: 'Teguh Santoso',
        tujuan: 'Rekap data karyawan untuk perencanaan shift tahun 2024',
        kategori: 'Data Karyawan (Identitas & Kontak)', dasar: 'Kepentingan Sah Pengendali (Pasal 21)',
        jumlah: '300', sensitivitas: 'RENDAH',
        tglMulai: '2024-11-01', tglSelesai: '2024-12-31',
        catatan: '',
        status: 'KADALUWARSA',
        tglDiajukan: new Date(now - 90 * 86400000).toISOString(),
        timeline: [
          { step: 'Pengajuan', status: 'done', by: 'Rendi Wijaya', time: new Date(now - 90 * 86400000).toISOString(), note: 'Permohonan diajukan' },
          { step: 'Disetujui Kepala Divisi', status: 'done', by: 'Teguh Santoso (Kadiv Operations)', time: new Date(now - 88 * 86400000).toISOString(), note: '' },
          { step: 'Disetujui DPO', status: 'done', by: 'Budi Santoso (DPO)', time: new Date(now - 87 * 86400000).toISOString(), note: 'Disetujui untuk perencanaan shift. Akses berakhir 31 Des 2024.' }
        ]
      }
    ];
    localStorage.setItem('pdp_permintaan', JSON.stringify(perms));
  }

  // Init audit log
  if (!localStorage.getItem('pdp_audit')) {
    const audit = [
      { id: 1, action: 'SYSTEM_INIT', desc: 'Sistem PDP PT Atri Pasifik diinisialisasi', user: 'System', email: 'system@atripasifik.co.id', role: 'system', time: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1' },
      { id: 2, action: 'CONSENT_APPROVE', desc: 'Persetujuan CNS-2024-001 disetujui (Ahmad Fauzi)', user: 'Admin PDP', email: 'admin@atripasifik.co.id', role: 'admin', time: new Date(Date.now() - 43200000).toISOString(), ip: '192.168.1.10' },
      { id: 3, action: 'EMAIL_SENT', desc: 'Notifikasi email dikirim ke ahmad.fauzi@gmail.com', user: 'Admin PDP', email: 'admin@atripasifik.co.id', role: 'admin', time: new Date(Date.now() - 43100000).toISOString(), ip: '192.168.1.10', target: 'ahmad.fauzi@gmail.com' },
      { id: 4, action: 'DSR_COMPLETE', desc: 'DSR-2024-001 (Hak Akses) diselesaikan', user: 'IT Staff', email: 'it@atripasifik.co.id', role: 'user', time: new Date(Date.now() - 21600000).toISOString(), ip: '192.168.1.25' },
    ];
    localStorage.setItem('pdp_audit', JSON.stringify(audit));
  }
}

// ============================================================
// TABLE SEARCH HELPER
// ============================================================
function filterTable(inputId, tableId) {
  const q = document.getElementById(inputId).value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  initDemoData();
  initSidebar();
});
