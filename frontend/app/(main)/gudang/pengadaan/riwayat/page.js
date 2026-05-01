'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_OPTIONS = [
  { label: 'Semua Status', value: null        },
  { label: 'Pending',      value: 'pending'     },
  { label: 'Diproses',     value: 'in_progress' },
  { label: 'Selesai',      value: 'completed'   },
];

export default function RiwayatPengadaanPage() {
  const toast = useRef(null);
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchRiwayat = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/procurements`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat riwayat pengadaan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRiwayat(); }, []);

  const stats = {
    total:       data.length,
    pending:     data.filter(d => d.status === 'pending').length,
    in_progress: data.filter(d => d.status === 'in_progress').length,
    completed:   data.filter(d => d.status === 'completed').length,
  };

  const filteredData = filterStatus
    ? data.filter(d => d.status === filterStatus)
    : data;

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

  const statusTemplate   = (row) => {
    const s = getStatusConfig(row.status);
    return <Tag value={s.label} severity={s.severity} />;
  };

  const tipeTemplate = (row) => (
    <Tag
      value={row.is_auto ? 'Otomatis' : 'Manual'}
      severity={row.is_auto ? 'info' : 'secondary'}
    />
  );

  const qtyTemplate = (row) => (
    <span className="font-semibold">
      {row.required_qty} {row.nama_satuan}
    </span>
  );

  const stokAwalTemplate = (row) => (
    <span className="text-red-500 font-semibold">
      {row.current_stock_at_trigger} {row.nama_satuan}
    </span>
  );

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="text-sm text-color-secondary">Total {filteredData.length} riwayat</span>
      <div className="flex align-items-center gap-2">
        <Dropdown
          value={filterStatus}
          options={STATUS_OPTIONS}
          onChange={(e) => setFilterStatus(e.value)}
          placeholder="Filter Status"
          style={{ width: '160px' }}
        />
        <Button icon="pi pi-refresh" text onClick={fetchRiwayat} tooltip="Refresh" loading={loading} />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari bahan baku..."
            style={{ width: '200px' }}
          />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Riwayat Pengadaan</h2>
        <p className="m-0 text-color-secondary text-sm">
          Seluruh riwayat permintaan pengadaan bahan baku
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Pengadaan', value: stats.total,       icon: 'pi-list',         color: '#6366f1', bg: '#eef2ff' },
          { label: 'Pending',         value: stats.pending,     icon: 'pi-clock',        color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Diproses',        value: stats.in_progress, icon: 'pi-cog',          color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Selesai',         value: stats.completed,   icon: 'pi-check-circle', color: '#22c55e', bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
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

      <div className="card">
        <DataTable
          value={filteredData}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          globalFilter={globalFilter}
          header={header}
          emptyMessage="Belum ada riwayat pengadaan"
          sortField="created_at"
          sortOrder={-1}
        >
          <Column field="kode_bahan_baku" header="Kode"            sortable style={{ width: '100px', fontWeight: 600 }} />
          <Column field="material_name"   header="Bahan Baku"      sortable />
          <Column header="Stok Saat Notif" body={stokAwalTemplate} />
          <Column header="Qty Dibutuhkan"  body={qtyTemplate} />
          <Column header="Tipe"            body={tipeTemplate} />
          <Column header="Status"          body={statusTemplate}   sortable sortField="status" />
          <Column
            field="handled_by"
            header="Ditangani Oleh"
            body={(row) => row.handled_by || <span className="text-color-secondary">-</span>}
          />
          <Column
            field="notes"
            header="Catatan"
            body={(row) => row.notes || <span className="text-color-secondary">-</span>}
          />
          <Column field="created_at" header="Dibuat"        body={(row) => formatDate(row.created_at)} sortable />
          <Column field="updated_at" header="Diupdate"      body={(row) => formatDate(row.updated_at)} sortable />
        </DataTable>
      </div>
    </div>
  );
}