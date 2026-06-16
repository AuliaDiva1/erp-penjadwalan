// halaman 2: HasilAlgoritmaPage
'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }        from 'primereact/toast';
import { Button }       from 'primereact/button';
import { Tag }          from 'primereact/tag';
import { DataTable }    from 'primereact/datatable';
import { Column }       from 'primereact/column';
import { Dropdown }     from 'primereact/dropdown';
import { InputText }    from 'primereact/inputtext';
import { ProgressBar }  from 'primereact/progressbar';
import { Dialog }       from 'primereact/dialog';
import { Divider }      from 'primereact/divider';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const formatDate = (val) =>
  val ? new Date(val).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

const JOB_STATUS_SEVERITY = {
  Pending:       'warning',
  Scheduled:     'info',
  'In Progress': 'success',
  Completed:     'success',
  Delayed:       'danger',
  Failed:        'danger',
};

const getPriorityMeta = (score) => {
  if (score >= 80) return { label: 'Tinggi',        severity: 'danger',  color: '#ef4444' };
  if (score >= 60) return { label: 'Sedang',        severity: 'warning', color: '#f59e0b' };
  if (score >= 40) return { label: 'Rendah',        severity: 'info',    color: '#3b82f6' };
  return                   { label: 'Sangat Rendah', severity: 'success', color: '#22c55e' };
};

const isOverDeadline = (row) => {
  if (!row.deadline_predicted || !row.scheduled_end) return false;
  return new Date(row.scheduled_end) > new Date(row.deadline_predicted);
};

export default function HasilAlgoritmaPage() {
  const toast = useRef(null);

  const [schedules,         setSchedules]         = useState([]);
  const [selectedSchedule,  setSelectedSchedule]  = useState(null);
  const [jobs,              setJobs]              = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [loadingJobs,       setLoadingJobs]       = useState(false);
  const [finalizing,        setFinalizing]        = useState(false);
  const [globalFilter,      setGlobalFilter]      = useState('');
  const [detailVisible,     setDetailVisible]     = useState(false);
  const [selectedJob,       setSelectedJob]       = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data);
        // auto-select jadwal terbaru
        if (data.data.length > 0) fetchJobsBySchedule(data.data[0]);
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat jadwal' });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsBySchedule = async (schedule) => {
    setSelectedSchedule(schedule);
    setJobs([]);
    setLoadingJobs(true);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/result/${schedule.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setJobs(data.data.jobs || []);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat hasil pipeline' });
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleFinalize = () => {
    confirmDialog({
      message:         `Finalisasi jadwal ${selectedSchedule.schedule_code}? Jadwal tidak dapat diubah setelah final.`,
      header:          'Konfirmasi Finalisasi',
      icon:            'pi pi-lock',
      acceptLabel:     'Ya, Finalisasi',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-success',
      accept: async () => {
        setFinalizing(true);
        try {
          const res  = await fetch(`${BASE_URL}/pipeline/schedules/${selectedSchedule.id}/finalize`, {
            method:  'PATCH',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json();
          if (data.success) {
            toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Jadwal berhasil difinalisasi' });
            setSelectedSchedule(prev => ({ ...prev, status_jadwal: 'final', is_final: true }));
            fetchSchedules();
          } else {
            toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
          }
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal finalisasi jadwal' });
        } finally {
          setFinalizing(false);
        }
      },
    });
  };

  useEffect(() => { fetchSchedules(); }, []);

  // ── computed ─────────────────────────────────────
  const stats = {
    total:        jobs.length,
    on_time:      jobs.filter(j => !isOverDeadline(j)).length,
    warning:      jobs.filter(j => isOverDeadline(j)).length,
    avg_priority: jobs.length > 0
      ? (jobs.reduce((s, j) => s + (j.priority_score || 0), 0) / jobs.length).toFixed(1)
      : '0',
  };

  const machineStats = jobs.reduce((acc, j) => {
    const key = j.assigned_machine_id || '-';
    if (!acc[key]) acc[key] = { machine: key, name: j.assigned_machine_name || key, count: 0, total_duration: 0 };
    acc[key].count++;
    acc[key].total_duration += j.processing_time || 0;
    return acc;
  }, {});

  // ── column templates ─────────────────────────────
  const priorityTemplate = (row) => {
    const score = row.priority_score || 0;
    const meta  = getPriorityMeta(score);
    return (
      <div className="flex align-items-center gap-2">
        <ProgressBar
          value={Math.min(score, 100)}
          showValue={false}
          style={{ height: '6px', width: '56px' }}
          color={meta.color}
        />
        <span className="font-semibold text-sm" style={{ color: meta.color, minWidth: 32 }}>
          {score.toFixed(1)}
        </span>
        <Tag value={meta.label} severity={meta.severity} style={{ fontSize: '0.7rem' }} />
      </div>
    );
  };

  const deadlineTemplate = (row) => {
    const over = isOverDeadline(row);
    return (
      <div className="flex align-items-center gap-1">
        {over && <i className="pi pi-exclamation-triangle text-red-500" style={{ fontSize: '0.85rem' }} />}
        <span className={`text-sm ${over ? 'text-red-500 font-semibold' : ''}`}>
          {formatDate(row.deadline_predicted)}
        </span>
      </div>
    );
  };

  const machineTemplate = (row) => (
    <div>
      <div className="font-semibold text-sm">{row.assigned_machine_id || '-'}</div>
      <div className="text-xs text-color-secondary">{row.assigned_machine_name || '-'}</div>
    </div>
  );

  const scheduleTimeTemplate = (row) => (
    <div>
      <div className="text-sm">{formatDate(row.scheduled_start)}</div>
      <div className="text-xs text-color-secondary">{formatDate(row.scheduled_end)}</div>
    </div>
  );

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-eye"
      rounded text severity="info" size="small"
      tooltip="Lihat Detail"
      tooltipOptions={{ position: 'left' }}
      onClick={() => { setSelectedJob(row); setDetailVisible(true); }}
    />
  );

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} />
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-content-between align-items-start">
        <div>
          <h2 className="m-0 text-900 font-semibold" style={{ fontSize: '1.2rem' }}>
            Hasil Jadwal
          </h2>
          <p className="m-0 mt-1 text-color-secondary text-sm">
            Hasil optimasi penjadwalan menggunakan Fuzzy Mamdani dan CCEA
          </p>
        </div>
        <Button
          icon="pi pi-refresh"
          text
          size="small"
          onClick={fetchSchedules}
          loading={loading}
          tooltip="Refresh"
        />
      </div>

      {/* Pilih Jadwal */}
      <div className="card p-0">
        <div className="px-4 py-3 flex align-items-center gap-3 flex-wrap">
          <Dropdown
            value={selectedSchedule}
            options={schedules}
            onChange={(e) => fetchJobsBySchedule(e.value)}
            optionLabel="schedule_code"
            placeholder="Pilih jadwal"
            style={{ minWidth: '240px' }}
            loading={loading}
            emptyMessage="Belum ada jadwal"
            itemTemplate={(opt) => (
              <div className="flex justify-content-between align-items-center gap-3 py-1">
                <span className="font-semibold text-sm">{opt.schedule_code}</span>
                <div className="flex align-items-center gap-2">
                  <Tag
                    value={STATUS_CONFIG[opt.status_jadwal]?.label || opt.status_jadwal}
                    severity={STATUS_CONFIG[opt.status_jadwal]?.severity || 'info'}
                    style={{ fontSize: '0.7rem' }}
                  />
                  <span className="text-xs text-color-secondary">{opt.makespan} mnt</span>
                </div>
              </div>
            )}
          />

          {selectedSchedule && (
            <div className="flex align-items-center gap-3 flex-wrap">
              <Tag
                value={STATUS_CONFIG[selectedSchedule.status_jadwal]?.label}
                severity={STATUS_CONFIG[selectedSchedule.status_jadwal]?.severity}
              />
              <span className="text-sm text-color-secondary">
                Makespan: <span className="font-semibold text-900">{selectedSchedule.makespan} menit</span>
              </span>
              <span className="text-sm text-color-secondary">
                Jobs: <span className="font-semibold text-900">{selectedSchedule.total_jobs}</span>
              </span>
              <span className="text-sm text-color-secondary">
                Mesin: <span className="font-semibold text-900">{selectedSchedule.total_machines}</span>
              </span>

              {selectedSchedule.status_jadwal === 'draft' && (
                <Button
                  label="Finalisasi Jadwal"
                  icon={finalizing ? 'pi pi-spin pi-spinner' : 'pi pi-lock'}
                  severity="success"
                  size="small"
                  onClick={handleFinalize}
                  disabled={finalizing}
                />
              )}
              {selectedSchedule.status_jadwal === 'final' && (
                <span className="text-green-600 text-sm font-semibold flex align-items-center gap-1">
                  <i className="pi pi-lock" />
                  Jadwal Final
                </span>
              )}
              {selectedSchedule.status_jadwal === 'revised' && (
                <span className="text-orange-500 text-sm font-semibold flex align-items-center gap-1">
                  <i className="pi pi-history" />
                  Telah Direvisi
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedSchedule && (
        <>
          {/* Stat Cards */}
          <div className="grid" style={{ gap: 0 }}>
            {[
              { label: 'Makespan',         value: `${selectedSchedule.makespan} mnt`, icon: 'pi-clock',                color: '#6366f1', bg: '#eef2ff' },
              { label: 'Total Jobs',       value: stats.total,                         icon: 'pi-list',                 color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Tepat Deadline',   value: stats.on_time,                       icon: 'pi-check-circle',         color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Warning Deadline', value: stats.warning,                       icon: 'pi-exclamation-triangle', color: '#ef4444', bg: '#fef2f2' },
              { label: 'Rata-rata Skor',   value: stats.avg_priority,                  icon: 'pi-star',                 color: '#f59e0b', bg: '#fffbeb' },
            ].map((s, i) => (
              <div key={i} className="col-12 md:col-6 lg:col p-2">
                <div
                  className="flex align-items-center gap-3 p-3 border-round"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderLeft: `4px solid ${s.color}` }}
                >
                  <div
                    className="flex align-items-center justify-content-center border-round"
                    style={{ width: 36, height: 36, background: s.bg, flexShrink: 0 }}
                  >
                    <i className={`pi ${s.icon}`} style={{ fontSize: '1rem', color: s.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-900">{s.value}</div>
                    <div className="text-xs text-color-secondary">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Distribusi Mesin */}
          <div className="card p-0">
            <div className="px-4 pt-4 pb-3">
              <span className="font-semibold text-900 text-sm">Distribusi Beban Mesin</span>
            </div>
            <Divider className="m-0" />
            <div className="grid px-4 py-3" style={{ gap: 0 }}>
              {Object.values(machineStats).map((m, i) => (
                <div key={i} className="col-12 md:col-6 lg:col-4 p-2">
                  <div className="flex justify-content-between align-items-center mb-2">
                    <span className="font-semibold text-sm text-900">{m.name || m.machine}</span>
                    <span className="text-xs text-color-secondary">{m.count} jobs — {m.total_duration} mnt</span>
                  </div>
                  <ProgressBar
                    value={stats.total > 0 ? Math.round((m.count / stats.total) * 100) : 0}
                    style={{ height: '7px' }}
                    color="#6366f1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tabel Hasil */}
          <div className="card p-0">
            <div className="flex justify-content-between align-items-center px-4 pt-4 pb-3">
              <span className="font-semibold text-900 text-sm">Detail Penjadwalan</span>
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Cari job..."
                  size="small"
                  style={{ width: '200px' }}
                />
              </span>
            </div>

            <Divider className="m-0" />

            <DataTable
              value={jobs}
              loading={loadingJobs}
              paginator rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              size="small"
              globalFilter={globalFilter}
              emptyMessage="Belum ada data"
              sortField="priority_score"
              sortOrder={-1}
              rowClassName={(row) => isOverDeadline(row) ? 'bg-red-50' : ''}
            >
              <Column field="job_id"          header="Job ID"   sortable style={{ fontWeight: 600, fontSize: '0.85rem', width: 100 }} />
              <Column field="operation_type"  header="Operasi"  sortable style={{ fontSize: '0.85rem', width: 110 }} />
              <Column header="Mesin"          body={machineTemplate} style={{ width: 130 }} />
              <Column header="Jadwal"         body={scheduleTimeTemplate} style={{ minWidth: 150 }} />
              <Column field="processing_time" header="Durasi"   body={r => `${r.processing_time} mnt`} sortable style={{ fontSize: '0.85rem', width: 90 }} />
              <Column header="Skor Prioritas" body={priorityTemplate} sortField="priority_score" sortable style={{ minWidth: 190 }} />
              <Column header="Deadline"       body={deadlineTemplate} sortField="deadline_predicted" sortable style={{ minWidth: 160 }} />
              <Column
                header="Status"
                body={r => <Tag value={r.job_status} severity={JOB_STATUS_SEVERITY[r.job_status] || 'info'} style={{ fontSize: '0.72rem' }} />}
                style={{ width: 110 }}
              />
              <Column header="" body={actionTemplate} style={{ width: 60 }} />
            </DataTable>
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        header={`Job ${selectedJob?.job_id}`}
        visible={detailVisible}
        style={{ width: '480px' }}
        modal
        draggable={false}
        dismissableMask
        onHide={() => setDetailVisible(false)}
      >
        {selectedJob && (
          <div>
            {[
              { label: 'Job ID',               value: selectedJob.job_id },
              { label: 'Operation Type',        value: selectedJob.operation_type },
              { label: 'Mesin',                 value: `${selectedJob.assigned_machine_id || '-'} — ${selectedJob.assigned_machine_name || '-'}` },
              { label: 'Processing Time',       value: `${selectedJob.processing_time} menit` },
              { label: 'Energy Consumption',    value: `${selectedJob.energy_consumption} kWh` },
              { label: 'Machine Availability',  value: `${selectedJob.machine_availability}%` },
              { label: 'Scheduled Start',       value: formatDate(selectedJob.scheduled_start) },
              { label: 'Scheduled End',         value: formatDate(selectedJob.scheduled_end) },
              { label: 'Deadline Prediksi',     value: formatDate(selectedJob.deadline_predicted) },
              { label: 'Fuzzy Score',           value: selectedJob.fuzzy_score?.toFixed(4) },
              { label: 'Skor Prioritas',        value: selectedJob.priority_score?.toFixed(4) },
              { label: 'Optimization Category', value: selectedJob.optimization_category },
              { label: 'Status',                value: selectedJob.job_status },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-content-between align-items-center py-2"
                style={{ borderBottom: '1px solid var(--surface-border)' }}
              >
                <span className="text-color-secondary text-sm">{item.label}</span>
                <span className="font-semibold text-sm text-900">{item.value || '-'}</span>
              </div>
            ))}

            {isOverDeadline(selectedJob) && (
              <div
                className="flex align-items-center gap-2 p-3 border-round mt-3"
                style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
              >
                <i className="pi pi-exclamation-triangle text-red-500" />
                <span className="text-sm font-semibold text-red-500">
                  Scheduled End melewati Deadline Prediksi
                </span>
              </div>
            )}

            <div className="flex justify-content-end mt-4">
              <Button
                label="Tutup"
                icon="pi pi-times"
                text
                size="small"
                onClick={() => setDetailVisible(false)}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}