'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }                        from 'primereact/toast';
import { Button }                       from 'primereact/button';
import { Tag }                          from 'primereact/tag';
import { DataTable }                    from 'primereact/datatable';
import { Column }                       from 'primereact/column';
import { InputText }                    from 'primereact/inputtext';
import { Dropdown }                     from 'primereact/dropdown';
import { Dialog }                       from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Calendar }                     from 'primereact/calendar';
import { InputNumber }                  from 'primereact/inputnumber';
import { useRouter }                    from 'next/navigation';
import JobActualForm                    from './components/JobActualForm';
import JobDetailDialog                  from './components/JobDetailDialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_OPTIONS = [
  { label: 'Semua Status',  value: null          },
  { label: 'Pending',       value: 'Pending'     },
  { label: 'Scheduled',     value: 'Scheduled'   },
  { label: 'In Progress',   value: 'In Progress' },
  { label: 'Completed',     value: 'Completed'   },
  { label: 'Delayed',       value: 'Delayed'     },
  { label: 'Failed',        value: 'Failed'      },
];

const STATUS_SEVERITY = {
  Pending:       'warning',
  Scheduled:     'info',
  'In Progress': 'success',
  Completed:     'success',
  Delayed:       'danger',
  Failed:        'danger',
};

const OPERATION_TYPES = [
  { label: 'Additive Manufacturing', value: 'Additive' },
  { label: 'Milling',                value: 'Milling'  },
  { label: 'Grinding',               value: 'Grinding' },
  { label: 'Lathe',                  value: 'Lathe'    },
  { label: 'Drilling',               value: 'Drilling' },
];

const toWIBMySQL = (date) => {
  if (!date) return null;
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 19).replace('T', ' ');
};

export default function RiwayatPesananPage() {
  const toast  = useRef(null);
  const router = useRouter();

  const [jobs,         setJobs]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);

  const [editVisible,   setEditVisible]   = useState(false);
  const [actualVisible, setActualVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedJob,   setSelectedJob]   = useState(null);
  const [saving,        setSaving]        = useState(false);

  const [editForm,   setEditForm]   = useState({});
  const [actualForm, setActualForm] = useState({
    actual_start: null,
    actual_end:   null,
    job_status:   null,
  });

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const resJobs = await fetch(`${BASE_URL}/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const dataJobs = await resJobs.json();
      if (dataJobs.success) setJobs(dataJobs.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const filteredJobs = filterStatus ? jobs.filter(j => j.job_status === filterStatus) : jobs;

  const stats = {
    total:       jobs.length,
    pending:     jobs.filter(j => j.job_status === 'Pending').length,
    scheduled:   jobs.filter(j => j.job_status === 'Scheduled').length,
    in_progress: jobs.filter(j => j.job_status === 'In Progress').length,
    completed:   jobs.filter(j => j.job_status === 'Completed').length,
    delayed:     jobs.filter(j => j.job_status === 'Delayed').length,
  };

  const handleDetail = (job) => {
    setSelectedJob(job);
    setDetailVisible(true);
  };

  const handleEdit = (job) => {
    setSelectedJob(job);
    setEditForm({
      operation_type:       job.operation_type,
      processing_time:      job.processing_time,
      energy_consumption:   job.energy_consumption,
      machine_availability: job.machine_availability,
      deadline:             job.deadline ? new Date(job.deadline) : null,
    });
    setEditVisible(true);
  };

  const handleActual = (job) => {
    setSelectedJob(job);
    setActualForm({
      actual_start: job.actual_start ? new Date(job.actual_start) : null,
      actual_end:   job.actual_end   ? new Date(job.actual_end)   : null,
      job_status:   job.job_status,
    });
    setActualVisible(true);
  };

  const handleQuickStatus = async (job, newStatus) => {
    try {
      const now  = new Date();
      const body = { job_status: newStatus };

      if (newStatus === 'In Progress') body.actual_start = toWIBMySQL(now);
      if (newStatus === 'Completed')   body.actual_end   = toWIBMySQL(now);

      const res  = await fetch(`${BASE_URL}/jobs/${job.id}/actual`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: `Job ${job.job_id} → ${newStatus}` });
        fetchJobs();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal update status' });
    }
  };

  const handleReschedule = (job) => {
    confirmDialog({
      message:         `Reschedule job ${job.job_id}? Job akan dikembalikan ke Pending dan dijadwal ulang saat pipeline dijalankan.`,
      header:          'Konfirmasi Reschedule',
      icon:            'pi pi-refresh',
      acceptLabel:     'Ya, Reschedule',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        try {
          const res  = await fetch(`${BASE_URL}/jobs/${job.id}/reschedule`, {
            method:  'PATCH',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json();
          if (data.success) {
            toast.current.show({
              severity: 'success',
              summary:  'Reschedule Berhasil',
              detail:   `Job ${job.job_id} dikembalikan ke Pending. ${data.data.idle_machines_available} mesin idle tersedia.`,
            });
            fetchJobs();
          } else {
            toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
          }
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal reschedule job' });
        }
      },
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs/${selectedJob.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          ...editForm,
          deadline: editForm.deadline ? toWIBMySQL(editForm.deadline) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Job berhasil diperbarui' });
        setEditVisible(false);
        fetchJobs();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActual = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs/${selectedJob.id}/actual`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({
          actual_start: actualForm.actual_start ? toWIBMySQL(actualForm.actual_start) : null,
          actual_end:   actualForm.actual_end   ? toWIBMySQL(actualForm.actual_end)   : null,
          job_status:   actualForm.job_status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Data aktual berhasil disimpan' });
        setActualVisible(false);
        fetchJobs();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (job) => {
    confirmDialog({
      message:         `Yakin ingin menghapus job ${job.job_id}?`,
      header:          'Konfirmasi Hapus',
      icon:            'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel:     'Ya, Hapus',
      rejectLabel:     'Batal',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/jobs/${job.id}`, {
          method:  'DELETE',
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

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const statusTemplate = (row) => (
    <Tag value={row.job_status} severity={STATUS_SEVERITY[row.job_status] || 'info'} />
  );

  const actionTemplate = (row) => (
    <div className="flex gap-1">
      <Button icon="pi pi-eye" rounded text severity="info" tooltip="Detail"
        onClick={() => handleDetail(row)} />

      <Button icon="pi pi-pencil" rounded text severity="secondary" tooltip="Edit"
        disabled={['In Progress', 'Completed'].includes(row.job_status)}
        onClick={() => handleEdit(row)} />

      {row.job_status === 'Scheduled' && (
        <Button icon="pi pi-play" rounded text severity="success" tooltip="Mulai (In Progress)"
          onClick={() => confirmDialog({
            message:     `Mulai job ${row.job_id} sekarang?`,
            header:      'Konfirmasi Mulai',
            icon:        'pi pi-play',
            acceptLabel: 'Ya, Mulai',
            rejectLabel: 'Batal',
            accept:      () => handleQuickStatus(row, 'In Progress'),
          })}
        />
      )}

      {row.job_status === 'In Progress' && (
        <Button icon="pi pi-check" rounded text severity="success" tooltip="Selesai (Completed)"
          onClick={() => confirmDialog({
            message:     `Tandai job ${row.job_id} sebagai Completed?`,
            header:      'Konfirmasi Selesai',
            icon:        'pi pi-check-circle',
            acceptLabel: 'Ya, Selesai',
            rejectLabel: 'Batal',
            accept:      () => handleQuickStatus(row, 'Completed'),
          })}
        />
      )}

      {['Delayed', 'Failed'].includes(row.job_status) && (
        <Button icon="pi pi-refresh" rounded text severity="warning" tooltip="Reschedule"
          onClick={() => handleReschedule(row)} />
      )}

      <Button icon="pi pi-clock" rounded text severity="warning" tooltip="Input Aktual"
        onClick={() => handleActual(row)} />

      <Button icon="pi pi-trash" rounded text severity="danger" tooltip="Hapus"
        disabled={['Completed', 'In Progress'].includes(row.job_status)}
        onClick={() => handleDelete(row)} />
    </div>
  );

  const header = (
    <div className="flex justify-content-between align-items-center flex-wrap gap-2">
      <span className="text-sm text-color-secondary">Total {filteredJobs.length} job</span>
      <div className="flex align-items-center gap-2 flex-wrap">
        <Dropdown
          value={filterStatus}
          options={STATUS_OPTIONS}
          onChange={(e) => setFilterStatus(e.value)}
          placeholder="Filter Status"
          style={{ width: '160px' }}
        />
        <Button icon="pi pi-refresh" text onClick={fetchJobs} loading={loading} tooltip="Refresh" />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari job..."
            style={{ width: '200px' }}
          />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Riwayat Pesanan</h2>
          <p className="m-0 text-color-secondary text-sm">Kelola semua job produksi</p>
        </div>
        <Button label="Input Job Baru" icon="pi pi-plus" onClick={() => router.push('/manajer/job/tambah')} />
      </div>

      {/* STAT CARDS */}
      <div className="grid mb-4">
        {[
          { label: 'Total',       value: stats.total,       color: '#6366f1', bg: '#eef2ff', icon: 'pi-list'                },
          { label: 'Pending',     value: stats.pending,     color: '#f59e0b', bg: '#fffbeb', icon: 'pi-clock'               },
          { label: 'Scheduled',   value: stats.scheduled,   color: '#3b82f6', bg: '#eff6ff', icon: 'pi-calendar'            },
          { label: 'In Progress', value: stats.in_progress, color: '#22c55e', bg: '#f0fdf4', icon: 'pi-spin pi-cog'         },
          { label: 'Completed',   value: stats.completed,   color: '#22c55e', bg: '#f0fdf4', icon: 'pi-check-circle'        },
          { label: 'Delayed',     value: stats.delayed,     color: '#ef4444', bg: '#fef2f2', icon: 'pi-exclamation-triangle' },
        ].map((s, i) => (
          <div key={i} className="col-6 md:col-4 lg:col-2">
            <div
              className="card p-3 flex align-items-center gap-2 cursor-pointer"
              style={{ borderLeft: `4px solid ${s.color}` }}
              onClick={() => setFilterStatus(s.label === 'Total' ? null : s.label)}
            >
              <div className="flex align-items-center justify-content-center border-round"
                style={{ width: 36, height: 36, background: s.bg, flexShrink: 0 }}>
                <i className={`pi ${s.icon}`} style={{ fontSize: '1rem', color: s.color }} />
              </div>
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-color-secondary text-xs">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TABEL */}
      <div className="card">
        <DataTable
          value={filteredJobs}
          loading={loading}
          paginator rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          globalFilter={globalFilter}
          header={header}
          emptyMessage="Belum ada data job"
          sortField="created_at" sortOrder={-1}
          rowClassName={(row) => ['Delayed', 'Failed'].includes(row.job_status) ? 'bg-red-50' : ''}
        >
          <Column field="job_id"          header="Job ID"         sortable style={{ fontWeight: 600, width: '100px' }} />
          <Column field="operation_type"  header="Operasi"        sortable style={{ width: '110px' }} />
          <Column
            field="assigned_machine_name"
            header="Mesin"
            body={(r) => r.assigned_machine_name || r.machine_name || '-'}  // ← FIX
          />
          <Column field="processing_time" header="Proc Time"      body={(r) => `${r.processing_time} mnt`} sortable style={{ width: '100px' }} />
          <Column field="job_status"      header="Status"         body={statusTemplate} sortable style={{ width: '110px' }} />
          <Column field="scheduled_start" header="Jadwal Mulai"   body={(r) => formatDate(r.scheduled_start)} sortable />
          <Column field="deadline"        header="Deadline"       body={(r) => formatDate(r.deadline)} sortable />
          <Column field="actual_start"    header="Aktual Mulai"   body={(r) => formatDate(r.actual_start)} />
          <Column field="actual_end"      header="Aktual Selesai" body={(r) => formatDate(r.actual_end)} />
          <Column header="Aksi"           body={actionTemplate}   style={{ width: '210px' }} />
        </DataTable>
      </div>

      <JobDetailDialog
        visible={detailVisible}
        onHide={() => setDetailVisible(false)}
        job={selectedJob}
      />

      {/* DIALOG EDIT — tanpa field Mesin, sesuai pipeline CCEA */}
      <Dialog
        header={`Edit Job: ${selectedJob?.job_id}`}
        visible={editVisible}
        style={{ width: '520px' }}
        modal onHide={() => setEditVisible(false)}
        draggable={false} dismissableMask
      >
        <div className="p-fluid">
          <div className="field mb-3">
            <label className="font-bold block mb-2">Operation Type</label>
            <Dropdown
              value={editForm.operation_type}
              options={OPERATION_TYPES}
              onChange={(e) => setEditForm(p => ({ ...p, operation_type: e.value }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Mesin: read-only, dari hasil pipeline */}
          <div className="field mb-3">
            <label className="font-bold block mb-2">Mesin (dari Pipeline CCEA)</label>
            <InputText
              value={selectedJob?.assigned_machine_name || selectedJob?.assigned_machine_id || 'Belum dijadwalkan'}
              disabled
              style={{ width: '100%' }}
            />
          </div>

          <div className="formgrid grid">
            <div className="field col-6">
              <label className="font-bold block mb-2">Processing Time (mnt)</label>
              <InputNumber
                value={editForm.processing_time}
                onValueChange={(e) => setEditForm(p => ({ ...p, processing_time: e.value }))}
                min={20} max={120} showButtons style={{ width: '100%' }}
              />
            </div>
            <div className="field col-6">
              <label className="font-bold block mb-2">Energy (kWh)</label>
              <InputNumber
                value={editForm.energy_consumption}
                onValueChange={(e) => setEditForm(p => ({ ...p, energy_consumption: e.value }))}
                minFractionDigits={2} style={{ width: '100%' }}
              />
            </div>
            <div className="field col-6">
              <label className="font-bold block mb-2">Availability (%)</label>
              <InputNumber
                value={editForm.machine_availability}
                onValueChange={(e) => setEditForm(p => ({ ...p, machine_availability: e.value }))}
                min={80} max={99} style={{ width: '100%' }}
              />
            </div>
            <div className="field col-6">
              <label className="font-bold block mb-2">Deadline</label>
              <Calendar
                value={editForm.deadline}
                onChange={(e) => setEditForm(p => ({ ...p, deadline: e.value }))}
                showTime hourFormat="24" showIcon style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="flex justify-content-end gap-2 mt-3">
            <Button label="Batal" icon="pi pi-times" className="p-button-text"
              onClick={() => setEditVisible(false)} disabled={saving} />
            <Button
              label={saving ? 'Menyimpan...' : 'Simpan'}
              icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
              onClick={handleSaveEdit} disabled={saving}
            />
          </div>
        </div>
      </Dialog>

      <JobActualForm
        visible={actualVisible}
        onHide={() => setActualVisible(false)}
        selectedJob={selectedJob}
        actualForm={actualForm}
        setActualForm={setActualForm}
        onSave={handleSaveActual}
        saving={saving}
      />
    </div>
  );
}