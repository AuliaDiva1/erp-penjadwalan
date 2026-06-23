'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';

import PrintLaporanStokGudang      from './print/PrintLaporanStokGudang';
import PrintLaporanPengadaanGudang from './print/PrintLaporanPengadaanGudang';
import PrintLaporanMutasiGudang    from './print/PrintLaporanMutasiGudang';
import PrintLaporanStokKritisGudang from './print/PrintLaporanStokKritisGudang';
import PDFViewer                   from './print/PDFViewer';

const laporanList = [
  {
    key: 'stok',
    icon: 'pi pi-box',
    title: 'Laporan Stok Bahan Baku',
    description: 'Kondisi stok semua bahan baku hari ini, termasuk stok tersedia, reservasi aktif, batas minimum, dan status (Aman / Kritis / Habis).',
    color: '#6366f1', bg: '#eef2ff',
    badge: 'Real-time', badgeSeverity: 'info',
    ready: true, navigate: false,
  },
  {
    key: 'pengadaan',
    icon: 'pi pi-shopping-cart',
    title: 'Laporan Pengadaan',
    description: 'Riwayat pengadaan bahan baku otomatis maupun manual, status pengadaan (Pending, Diproses, Selesai), dan total kebutuhan material.',
    color: '#f59e0b', bg: '#fffbeb',
    badge: 'Riwayat', badgeSeverity: 'warning',
    ready: true, navigate: false,
  },
  {
    key: 'mutasi',
    icon: 'pi pi-arrow-right-arrow-left',
    title: 'Laporan Mutasi Stok',
    description: 'Riwayat keluar-masuk stok bahan baku — pengurangan akibat pemakaian produksi dan penambahan akibat pengadaan, untuk kebutuhan audit dan rekonsiliasi.',
    color: '#8b5cf6', bg: '#f5f3ff',
    badge: 'Per Periode', badgeSeverity: 'info',
    ready: true, navigate: false,
  },
  {
    key: 'kritis',
    icon: 'pi pi-exclamation-triangle',
    title: 'Laporan Stok Kritis',
    description: 'Daftar bahan baku yang berstatus Kritis atau Habis, disusun khusus untuk keperluan eskalasi cepat ke bagian pembelian atau atasan.',
    color: '#ef4444', bg: '#fef2f2',
    badge: 'Urgent', badgeSeverity: 'danger',
    ready: true, navigate: false,
  },
  {
    key: 'rekomendasi',
    icon: 'pi pi-calendar-plus',
    title: 'Rekomendasi Pengadaan',
    description: 'Rekomendasi qty pengadaan mingguan dan bulanan berdasarkan histori pemakaian produksi 90 hari terakhir, disertai estimasi stok cukup berapa hari.',
    color: '#10b981', bg: '#ecfdf5',
    badge: 'Rekomendasi', badgeSeverity: 'success',
    ready: true, navigate: true,
  },
];

export default function LaporanGudangPage() {
  const toast   = useRef(null);
  const router  = useRouter();

  const [printStokVisible,      setPrintStokVisible]      = useState(false);
  const [printPengadaanVisible, setPrintPengadaanVisible] = useState(false);
  const [printMutasiVisible,    setPrintMutasiVisible]    = useState(false);
  const [printKritisVisible,    setPrintKritisVisible]    = useState(false);
  const [pdfUrl,         setPdfUrl]         = useState(null);
  const [fileName,       setFileName]       = useState('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const handleGenerate = (key) => {
    if (key === 'rekomendasi') { router.push('/gudang/laporan/rekomendasi'); return; }
    if (key === 'stok')        { setPrintStokVisible(true);      return; }
    if (key === 'pengadaan')   { setPrintPengadaanVisible(true); return; }
    if (key === 'mutasi')      { setPrintMutasiVisible(true);    return; }
    if (key === 'kritis')      { setPrintKritisVisible(true);    return; }
    toast.current.show({ severity: 'info', summary: 'Segera Hadir', detail: 'Laporan ini sedang dalam pengembangan.', life: 3000 });
  };

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Laporan Gudang</h2>
        <p className="m-0 text-color-secondary text-sm">{today}</p>
      </div>

      <div className="grid">
        {laporanList.map((item) => (
          <div key={item.key} className="col-12 md:col-6 lg:col-4">
            <div
              className="card p-4 h-full flex flex-column"
              style={{ borderTop: `3px solid ${item.color}`, gap: 0 }}
            >
              <div className="flex align-items-center justify-content-between mb-3">
                <div
                  className="flex align-items-center justify-content-center border-round"
                  style={{ width: 44, height: 44, background: item.bg }}
                >
                  <i className={item.icon} style={{ fontSize: '1.3rem', color: item.color }} />
                </div>
                <Tag value={item.badge} severity={item.badgeSeverity} style={{ fontSize: '0.7rem' }} />
              </div>

              <div className="font-semibold mb-2" style={{ fontSize: '0.95rem', color: 'var(--text-color)' }}>
                {item.title}
              </div>

              <p className="text-color-secondary text-sm m-0 mb-4" style={{ lineHeight: 1.6, flexGrow: 1 }}>
                {item.description}
              </p>

              <div className="flex align-items-center justify-content-between">
                {item.ready ? (
                  <Button
                    label={item.navigate ? 'Lihat Rekomendasi' : 'Generate PDF'}
                    icon={item.navigate ? 'pi pi-arrow-right' : 'pi pi-print'}
                    size="small"
                    onClick={() => handleGenerate(item.key)}
                    style={{ background: item.color, borderColor: item.color }}
                  />
                ) : (
                  <Button label="Segera Hadir" icon="pi pi-clock" size="small" disabled className="p-button-secondary p-button-outlined" />
                )}
                {item.ready && (
                  <span className="text-xs text-color-secondary">
                    <i className="pi pi-check-circle mr-1" style={{ color: '#22c55e' }} />
                    Siap digunakan
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <PrintLaporanStokGudang
        visible={printStokVisible}
        onHide={() => setPrintStokVisible(false)}
        setPdfUrl={setPdfUrl} setFileName={setFileName} setJsPdfPreviewOpen={setPdfPreviewOpen}
      />
      <PrintLaporanPengadaanGudang
        visible={printPengadaanVisible}
        onHide={() => setPrintPengadaanVisible(false)}
        setPdfUrl={setPdfUrl} setFileName={setFileName} setJsPdfPreviewOpen={setPdfPreviewOpen}
      />
      <PrintLaporanMutasiGudang
        visible={printMutasiVisible}
        onHide={() => setPrintMutasiVisible(false)}
        setPdfUrl={setPdfUrl} setFileName={setFileName} setJsPdfPreviewOpen={setPdfPreviewOpen}
      />
      <PrintLaporanStokKritisGudang
        visible={printKritisVisible}
        onHide={() => setPrintKritisVisible(false)}
        setPdfUrl={setPdfUrl} setFileName={setFileName} setJsPdfPreviewOpen={setPdfPreviewOpen}
      />

      <Dialog
        visible={pdfPreviewOpen}
        onHide={() => setPdfPreviewOpen(false)}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-file-pdf text-red-500" />
            <span>{fileName || 'Laporan'}</span>
          </div>
        }
        style={{ width: '92vw', height: '92vh' }}
        modal maximizable
        contentStyle={{ padding: 0, height: 'calc(92vh - 60px)' }}
      >
        <PDFViewer pdfUrl={pdfUrl} fileName={fileName} />
      </Dialog>
    </div>
  );
}