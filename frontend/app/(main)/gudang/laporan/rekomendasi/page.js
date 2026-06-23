'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { useRouter } from 'next/navigation';
import PrintLaporanRekomendasiGudang from '../print/PrintLaporanKebutuhanGudang';
import PDFViewer from '../print/PDFViewer';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RekomendasiPengadaanPage() {
  const toast   = useRef(null);
  const router  = useRouter();
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [globalFilter,  setGlobalFilter]  = useState('');
  const [printVisible,  setPrintVisible]  = useState(false);
  const [pdfUrl,        setPdfUrl]        = useState(null);
  const [fileName,      setFileName]      = useState('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/materials/procurement-recommendation`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data rekomendasi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = {
    total:  data.length,
    urgent: data.filter(d => d.perlu_pengadaan).length,
    aman:   data.filter(d => !d.perlu_pengadaan).length,
  };

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4 flex align-items-center justify-content-between">
        <div>
          <div className="flex align-items-center gap-2 mb-1">
            <Button icon="pi pi-arrow-left" text size="small" onClick={() => router.push('/gudang/laporan')} />
            <h2 className="m-0">Rekomendasi Pengadaan</h2>
          </div>
          <p className="m-0 text-color-secondary text-sm ml-5">
            Berdasarkan histori pemakaian produksi 90 hari terakhir
          </p>
        </div>
        <Button
          label="Cetak PDF"
          icon="pi pi-print"
          onClick={() => setPrintVisible(true)}
          style={{ background: '#10b981', borderColor: '#10b981' }}
        />
      </div>

      {/* Stats */}
      <div className="grid mb-4">
        {[
          { label: 'Total Material',    value: stats.total,  icon: 'pi-box',              color: '#6366f1', bg: '#eef2ff' },
          { label: 'Perlu Pengadaan',   value: stats.urgent, icon: 'pi-exclamation-circle', color: '#ef4444', bg: '#fef2f2' },
          { label: 'Stok Masih Aman',   value: stats.aman,   icon: 'pi-check-circle',     color: '#22c55e', bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-4">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="flex align-items-center justify-content-center border-round" style={{ width: 48, height: 48, background: s.bg }}>
                <i className={`pi ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card p-3 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
        <div className="flex align-items-start gap-2">
          <i className="pi pi-info-circle mt-1" style={{ color: '#10b981' }} />
          <div className="text-sm" style={{ color: '#065f46' }}>
            <b>Cara membaca rekomendasi:</b> Qty Mingguan = rata-rata pemakaian per hari × 7. Qty Bulanan = rata-rata pemakaian per hari × 30.
            Stok cukup hari = estimasi berapa hari stok saat ini akan habis berdasarkan rata-rata pemakaian.
            Material dengan stok cukup ≤ 7 hari ditandai <b>Perlu Pengadaan</b>.
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="card">
        <DataTable
          value={data}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          stripedRows
          globalFilter={globalFilter}
          filters={{ global: { value: globalFilter, matchMode: 'contains' } }}
          emptyMessage="Belum ada data histori pemakaian produksi"
          sortField="stok_cukup_hari"
          sortOrder={1}
          header={
            <div className="flex justify-content-between align-items-center">
              <span className="text-sm text-color-secondary">Total {data.length} material</span>
              <div className="flex gap-2 align-items-center">
                <Button icon="pi pi-refresh" text onClick={fetchData} loading={loading} tooltip="Refresh" />
                <span className="p-input-icon-left">
                  <i className="pi pi-search" />
                  <InputText
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Cari material..."
                    style={{ width: '200px' }}
                  />
                </span>
              </div>
            </div>
          }
        >
          <Column field="kode_bahan_baku" header="Kode"         sortable style={{ width: '100px', fontWeight: 600 }} />
          <Column field="material_name"   header="Bahan Baku"   sortable />
          <Column
            field="current_stock"
            header="Stok Saat Ini"
            sortable
            body={(row) => <span className="font-semibold">{row.current_stock} {row.nama_satuan}</span>}
          />
          <Column
            field="rata_per_hari"
            header="Rata-rata/Hari"
            sortable
            body={(row) => <span>{row.rata_per_hari} {row.nama_satuan}</span>}
          />
          <Column
            field="rek_mingguan"
            header="Rek. Mingguan"
            sortable
            body={(row) => (
              <span className="font-semibold text-primary">
                {row.rek_mingguan} {row.nama_satuan}
              </span>
            )}
          />
          <Column
            field="rek_bulanan"
            header="Rek. Bulanan"
            sortable
            body={(row) => (
              <span className="font-semibold" style={{ color: '#8b5cf6' }}>
                {row.rek_bulanan} {row.nama_satuan}
              </span>
            )}
          />
          <Column
            field="stok_cukup_hari"
            header="Stok Cukup"
            sortable
            body={(row) => (
              <span className={`font-semibold ${row.stok_cukup_hari <= 7 ? 'text-red-500' : row.stok_cukup_hari <= 14 ? 'text-orange-500' : 'text-green-500'}`}>
                {row.stok_cukup_hari >= 999 ? '∞' : `${row.stok_cukup_hari} hari`}
              </span>
            )}
          />
          <Column
            field="jumlah_transaksi"
            header="Jml Transaksi"
            sortable
            body={(row) => <span className="text-sm text-color-secondary">{row.jumlah_transaksi}x</span>}
          />
          <Column
            header="Status"
            body={(row) => (
              row.perlu_pengadaan
                ? <Tag value="Perlu Pengadaan" severity="danger" />
                : <Tag value="Aman" severity="success" />
            )}
          />
        </DataTable>
      </div>

      <PrintLaporanRekomendasiGudang
        visible={printVisible}
        onHide={() => setPrintVisible(false)}
        setPdfUrl={setPdfUrl}
        setFileName={setFileName}
        setJsPdfPreviewOpen={setPdfPreviewOpen}
        data={data}
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