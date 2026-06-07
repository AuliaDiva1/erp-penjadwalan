'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import FormOperationType from './components/FormOperationType';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function OperationTypesPage() {
  const toast = useRef(null);
  const [operationTypes, setOperationTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchOperationTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/operation-types`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setOperationTypes(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data operation type' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOperationTypes(); }, []);

  const openTambah = () => { setSelectedData(null); setDialogVisible(true); };
  const openEdit = (row) => { setSelectedData(row); setDialogVisible(true); };

  const handleSave = async (payload) => {
    const url = selectedData ? `${BASE_URL}/operation-types/${selectedData.id}` : `${BASE_URL}/operation-types`;
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
      fetchOperationTypes();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus operation type ini? Material yang terhubung akan kehilangan relasi operasinya.',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res = await fetch(`${BASE_URL}/operation-types/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchOperationTypes();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const statusTemplate = (row) => (
    <Tag value={row.is_active ? 'Aktif' : 'Nonaktif'} severity={row.is_active ? 'success' : 'secondary'} />
  );

  const processingTimeTemplate = (row) => (
    <span>{row.min_processing_time} – {row.max_processing_time} menit</span>
  );

  const energyTemplate = (row) => (
    <span>{row.energy_rate_default != null ? `${row.energy_rate_default} kWh` : '-'}</span>
  );

  const actionTemplate = (row) => (
    <div className="flex gap-2">
      <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => openEdit(row)} tooltip="Edit" />
      <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleDelete(row.id)} tooltip="Hapus" />
    </div>
  );

  return (
    <div className="card">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Master Operation Type</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola jenis operasi produksi dan parameternya</p>
        </div>
        <Button label="Tambah Operation Type" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable
        value={operationTypes}
        loading={loading}
        paginator
        rows={10}
        stripedRows
        emptyMessage="Belum ada data operation type"
      >
        <Column field="kode_operasi" header="Kode" style={{ width: '100px' }} />
        <Column field="nama_operasi" header="Nama Operasi" />
        <Column field="deskripsi" header="Deskripsi" body={(row) => row.deskripsi || '-'} />
        <Column header="Processing Time" body={processingTimeTemplate} />
        <Column header="Energy Rate Default" body={energyTemplate} />
        <Column header="Status" body={statusTemplate} style={{ width: '100px' }} />
        <Column header="Aksi" body={actionTemplate} style={{ width: '120px' }} />
      </DataTable>

      <FormOperationType
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
      />
    </div>
  );
}
