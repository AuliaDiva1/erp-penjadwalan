'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import FormSatuan from './components/FormSatuan';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100/api';

export default function SatuanPage() {
  const toast = useRef(null);
  const [satuan, setSatuan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchSatuan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/satuan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setSatuan(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data satuan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSatuan(); }, []);

  const openTambah = () => { setSelectedData(null); setDialogVisible(true); };
  const openEdit = (row) => { setSelectedData(row); setDialogVisible(true); };

  const handleSave = async (payload) => {
    const url = selectedData ? `${BASE_URL}/satuan/${selectedData.id}` : `${BASE_URL}/satuan`;
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
      fetchSatuan();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus satuan ini?',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res = await fetch(`${BASE_URL}/satuan/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchSatuan();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

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
          <h2 className="m-0 mb-1">Master Satuan</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola data satuan bahan baku</p>
        </div>
        <Button label="Tambah Satuan" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable value={satuan} loading={loading} paginator rows={10} stripedRows emptyMessage="Belum ada data satuan">
        <Column field="kode_satuan" header="Kode Satuan" style={{ width: '120px' }} />
        <Column field="nama_satuan" header="Nama Satuan" />
        <Column header="Aksi" body={actionTemplate} style={{ width: '100px' }} />
      </DataTable>

      <FormSatuan
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
      />
    </div>
  );
}