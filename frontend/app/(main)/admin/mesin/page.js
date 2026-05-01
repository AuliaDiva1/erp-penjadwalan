'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import FormMachine from './components/FormMachine';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MachinesPage() {
  const toast = useRef(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/machines`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setMachines(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data mesin' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMachines(); }, []);

  const openTambah = () => {
    setSelectedData(null);
    setDialogVisible(true);
  };

  const openEdit = (machine) => {
    setSelectedData(machine);
    setDialogVisible(true);
  };

  const handleSave = async (payload) => {
    const url = selectedData
      ? `${BASE_URL}/machines/${selectedData.id}`
      : `${BASE_URL}/machines`;
    const method = selectedData ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      setDialogVisible(false);
      fetchMachines();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus mesin ini?',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res = await fetch(`${BASE_URL}/machines/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchMachines();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const handleToggle = async (machine) => {
    const res = await fetch(`${BASE_URL}/machines/${machine.id}/toggle-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      fetchMachines();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const statusTemplate = (row) => (
    <Tag
      value={row.status === 'active' ? 'Aktif' : row.status === 'maintenance' ? 'Maintenance' : 'Nonaktif'}
      severity={row.status === 'active' ? 'success' : row.status === 'maintenance' ? 'warning' : 'danger'}
    />
  );

  const operationTypeTemplate = (row) => {
    const map = {
      Grinding:  'info',
      Additive:  'success',
      Lathe:     'warning',
      Milling:   'danger',
      Drilling:  'secondary',
    };
    return <Tag value={row.operation_type} severity={map[row.operation_type] || 'secondary'} />;
  };

  const actionTemplate = (row) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-pencil"
        rounded text severity="info"
        onClick={() => openEdit(row)}
        tooltip="Edit"
      />
      <Button
        icon={row.status === 'active' ? 'pi pi-ban' : 'pi pi-check-circle'}
        rounded text
        severity={row.status === 'active' ? 'warning' : 'success'}
        onClick={() => handleToggle(row)}
        tooltip={row.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
      />
      <Button
        icon="pi pi-trash"
        rounded text severity="danger"
        onClick={() => handleDelete(row.id)}
        tooltip="Hapus"
      />
    </div>
  );

  return (
    <div className="card">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Manajemen Mesin Produksi</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola data mesin yang tersedia untuk proses produksi</p>
        </div>
        <Button label="Tambah Mesin" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable
        value={machines}
        loading={loading}
        paginator
        rows={10}
        stripedRows
        emptyMessage="Belum ada data mesin"
      >
        <Column field="machine_id" header="Machine ID" style={{ width: '100px' }} />
        <Column field="machine_name" header="Nama Mesin" />
        <Column header="Operation Type" body={operationTypeTemplate} />
        <Column field="capacity_per_hour" header="Kapasitas/Jam" />
        <Column field="energy_rate" header="Energi (kWh)" />
        <Column field="machine_availability" header="Availability (%)" body={(row) => `${row.machine_availability}%`} />
        <Column header="Status" body={statusTemplate} />
        <Column header="Aksi" body={actionTemplate} style={{ width: '140px' }} />
      </DataTable>

      <FormMachine
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
        machineList={machines}
      />
    </div>
  );
}