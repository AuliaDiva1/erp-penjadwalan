'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';
import FormUpdateStock from '../components/FormUpdateStock';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function StokKritisPage() {
  const toast = useRef(null);
  const [materials, setMaterials]           = useState([]);
  const [loading, setLoading]               = useState(false);
  const [globalFilter, setGlobalFilter]     = useState('');
  const [stockDialogVisible, setStockDialogVisible] = useState(false);
  const [selectedData, setSelectedData]     = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchKritis = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/materials/low-stock`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setMaterials(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data stok kritis' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKritis(); }, []);

  const stats = {
    total:  materials.length,
    kritis: materials.filter(m => m.current_stock > 0 && m.current_stock <= m.min_stock_level).length,
    habis:  materials.filter(m => m.current_stock === 0).length,
  };

  const handleUpdateStock = async (payload) => {
    const res  = await fetch(`${BASE_URL}/materials/${selectedData.id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      if (data.warning) {
        toast.current.show({ severity: 'warn', summary: 'Peringatan Stok', detail: data.warning, life: 6000 });
      }
      setStockDialogVisible(false);
      fetchKritis();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const getStokStatus = (row) => {
    if (row.current_stock === 0)                  return { label: 'Habis',  severity: 'danger',  color: '#ef4444' };
    if (row.current_stock <= row.min_stock_level) return { label: 'Kritis', severity: 'warning', color: '#f59e0b' };
    return                                               { label: 'Aman',   severity: 'success', color: '#22c55e' };
  };

  const stokTemplate = (row) => {
    const s = getStokStatus(row);
    return (
      <span style={{ color: s.color }} className="font-semibold">
        {row.current_stock} {row.nama_satuan}
      </span>
    );
  };

  const progressTemplate = (row) => {
    const pct = Math.min(Math.round((row.current_stock / (row.min_stock_level * 2)) * 100), 100);
    const s   = getStokStatus(row);
    return (
      <div className="flex align-items-center gap-2" style={{ minWidth: 140 }}>
        <ProgressBar
          value={pct}
          showValue={false}
          style={{ height: '6px', flex: 1, background: 'var(--surface-border)' }}
          color={s.color}
        />
        <span className="text-sm" style={{ minWidth: 36 }}>{pct}%</span>
      </div>
    );
  };

  const selisihTemplate = (row) => {
    const selisih = row.min_stock_level - row.current_stock;
    return (
      <span className="font-semibold text-red-500">
        -{selisih} {row.nama_satuan}
      </span>
    );
  };

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-box"
      rounded text severity="warning"
      tooltip="Update Stok"
      onClick={() => { setSelectedData(row); setStockDialogVisible(true); }}
    />
  );

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {materials.length} bahan baku kritis</span>
      <div className="flex align-items-center gap-2">
        <Button icon="pi pi-refresh" text onClick={fetchKritis} tooltip="Refresh" loading={loading} />
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
        <h2 className="m-0 mb-1">Stok Kritis & Habis</h2>
        <p className="m-0 text-color-secondary text-sm">
          Daftar bahan baku yang stoknya di bawah batas minimum atau sudah habis
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Bermasalah', value: stats.total,  icon: 'pi-exclamation-circle',   color: '#6366f1', bg: '#eef2ff' },
          { label: 'Stok Kritis',      value: stats.kritis, icon: 'pi-exclamation-triangle',  color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Stok Habis',       value: stats.habis,  icon: 'pi-times-circle',          color: '#ef4444', bg: '#fef2f2' },
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

      {materials.length === 0 && !loading ? (
        <div className="card flex flex-column align-items-center justify-content-center p-6 gap-3">
          <i className="pi pi-check-circle" style={{ fontSize: '3rem', color: '#22c55e' }} />
          <h3 className="m-0">Semua Stok Aman</h3>
          <p className="m-0 text-color-secondary">Tidak ada bahan baku yang kritis atau habis saat ini</p>
        </div>
      ) : (
        <div className="card">
          <DataTable
            value={materials}
            loading={loading}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            stripedRows
            globalFilter={globalFilter}
            header={header}
            emptyMessage="Tidak ada stok kritis"
            sortField="current_stock"
            sortOrder={1}
          >
            <Column field="kode_bahan_baku" header="Kode"           sortable style={{ width: '110px', fontWeight: 600 }} />
            <Column field="material_name"   header="Nama Bahan Baku" sortable />
            <Column field="nama_satuan"     header="Satuan"          body={(row) => `${row.kode_satuan} - ${row.nama_satuan}`} />
            <Column field="current_stock"   header="Stok Saat Ini"   body={stokTemplate}    sortable />
            <Column field="min_stock_level" header="Batas Minimum"   body={(row) => `${row.min_stock_level} ${row.nama_satuan}`} sortable />
            <Column header="Kekurangan"     body={selisihTemplate} />
            <Column header="Progress Stok"  body={progressTemplate}  style={{ minWidth: '180px' }} />
            <Column header="Status"         body={(row) => { const s = getStokStatus(row); return <Tag value={s.label} severity={s.severity} />; }} />
            <Column header="Aksi"           body={actionTemplate}    style={{ width: '80px' }} />
          </DataTable>
        </div>
      )}

      <FormUpdateStock
        visible={stockDialogVisible}
        onHide={() => setStockDialogVisible(false)}
        onSave={handleUpdateStock}
        selectedData={selectedData}
      />
    </div>
  );
}