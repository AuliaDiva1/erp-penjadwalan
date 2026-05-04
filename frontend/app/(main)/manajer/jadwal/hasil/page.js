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
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function HasilAlgoritmaPage() {
  const toast                           = useRef(null);
  const [schedules, setSchedules]       = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [jobs, setJobs]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [loadingJobs, setLoadingJobs]   = useState(false);
  const [finalizing, setFinalizing]     = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedJob, setSelectedJob]   = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setSchedules(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat jadwal' });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsBySchedule = async (schedule) => {
    setSelectedSchedule(schedule);
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
      message:     `Finalisasi jadwal ${selectedSchedule.schedule_code}? Jadwal tidak bisa diubah setelah final.`,
      header:      'Konfirmasi Finalisasi',
      icon:        'pi pi-check-circle',
      acceptLabel: 'Ya, Finalisasi',
      rejectLabel: 'Batal',
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
            await fetchSchedules();
            // update selectedSchedule dengan data terbaru
            setSelectedSchedule(prev => ({ ...prev, status_jadwal: 'final', is_final: true }));
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

  useEffect(() => {
    if (schedules.length > 0 && !selectedSchedule) {
      fetchJobsBySchedule(schedules[0]);
    }
  }, [schedules]);

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const statusConfig = {
    draft:   { label: 'Draft',   severity: 'secondary' },
    final:   { label: 'Final',   severity: 'success'   },
    revised: { label: 'Revised', severity: 'warning'   },
  };

  const jobStatusConfig = {
    Pending:       'warning',
    Scheduled:     'info',
    'In Progress': 'success',
    Completed:     'success',
    Delayed:       'danger',
    Failed:        'danger',
  };

  const getPriorityColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#3b82f6';
    return '#22c55e';
  };

  const getPriorityLabel = (score) => {
    if (score >= 80) return { label: 'Tinggi',        severity: 'danger'  };
    if (score >= 60) return { label: 'Sedang',        severity: 'warning' };
    if (score >= 40) return { label: 'Rendah',        severity: 'info'    };
    return                   { label: 'Sangat Rendah', severity: 'success' };
  };

  const isDeadlineWarning = (row) => {
    if (!row.deadline_predicted || !row.scheduled_end) return false;
    return new Date(row.scheduled_end) > new Date(row.deadline_predicted);
  };

  const stats = {
    total:    jobs.length,
    on_time:  jobs.filter(j => !isDeadlineWarning(j)).length,
    warning:  jobs.filter(j => isDeadlineWarning(j)).length,
    avg_priority: jobs.length > 0
      ? (jobs.reduce((s, j) => s + (j.priority_score || 0), 0) / jobs.length).toFixed(1)
      : 0,
  };

  const machineStats = jobs.reduce((acc, j) => {
    const m = j.machine_id || '-';
    if (!acc[m]) acc[m] = { machine: m, name: j.machine_name || m, count: 0, total_duration: 0 };
    acc[m].count++;
    acc[m].total_duration += j.processing_time || 0;
    return acc;
  }, {});

  const priorityTemplate = (row) => {
    const score = row.priority_score || 0;
    const p     = getPriorityLabel(score);
    return (
      <div className="flex align-items-center gap-2">
        <ProgressBar
          value={Math.min(score, 100)}
          showValue={false}
          style={{ height: '6px', width: '60px' }}
          color={getPriorityColor(score)}
        />
        <span className="font-semibold text-sm" style={{ color: getPriorityColor(score) }}>
          {score.toFixed(1)}
        </span>
        <Tag value={p.label} severity={p.severity} />
      </div>
    );
  };

  const deadlineTemplate = (row) => {
    const warning = isDeadlineWarning(row);
    return (
      <div className="flex align-items-center gap-1">
        {warning && <i className="pi pi-exclamation-triangle" style={{ color: '#ef4444', fontSize: '0.9rem' }} />}
        <span className={`text-sm ${warning ? 'text-red-500 font-semibold' : ''}`}>
          {formatDate(row.deadline_predicted)}
        </span>
      </div>
    );
  };

  const machineTemplate = (row) => (
    <div>
      <div className="font-semibold text-sm">{row.machine_id || '-'}</div>
      <div className="text-xs text-color-secondary">{row.machine_name || '-'}</div>
    </div>
  );

  const scheduleTimeTemplate = (row) => (
    <div>
      <div className="text-sm">{formatDate(row.scheduled_start)}</div>
      <div className="text-xs text-color-secondary">→ {formatDate(row.scheduled_end)}</div>
    </div>
  );

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-eye"
      rounded text severity="info"
      tooltip="Detail"
      onClick={() => { setSelectedJob(row); setDetailVisible(true); }}
    />
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Hasil Algoritma Pipeline</h2>
          <p className="m-0 text-color-secondary text-sm">
            Hasil optimasi Random Forest, Fuzzy Mamdani, dan CCEA
          </p>
        </div>
        <Button icon="pi pi-refresh" text onClick={fetchSchedules} loading={loading} tooltip="Refresh" />
      </div>

      {/* PILIH JADWAL */}
      <div className="card mb-4">
        <div className="flex align-items-center gap-3 flex-wrap">
          <span className="font-semibold">Pilih Jadwal:</span>
          <Dropdown
            value={selectedSchedule}
            options={schedules}
            onChange={(e) => fetchJobsBySchedule(e.value)}
            optionLabel="schedule_code"
            placeholder="-- Pilih Jadwal --"
            style={{ width: '260px' }}
            itemTemplate={(opt) => (
              <div className="flex justify-content-between align-items-center gap-3">
                <span className="font-semibold">{opt.schedule_code}</span>
                <div className="flex gap-2">
                  <Tag
                    value={statusConfig[opt.status_jadwal]?.label || opt.status_jadwal}
                    severity={statusConfig[opt.status_jadwal]?.severity || 'info'}
                  />
                  <span className="text-xs text-color-secondary">{opt.makespan} mnt</span>
                </div>
              </div>
            )}
          />

          {selectedSchedule && (
            <div className="flex align-items-center gap-3 flex-wrap">
              <Tag
                value={statusConfig[selectedSchedule.status_jadwal]?.label}
                severity={statusConfig[selectedSchedule.status_jadwal]?.severity}
              />
              <span className="text-sm">Makespan: <b>{selectedSchedule.makespan} menit</b></span>
              <span className="text-sm">Jobs: <b>{selectedSchedule.total_jobs}</b></span>
              <span className="text-sm">Mesin: <b>{selectedSchedule.total_machines}</b></span>

              {/* TOMBOL FINALISASI — hanya muncul kalau status draft */}
              {selectedSchedule.status_jadwal === 'draft' && (
                <Button
                  label={finalizing ? 'Memfinalisasi...' : 'Finalisasi Jadwal'}
                  icon={finalizing ? 'pi pi-spin pi-spinner' : 'pi pi-check-circle'}
                  severity="success"
                  size="small"
                  onClick={handleFinalize}
                  disabled={finalizing}
                />
              )}

              {selectedSchedule.status_jadwal === 'final' && (
                <div className="flex align-items-center gap-1 text-green-600 text-sm font-semibold">
                  <i className="pi pi-lock" />
                  <span>Jadwal sudah terkunci (Final)</span>
                </div>
              )}

              {selectedSchedule.status_jadwal === 'revised' && (
                <div className="flex align-items-center gap-1 text-orange-500 text-sm font-semibold">
                  <i className="pi pi-history" />
                  <span>Jadwal ini telah direvisi</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedSchedule && (
        <>
          {/* STAT CARDS */}
          <div className="grid mb-4">
            {[
              { label: 'Makespan',         value: `${selectedSchedule.makespan} mnt`, icon: 'pi-clock',                color: '#6366f1', bg: '#eef2ff' },
              { label: 'Total Jobs',       value: stats.total,                         icon: 'pi-list',                 color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Tepat Deadline',   value: stats.on_time,                       icon: 'pi-check-circle',         color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Warning Deadline', value: stats.warning,                       icon: 'pi-exclamation-triangle', color: '#ef4444', bg: '#fef2f2' },
              { label: 'Avg Prioritas',    value: stats.avg_priority,                  icon: 'pi-star',                 color: '#f59e0b', bg: '#fffbeb' },
            ].map((s, i) => (
              <div key={i} className="col-12 md:col-6 lg:col">
                <div className="card p-3 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
                  <div
                    className="flex align-items-center justify-content-center border-round"
                    style={{ width: 40, height: 40, background: s.bg, flexShrink: 0 }}
                  >
                    <i className={`pi ${s.icon}`} style={{ fontSize: '1.1rem', color: s.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-color-secondary text-xs">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid mb-4">
            {/* DISTRIBUSI MESIN */}
            <div className="col-12 lg:col-4">
              <div className="card h-full">
                <h3 className="mt-0 mb-3">Distribusi Beban Mesin</h3>
                {Object.values(machineStats).map((m, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-content-between align-items-center mb-1">
                      <span className="font-semibold text-sm">{m.machine}</span>
                      <span className="text-xs text-color-secondary">{m.count} jobs | {m.total_duration} mnt</span>
                    </div>
                    <ProgressBar
                      value={Math.round((m.count / stats.total) * 100)}
                      style={{ height: '8px' }}
                      color="#6366f1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* INFO ALGORITMA */}
            <div className="col-12 lg:col-8">
              <div className="card h-full">
                <h3 className="mt-0 mb-3">Ringkasan Algoritma</h3>
                <div className="grid">
                  {[
                    { label: 'Step 1: Random Forest', icon: 'pi-chart-line', color: '#6366f1',
                      items: ['Prediksi durasi aktual tiap job', 'Estimasi deadline berdasarkan historis', 'MAE: 0.03 menit | R²: 100%'] },
                    { label: 'Step 2: Fuzzy Mamdani', icon: 'pi-sliders-h', color: '#f59e0b',
                      items: ['27 rules inferensi IF-THEN', 'Input: Processing Time, Energy, Availability', 'Output: Skor prioritas 0-100'] },
                    { label: 'Step 3: CCEA', icon: 'pi-cog', color: '#22c55e',
                      items: [`Makespan: ${selectedSchedule.makespan} menit`, `${selectedSchedule.total_jobs} jobs → ${selectedSchedule.total_machines} mesin`, 'Elitisme + Seleksi Turnamen'] },
                  ].map((s, i) => (
                    <div key={i} className="col-12 md:col-4">
                      <div className="p-3 border-round h-full" style={{ border: `2px solid ${s.color}20`, background: `${s.color}08` }}>
                        <div className="flex align-items-center gap-2 mb-2">
                          <i className={`pi ${s.icon}`} style={{ color: s.color }} />
                          <span className="font-semibold text-sm">{s.label}</span>
                        </div>
                        {s.items.map((item, j) => (
                          <div key={j} className="flex align-items-start gap-1 mb-1">
                            <i className="pi pi-check text-xs mt-1" style={{ color: s.color }} />
                            <span className="text-xs text-color-secondary">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TABEL HASIL */}
          <div className="card">
            <div className="flex justify-content-between align-items-center mb-3">
              <h3 className="m-0">Detail Hasil Penjadwalan</h3>
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Cari job..."
                  style={{ width: '220px' }}
                />
              </span>
            </div>

            <DataTable
              value={jobs}
              loading={loadingJobs}
              paginator rows={10}
              rowsPerPageOptions={[5, 10, 25]}
              stripedRows
              globalFilter={globalFilter}
              emptyMessage="Belum ada hasil pipeline"
              sortField="priority_score"
              sortOrder={-1}
              rowClassName={(row) => isDeadlineWarning(row) ? 'bg-red-50' : ''}
            >
              <Column field="job_id"          header="Job ID"    sortable style={{ fontWeight: 600, width: '100px' }} />
              <Column field="operation_type"  header="Operasi"   sortable style={{ width: '100px' }} />
              <Column header="Mesin"          body={machineTemplate} style={{ width: '120px' }} />
              <Column header="Jadwal"         body={scheduleTimeTemplate} style={{ minWidth: '160px' }} />
              <Column field="processing_time" header="Durasi"    body={(r) => `${r.processing_time} mnt`} sortable style={{ width: '80px' }} />
              <Column header="Skor Prioritas" body={priorityTemplate} sortable sortField="priority_score" style={{ minWidth: '180px' }} />
              <Column header="Deadline"       body={deadlineTemplate} sortable sortField="deadline_predicted" style={{ minWidth: '160px' }} />
              <Column header="Status"
                body={(r) => <Tag value={r.job_status} severity={jobStatusConfig[r.job_status] || 'info'} />}
                style={{ width: '100px' }}
              />
              <Column header="Aksi" body={actionTemplate} style={{ width: '70px' }} />
            </DataTable>
          </div>
        </>
      )}

      {/* DETAIL DIALOG */}
      <Dialog
        header={`Detail Job: ${selectedJob?.job_id}`}
        visible={detailVisible}
        style={{ width: '520px' }}
        modal
        onHide={() => setDetailVisible(false)}
        draggable={false}
        dismissableMask
      >
        {selectedJob && (
          <div className="p-1">
            <div className="grid">
              {[
                { label: 'Job ID',               value: selectedJob.job_id },
                { label: 'Operation Type',        value: selectedJob.operation_type },
                { label: 'Mesin',                 value: `${selectedJob.machine_id || '-'} - ${selectedJob.machine_name || '-'}` },
                { label: 'Processing Time',       value: `${selectedJob.processing_time} menit` },
                { label: 'Energy Consumption',    value: `${selectedJob.energy_consumption} kWh` },
                { label: 'Machine Availability',  value: `${selectedJob.machine_availability}%` },
                { label: 'Scheduled Start',       value: formatDate(selectedJob.scheduled_start) },
                { label: 'Scheduled End',         value: formatDate(selectedJob.scheduled_end) },
                { label: 'Deadline Prediksi',     value: formatDate(selectedJob.deadline_predicted) },
                { label: 'Fuzzy Score (Crisp)',   value: selectedJob.fuzzy_score?.toFixed(4) },
                { label: 'Skor Prioritas',        value: selectedJob.priority_score?.toFixed(4) },
                { label: 'Optimization Category', value: selectedJob.optimization_category },
                { label: 'Status',                value: selectedJob.job_status },
              ].map((item, i) => (
                <div key={i} className="col-12">
                  <div className="flex justify-content-between align-items-center py-2"
                    style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <span className="text-color-secondary text-sm">{item.label}</span>
                    <span className="font-semibold text-sm">{item.value || '-'}</span>
                  </div>
                </div>
              ))}
            </div>

            {isDeadlineWarning(selectedJob) && (
              <div className="p-3 border-round mt-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-exclamation-triangle" style={{ color: '#ef4444' }} />
                  <span className="text-sm font-semibold text-red-500">
                    Scheduled End melewati Deadline Prediksi!
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-content-end mt-4">
              <Button label="Tutup" icon="pi pi-times" className="p-button-text" onClick={() => setDetailVisible(false)} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}