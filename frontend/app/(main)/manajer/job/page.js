'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Badge } from 'primereact/badge';
import FormJob from './components/FormJob';
import FormActual from './components/FormActual';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_SEVERITY = {
  Pending:      'warning',
  Scheduled:    'info',
  'In Progress':'info',
  Completed:    'success',
  Delayed:      'danger',
  Failed:       'danger',
};

export default function JobsPage() {
  const toast                                         = useRef(null);
  const [jobs, setJobs]                               = useState([]);
  const [machines, setMachines]                       = useState([]);
  const [materials, setMaterials]                     = useState([]);
  const [loading, setLoading]                         = useState(false);
  const [dialogVisible, setDialogVisible]             = useState(false);
  const [actualDialogVisible, setActualDialogVisible] = useState(false);
  const [selectedData, setSelectedData]               = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data job' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMachines = async () => {
    const res  = await fetch(`${BASE_URL}/machines`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (data.success) setMachines(data.data);
  };

  const fetchMaterials = async () => {
    const res  = await fetch(`${BASE_URL}/materials`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (data.success) setMaterials(data.data);
  };

  useEffect(() => {
    fetchJobs();
    fetchMachines();
    fetchMaterials();
  }, []);

  const openTambah = () => { setSelectedData(null); setDialogVisible(true); };
  const openEdit   = (row) => { setSelectedData(row); setDialogVisible(true); };
  const openActual = (row) => { setSelectedData(row); setActualDialogVisible(true); };

  const handleSave = async (payload) => {
    const url    = selectedData ? `${BASE_URL}/jobs/${selectedData.id}` : `${BASE_URL}/jobs`;
    const method = selectedData ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      if (data.info) {
        setTimeout(() => {
          toast.current.show({ severity: 'info', summary: 'Info', detail: data.info, life: 6000 });
        }, 500);
      }
      setDialogVisible(false);
      fetchJobs();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message, life: 6000 });
    }
  };

  const handleSaveActual = async (payload) => {
    const res  = await fetch(`${BASE_URL}/jobs/${selectedData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
      setActualDialogVisible(false);
      fetchJobs();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleReschedule = (row) => {
    confirmDialog({
      message: `Job ${row.job_id} akan ditandai untuk reschedule. Sistem akan cek mesin idle dan menyusun ulang jadwal. Lanjutkan?`,
      header: 'Konfirmasi Reschedule',
      icon: 'pi pi-refresh',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/jobs/${row.id}/reschedule`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Reschedule', detail: data.data.message, life: 6000 });
          fetchJobs();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const handleDelete = (id) => {
    confirmDialog({
      message: 'Yakin ingin menghapus job ini?',
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/jobs/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchJobs();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const statusTemplate = (row) => (
    <div className="flex align-items-center gap-2">
      <Tag value={row.job_status} severity={STATUS_SEVERITY[row.job_status] || 'info'} />
      {row.is_urgent && <Badge value="URGENT" severity="danger" />}
      {row.deadline_warning && <Badge value="!" severity="warning" tooltip="Deadline tidak realistis" />}
      {row.reschedule_count > 0 && (
        <Badge value={`R${row.reschedule_count}`} severity="info" tooltip={`Di-reschedule ${row.reschedule_count}x`} />
      )}
    </div>
  );

  const deadlineTemplate = (row) => {
    if (!row.deadline) return <span className="text-color-secondary">Auto (RF)</span>;
    const d = new Date(row.deadline);
    return (
      <div>
        <div>{d.toLocaleDateString('id-ID')}</div>
        <small className="text-color-secondary">
          {row.deadline_is_manual ? '📌 Customer' : '🤖 Prediksi RF'}
        </small>
      </div>
    );
  };

  const actionTemplate = (row) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-pencil"
        rounded text severity="info"
        onClick={() => openEdit(row)}
        tooltip="Edit"
        disabled={row.job_status === 'In Progress'}
      />
      <Button
        icon="pi pi-clock"
        rounded text severity="warning"
        onClick={() => openActual(row)}
        tooltip="Input Aktual"
      />
      <Button
        icon="pi pi-refresh"
        rounded text severity="help"
        onClick={() => handleReschedule(row)}
        tooltip="Reschedule"
        disabled={row.job_status === 'Completed' || row.job_status === 'Failed'}
      />
      <Button
        icon="pi pi-trash"
        rounded text severity="danger"
        onClick={() => handleDelete(row.id)}
        tooltip="Hapus"
        disabled={row.job_status === 'In Progress'}
      />
    </div>
  );

  return (
    <div className="card">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Data Pesanan (Jobs)</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola pesanan produksi dan pantau statusnya</p>
        </div>
        <Button label="Tambah Job" icon="pi pi-plus" onClick={openTambah} />
      </div>

      <DataTable
        value={jobs}
        loading={loading}
        paginator rows={10}
        stripedRows
        emptyMessage="Belum ada data job"
        sortField="id" sortOrder={-1}
      >
        <Column field="job_id"            header="Job ID"            style={{ width: '90px' }} />
        <Column field="operation_type"    header="Operation Type" />
        <Column field="machine_name"      header="Mesin"             body={(row) => row.machine_name || '-'} />
        <Column field="material_name"     header="Material"          body={(row) => row.material_name || '-'} />
        <Column field="processing_time"   header="PT (menit)" />
        <Column field="energy_consumption"header="EC (kWh)" />
        <Column field="machine_availability" header="MA (%)" />
        <Column header="Deadline"         body={deadlineTemplate} />
        <Column field="fuzzy_score"       header="Fuzzy Score"       body={(row) => row.fuzzy_score ? row.fuzzy_score.toFixed(2) : '-'} />
        <Column field="makespan"          header="Makespan"          body={(row) => row.makespan ? `${row.makespan} mnt` : '-'} />
        <Column header="Status"           body={statusTemplate} />
        <Column header="Aksi"             body={actionTemplate}      style={{ width: '150px' }} />
      </DataTable>

      <FormJob
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        onSave={handleSave}
        selectedData={selectedData}
        machines={machines}
        materials={materials}
      />

      <FormActual
        visible={actualDialogVisible}
        onHide={() => setActualDialogVisible(false)}
        onSave={handleSaveActual}
        selectedData={selectedData}
      />
    </div>
  );
}