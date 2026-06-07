'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import FormKonfirmasi from './components/FormKonfirmasi';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NotifikasiPengadaanPage() {
  const toast = useRef(null);
  const [data,    setData]               = useState([]);
  const [loading, setLoading]            = useState(false);
  const [globalFilter, setGlobalFilter]  = useState('');
  const [konfirmasiVisible, setKonfirmasiVisible] = useState(false);
  const [selectedData, setSelectedData]  = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchNotifikasi = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/procurements/pending`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat notifikasi pengadaan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifikasi(); }, []);

  const stats = {
    total:       data.length,
    pending:     data.filter(d => d.status === 'pending').length,
    in_progress: data.filter(d => d.status === 'in_progress').length,
  };

  const handleUpdateStatus = async (payload) => {
    try {
      const res  = await fetch(`${BASE_URL}/procurements/${selectedData.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Status pengadaan diperbarui' });
        setKonfirmasiVisible(false);
        fetchNotifikasi();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memperbarui status' });
    }
  };

  const getStatusConfig = (status) => {
    const map = {
      pending:     { label: 'Pending',  severity: 'warning' },
      in_progress: { label: 'Diproses', severity: 'info'    },
      completed:   { label: 'Selesai',  severity: 'success' },
    };
    return map[status] || { label: status, severity: 'info' };
  };

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {data.length} notifikasi aktif</span>
      <div className="flex align-items-center gap-2">
        <Button icon="pi pi-refresh" text onClick={fetchNotifikasi} tooltip="Refresh" loading={loading} />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari bahan baku..."
            style={{ width: '220px' }}
          />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Notifikasi Pengadaan</h2>
        <p className="m-0 text-color-secondary text-sm">
          Daftar permintaan pengadaan bahan baku yang perlu ditindaklanjuti
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Notifikasi', value: stats.total,       icon: 'pi-bell',  color: '#6366f1', bg: '#eef2ff' },
          { label: 'Pending',          value: stats.pending,     icon: 'pi-clock', color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Sedang Diproses',  value: stats.in_progress, icon: 'pi-cog',   color: '#3b82f6', bg: '#eff6ff' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-4">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: 48, height: 48, background: s.bg }}
              >
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

      {data.length === 0 && !loading ? (
        <div className="card flex flex-column align-items-center justify-content-center p-6 gap-3">
          <i className="pi pi-check-circle" style={{ fontSize: '3rem', color: '#22c55e' }} />
          <h3 className="m-0">Tidak Ada Notifikasi</h3>
          <p className="m-0 text-color-secondary">Semua pengadaan sudah ditangani</p>
        </div>
      ) : (
        <div className="card">
          <DataTable
            value={data}
            loading={loading}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            stripedRows
            globalFilter={globalFilter}
            header={header}
            emptyMessage="Tidak ada notifikasi pengadaan"
            sortField="created_at"
            sortOrder={-1}
          >
            <Column field="kode_bahan_baku" header="Kode"           sortable style={{ width: '100px', fontWeight: 600 }} />
            <Column field="material_name"   header="Bahan Baku"     sortable />
            <Column
              header="Stok Saat Notif"
              body={(row) => (
                <span className="font-semibold text-red-500">
                  {row.current_stock_at_trigger} {row.nama_satuan}
                </span>
              )}
            />
            <Column
              header="Qty Dibutuhkan"
              body={(row) => (
                <span className="font-semibold text-primary">
                  +{row.required_qty} {row.nama_satuan}
                </span>
              )}
            />
            <Column
              header="Tipe"
              body={(row) => (
                <Tag value={row.is_auto ? 'Otomatis' : 'Manual'} severity={row.is_auto ? 'info' : 'secondary'} />
              )}
            />
            <Column
              header="Status"
              body={(row) => {
                const s = getStatusConfig(row.status);
                return <Tag value={s.label} severity={s.severity} />;
              }}
            />
            <Column
              field="created_at"
              header="Tanggal"
              body={(row) => <span className="text-sm text-color-secondary">{formatDate(row.created_at)}</span>}
              sortable
            />
            <Column
              header="Aksi"
              style={{ width: '80px' }}
              body={(row) => (
                <Button
                  icon="pi pi-check-circle"
                  rounded text severity="success"
                  tooltip="Proses Pengadaan"
                  onClick={() => { setSelectedData(row); setKonfirmasiVisible(true); }}
                />
              )}
            />
          </DataTable>
        </div>
      )}

      <FormKonfirmasi
        visible={konfirmasiVisible}
        onHide={() => setKonfirmasiVisible(false)}
        onSave={handleUpdateStatus}
        selectedData={selectedData}
      />
    </div>
  );
}