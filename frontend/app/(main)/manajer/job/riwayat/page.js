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
  Pending: 'warning', Scheduled: 'info', 'In Progress': 'success',
  Completed: 'success', Delayed: 'danger', Failed: 'danger',
};

const OPERATION_TYPES = [
  { label: 'Additive Manufacturing', value: 'Additive' },
  { label: 'Milling',  value: 'Milling'  },
  { label: 'Grinding', value: 'Grinding' },
  { label: 'Lathe',    value: 'Lathe'    },
  { label: 'Drilling', value: 'Drilling' },
];

const STAT_CONFIG = [
  { label: 'Total',       key: 'total',       color: '#6366f1', bg: '#eef2ff', icon: 'pi-th-large',           filterVal: null         },
  { label: 'Pending',     key: 'pending',     color: '#f59e0b', bg: '#fffbeb', icon: 'pi-hourglass',          filterVal: 'Pending'    },
  { label: 'Scheduled',   key: 'scheduled',   color: '#3b82f6', bg: '#eff6ff', icon: 'pi-calendar-clock',     filterVal: 'Scheduled'  },
  { label: 'In Progress', key: 'in_progress', color: '#10b981', bg: '#f0fdf4', icon: 'pi-spin pi-cog',        filterVal: 'In Progress'},
  { label: 'Completed',   key: 'completed',   color: '#22c55e', bg: '#f0fdf4', icon: 'pi-check-circle',       filterVal: 'Completed'  },
  { label: 'Delayed',     key: 'delayed',     color: '#ef4444', bg: '#fef2f2', icon: 'pi-exclamation-circle', filterVal: 'Delayed'    },
];

const toWIBMySQL = (date) => {
  if (!date) return null;
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 19).replace('T', ' ');
};

const formatDate = (val) => val ? new Date(val).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
}) : '-';

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
  const [actualForm, setActualForm] = useState({ actual_start: null, actual_end: null, job_status: null });

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) setJobs(data.data);
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

  const handleDetail = (job) => { setSelectedJob(job); setDetailVisible(true); };

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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
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
            method: 'PATCH', headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json();
          if (data.success) {
            toast.current.show({
              severity: 'success', summary: 'Reschedule Berhasil',
              detail: `Job ${job.job_id} dikembalikan ke Pending. ${data.data.idle_machines_available} mesin idle tersedia.`,
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...editForm, deadline: editForm.deadline ? toWIBMySQL(editForm.deadline) : null }),
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
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
      message: `Yakin ingin menghapus job ${job.job_id}?`,
      header: 'Konfirmasi Hapus', icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger', acceptLabel: 'Ya, Hapus', rejectLabel: 'Batal',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/jobs/${job.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
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
    <Tag value={row.job_status} severity={STATUS_SEVERITY[row.job_status] || 'info'}
      style={{ fontSize: '0.72rem' }} />
  );

  const actionTemplate = (row) => (
    <div style={{ display: 'flex', gap: 2 }}>
      <Button icon="pi pi-eye"    rounded text severity="info"      tooltip="Detail"        tooltipOptions={{ position: 'top' }} onClick={() => handleDetail(row)} />
      <Button icon="pi pi-pencil" rounded text severity="secondary" tooltip="Edit"          tooltipOptions={{ position: 'top' }}
        disabled={['In Progress', 'Completed'].includes(row.job_status)}
        onClick={() => handleEdit(row)} />
      {row.job_status === 'Scheduled' && (
        <Button icon="pi pi-play" rounded text severity="success" tooltip="Mulai" tooltipOptions={{ position: 'top' }}
          onClick={() => confirmDialog({
            message: `Mulai job ${row.job_id} sekarang?`, header: 'Konfirmasi Mulai',
            icon: 'pi pi-play', acceptLabel: 'Ya, Mulai', rejectLabel: 'Batal',
            accept: () => handleQuickStatus(row, 'In Progress'),
          })} />
      )}
      {row.job_status === 'In Progress' && (
        <Button icon="pi pi-check" rounded text severity="success" tooltip="Selesai" tooltipOptions={{ position: 'top' }}
          onClick={() => confirmDialog({
            message: `Tandai job ${row.job_id} sebagai Completed?`, header: 'Konfirmasi Selesai',
            icon: 'pi pi-check-circle', acceptLabel: 'Ya, Selesai', rejectLabel: 'Batal',
            accept: () => handleQuickStatus(row, 'Completed'),
          })} />
      )}
      {['Delayed', 'Failed'].includes(row.job_status) && (
        <Button icon="pi pi-refresh" rounded text severity="warning" tooltip="Reschedule" tooltipOptions={{ position: 'top' }}
          onClick={() => handleReschedule(row)} />
      )}
      <Button icon="pi pi-clock" rounded text severity="warning" tooltip="Input Aktual" tooltipOptions={{ position: 'top' }}
        onClick={() => handleActual(row)} />
      <Button icon="pi pi-trash" rounded text severity="danger" tooltip="Hapus" tooltipOptions={{ position: 'top' }}
        disabled={['Completed', 'In Progress'].includes(row.job_status)}
        onClick={() => handleDelete(row)} />
    </div>
  );

  const tableHeader = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {filterStatus && (
          <Tag value={filterStatus} severity={STATUS_SEVERITY[filterStatus] || 'info'}
            style={{ fontSize: '0.72rem' }} />
        )}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
          {filteredJobs.length} job ditemukan
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Dropdown
          value={filterStatus} options={STATUS_OPTIONS}
          onChange={(e) => setFilterStatus(e.value)}
          placeholder="Filter Status" style={{ width: 150 }}
        />
        <Button icon="pi pi-refresh" text onClick={fetchJobs} loading={loading} tooltip="Refresh" tooltipOptions={{ position: 'top' }} />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari job..." style={{ width: 200 }} />
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 4, fontSize: '1.4rem', fontWeight: 700 }}>Riwayat Pesanan</h2>
          <p style={{ margin: 0, color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
            Kelola semua job produksi
          </p>
        </div>
        <Button label="Job Baru" icon="pi pi-plus" size="small"
          onClick={() => router.push('/manajer/job/tambah')} />
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        {STAT_CONFIG.map((s) => (
          <div
            key={s.key}
            onClick={() => setFilterStatus(s.filterVal)}
            style={{
              background: 'var(--surface-card)',
              border: `1px solid var(--surface-border)`,
              borderLeft: `3px solid ${s.color}`,
              borderRadius: 10, padding: '12px 14px',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
              boxShadow: filterStatus === s.filterVal
                ? `0 0 0 2px ${s.color}40`
                : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {s.label}
              </span>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: s.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`pi ${s.icon}`} style={{ fontSize: '0.75rem', color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {stats[s.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <DataTable
          value={filteredJobs}
          loading={loading}
          paginator rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          globalFilter={globalFilter}
          header={tableHeader}
          emptyMessage="Belum ada data job"
          sortField="created_at" sortOrder={-1}
          size="small"
          rowClassName={(row) =>
            ['Delayed', 'Failed'].includes(row.job_status) ? 'surface-overlay' : ''
          }
          style={{ fontSize: '0.85rem' }}
        >
          <Column field="job_id"         header="Job ID"          sortable style={{ fontWeight: 600, width: 100 }} />
          <Column field="operation_type" header="Operasi"         sortable style={{ width: 110 }} />
         <Column header="Mesin"
            body={(r) => {
              const name = r.assigned_machine_name || r.machine_name;
              const id   = r.assigned_machine_id;
              if (name) return name;
              if (id)   return `Mesin #${id}`;
              return <span style={{ color: 'var(--text-color-secondary)' }}>—</span>;
            }}
          />
        <Column field="processing_time" header="Proc Time"
            body={(r) => `${r.processing_time} mnt`} sortable style={{ width: 95 }} />
          <Column field="job_status" header="Status" body={statusTemplate} sortable style={{ width: 110 }} />
          <Column field="scheduled_start" header="Jadwal Mulai"
            body={(r) => formatDate(r.scheduled_start)} sortable />
        <Column field="deadline_predicted" header="Deadline"
          body={(r) => formatDate(r.deadline_customer || r.deadline_predicted)} 
          sortable 
        />
          <Column field="actual_start" header="Aktual Mulai"
            body={(r) => formatDate(r.actual_start)} />
          <Column field="actual_end" header="Aktual Selesai"
            body={(r) => formatDate(r.actual_end)} />
          <Column header="Aksi" body={actionTemplate} style={{ width: 220 }} />
        </DataTable>
      </div>

      <JobDetailDialog visible={detailVisible} onHide={() => setDetailVisible(false)} job={selectedJob} />

      {/* Dialog Edit */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#f1f5f9', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="pi pi-pencil" style={{ fontSize: '0.85rem', color: '#64748b' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>Edit Job</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
                {selectedJob?.job_id}
              </div>
            </div>
          </div>
        }
        visible={editVisible} style={{ width: 500 }}
        modal onHide={() => setEditVisible(false)}
        draggable={false} dismissableMask
        contentStyle={{ padding: '1rem 1.5rem' }}
      >
        <div className="p-fluid">
          <div className="field mb-3">
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Operation Type
            </label>
            <Dropdown
              value={editForm.operation_type} options={OPERATION_TYPES}
              onChange={(e) => setEditForm(p => ({ ...p, operation_type: e.value }))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="field mb-3">
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mesin (dari pipeline CCEA)
            </label>
            <InputText
              value={selectedJob?.assigned_machine_name || selectedJob?.assigned_machine_id || 'Belum dijadwalkan'}
              disabled style={{ width: '100%' }}
            />
          </div>

          <div className="formgrid grid">
            <div className="field col-6">
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Processing Time (mnt)
              </label>
              <InputNumber value={editForm.processing_time}
                onValueChange={(e) => setEditForm(p => ({ ...p, processing_time: e.value }))}
                min={20} max={120} showButtons style={{ width: '100%' }} />
            </div>
            <div className="field col-6">
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Energy (kWh)
              </label>
              <InputNumber value={editForm.energy_consumption}
                onValueChange={(e) => setEditForm(p => ({ ...p, energy_consumption: e.value }))}
                minFractionDigits={2} style={{ width: '100%' }} />
            </div>
            <div className="field col-6">
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Availability (%)
              </label>
              <InputNumber value={editForm.machine_availability}
                onValueChange={(e) => setEditForm(p => ({ ...p, machine_availability: e.value }))}
                min={80} max={99} style={{ width: '100%' }} />
            </div>
            <div className="field col-6">
              <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Deadline
              </label>
              <Calendar value={editForm.deadline}
                onChange={(e) => setEditForm(p => ({ ...p, deadline: e.value }))}
                showTime hourFormat="24" showIcon style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 8,
            marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--surface-border)',
          }}>
            <Button label="Batal" icon="pi pi-times" className="p-button-text p-button-sm"
              onClick={() => setEditVisible(false)} disabled={saving} />
            <Button
              label={saving ? 'Menyimpan...' : 'Simpan'}
              icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
              className="p-button-sm"
              onClick={handleSaveEdit} disabled={saving}
            />
          </div>
        </div>
      </Dialog>

      <JobActualForm
        visible={actualVisible} onHide={() => setActualVisible(false)}
        selectedJob={selectedJob} actualForm={actualForm} setActualForm={setActualForm}
        onSave={handleSaveActual} saving={saving}
      />
    </div>
  );
}