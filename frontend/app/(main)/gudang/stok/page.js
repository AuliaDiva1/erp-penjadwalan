'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ProgressBar } from 'primereact/progressbar';
import FormUpdateStock from './components/FormUpdateStock';
import RiwayatPemakaianDialog from './components/RiwayatPemakaianDialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function StokGudangPage() {
  const toast = useRef(null);
  const [materials,          setMaterials]          = useState([]);
  const [operationTypes,     setOperationTypes]     = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [globalFilter,       setGlobalFilter]       = useState('');
  const [filterOpType,       setFilterOpType]       = useState(null);
  const [stockDialogVisible, setStockDialogVisible] = useState(false);
  const [riwayatVisible,     setRiwayatVisible]     = useState(false);
  const [selectedData,       setSelectedData]       = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [resMat, resOp] = await Promise.all([
        fetch(`${BASE_URL}/materials`,       { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${BASE_URL}/operation-types`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const [dataMat, dataOp] = await Promise.all([resMat.json(), resOp.json()]);
      if (dataMat.success) setMaterials(dataMat.data);
      if (dataOp.success)  setOperationTypes(dataOp.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const opTypeOptions = [
    { label: 'Semua Operasi', value: null },
    { label: 'Tanpa Operasi', value: '__none__' },
    ...operationTypes.map((o) => ({
      label: `${o.kode_operasi} - ${o.nama_operasi}`,
      value: o.id,
    })),
  ];

  const filteredMaterials = materials.filter((m) => {
    if (filterOpType === null)       return true;
    if (filterOpType === '__none__') return !m.operation_type_id;
    return m.operation_type_id === filterOpType;
  });

  const stats = {
    total:  filteredMaterials.length,
    aman:   filteredMaterials.filter(m => m.current_stock > m.min_stock_level).length,
    kritis: filteredMaterials.filter(m => m.current_stock <= m.min_stock_level && m.current_stock > 0).length,
    habis:  filteredMaterials.filter(m => m.current_stock === 0).length,
  };

  const handleUpdateStock = async (payload) => {
    const res  = await fetch(`${BASE_URL}/materials/${selectedData.id}/stock`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      if (data.warning)
        toast.current.show({ severity: 'warn', summary: 'Peringatan Stok', detail: data.warning, life: 6000 });
      setStockDialogVisible(false);
      fetchAll();
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
    return <span style={{ color: s.color }} className="font-semibold">{row.current_stock} {row.nama_satuan}</span>;
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

  const opTypeTemplate = (row) =>
    row.nama_operasi
      ? <Tag value={row.nama_operasi} severity="info" />
      : <span className="text-color-secondary text-sm">—</span>;

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="text-sm text-color-secondary">Total {filteredMaterials.length} bahan baku</span>
      <div className="flex align-items-center gap-2 flex-wrap">
        <Dropdown
          value={filterOpType}
          options={opTypeOptions}
          onChange={(e) => setFilterOpType(e.value)}
          placeholder="Filter Jenis Operasi"
          style={{ width: '220px' }}
        />
        <Button icon="pi pi-refresh" text onClick={fetchAll} tooltip="Refresh" loading={loading} />
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
        <h2 className="m-0 mb-1">Data Stok Bahan Baku</h2>
        <p className="m-0 text-color-secondary text-sm">Pantau dan perbarui stok bahan baku sesuai kondisi gudang</p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Bahan Baku', value: stats.total,  icon: 'pi-box',                 color: '#6366f1', bg: '#eef2ff' },
          { label: 'Stok Aman',        value: stats.aman,   icon: 'pi-check-circle',         color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Stok Kritis',      value: stats.kritis, icon: 'pi-exclamation-triangle', color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Stok Habis',       value: stats.habis,  icon: 'pi-times-circle',         color: '#ef4444', bg: '#fef2f2' },
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
          value={filteredMaterials}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          stripedRows
          globalFilter={globalFilter}
          filters={{ global: { value: globalFilter, matchMode: 'contains' } }}
          header={header}
          emptyMessage="Belum ada data bahan baku"
          sortField="current_stock"
          sortOrder={1}
        >
          <Column field="kode_bahan_baku" header="Kode"            sortable style={{ width: '110px', fontWeight: 600 }} />
          <Column field="material_name"   header="Nama Bahan Baku" sortable />
          <Column field="nama_operasi"    header="Jenis Operasi"   body={opTypeTemplate} sortable />
          <Column field="nama_satuan"     header="Satuan"          body={(row) => `${row.kode_satuan} - ${row.nama_satuan}`} />
          <Column field="current_stock"   header="Stok Saat Ini"   body={stokTemplate}   sortable />
          <Column field="min_stock_level" header="Batas Minimum"   body={(row) => `${row.min_stock_level} ${row.nama_satuan}`} sortable />
          <Column header="Progress Stok"  body={progressTemplate}  style={{ minWidth: '180px' }} />
          <Column
            header="Status"
            body={(row) => { const s = getStokStatus(row); return <Tag value={s.label} severity={s.severity} />; }}
            sortable sortField="current_stock"
          />
          <Column
            header="Aksi"
            style={{ width: '120px' }}
            body={(row) => (
              <div className="flex gap-1">
                <Button
                  icon="pi pi-box"
                  rounded text severity="warning"
                  tooltip="Update Stok"
                  onClick={() => { setSelectedData(row); setStockDialogVisible(true); }}
                />
                <Button
                  icon="pi pi-history"
                  rounded text severity="info"
                  tooltip="Riwayat Pemakaian"
                  onClick={() => { setSelectedData(row); setRiwayatVisible(true); }}
                />
              </div>
            )}
          />
        </DataTable>
      </div>

      <FormUpdateStock
        visible={stockDialogVisible}
        onHide={() => setStockDialogVisible(false)}
        onSave={handleUpdateStock}
        selectedData={selectedData}
      />

      <RiwayatPemakaianDialog
        visible={riwayatVisible}
        onHide={() => setRiwayatVisible(false)}
        material={selectedData}
      />
    </div>
  );
}