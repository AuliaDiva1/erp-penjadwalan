'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import FormMaterial from './components/FormMaterial';
import FormUpdateStock from './components/FormUpdateStock';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MaterialsPage() {
  const toast = useRef(null);
  const [materials, setMaterials] = useState([]);
  const [satuanList, setSatuanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [stockDialogVisible, setStockDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/materials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setMaterials(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data bahan baku' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSatuan = async () => {
    try {
      const res = await fetch(`${BASE_URL}/satuan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setSatuanList(data.data);
    } catch {}
  };

  useEffect(() => {
    fetchMaterials();
    fetchSatuan();
  }, []);

  const openTambah = () => { setSelectedData(null); setDialogVisible(true); };
  const openEdit = (row) => { setSelectedData(row); setDialogVisible(true); };
  const openUpdateStock = (row) => { setSelectedData(row); setStockDialogVisible(true); };

  const handleSave = async (payload) => {
    const url = selectedData ? `${BASE_URL}/materials/${selectedData.id}` : `${BASE_URL}/materials`;
    const method = selectedData ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      setDialogVisible(false);
      fetchMaterials();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleUpdateStock = async (payload) => {
    const res = await fetch(`${BASE_URL}/materials/${selectedData.id}/stock`, {
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
      fetchMaterials();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus bahan baku ini?',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res = await fetch(`${BASE_URL}/materials/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchMaterials();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const stockTemplate = (row) => {
    const isLow = row.current_stock <= row.min_stock_level;
    return (
      <div className="flex align-items-center gap-2">
        <span className={isLow ? 'text-red-500 font-bold' : ''}>
          {row.current_stock} {row.nama_satuan}
        </span>
        {isLow && <Tag value="Kritis" severity="danger" />}
      </div>
    );
  };

  const actionTemplate = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openEdit(row)} tooltip="Edit" />
      <Button icon="pi pi-box" rounded text severity="warning" onClick={() => openUpdateStock(row)} tooltip="Update Stok" />
      <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDelete(row.id)} tooltip="Hapus" />
    </div>
  );

  return (
    <div className="card">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Master Bahan Baku</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola data stok bahan baku produksi</p>
        </div>
        <Button label="Tambah Bahan Baku" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable value={materials} loading={loading} paginator rows={10} stripedRows emptyMessage="Belum ada data bahan baku">
        <Column field="kode_bahan_baku" header="Kode" style={{ width: '100px' }} />
        <Column field="material_name" header="Nama Bahan Baku" />
        <Column field="nama_satuan" header="Satuan" body={(row) => `${row.kode_satuan} - ${row.nama_satuan}`} />
        <Column header="Stok Saat Ini" body={stockTemplate} />
        <Column field="min_stock_level" header="Batas Minimum" body={(row) => `${row.min_stock_level} ${row.nama_satuan}`} />
        <Column header="Aksi" body={actionTemplate} style={{ width: '140px' }} />
      </DataTable>

      <FormMaterial
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
        satuanList={satuanList}
      />

      <FormUpdateStock
        visible={stockDialogVisible}
        onHide={() => setStockDialogVisible(false)}
        onSave={handleUpdateStock}
        selectedData={selectedData}
      />
    </div>
  );
}