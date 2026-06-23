// DetailJadwal.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog }      from 'primereact/dialog';
import { DataTable }   from 'primereact/datatable';
import { Column }      from 'primereact/column';
import { Tag }         from 'primereact/tag';
import { Button }      from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Divider }     from 'primereact/divider';
import { Toast }       from 'primereact/toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

const formatDate = (val) =>
  val ? new Date(val).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';

const getPriorityMeta = (score) => {
  if (score >= 80) return { label: 'Tinggi',         severity: 'danger',  color: '#ef4444' };
  if (score >= 60) return { label: 'Sedang',         severity: 'warning', color: '#f59e0b' };
  if (score >= 40) return { label: 'Rendah',         severity: 'info',    color: '#3b82f6' };
  return                   { label: 'Sangat Rendah', severity: 'success', color: '#22c55e' };
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-content-between py-2"
    style={{ borderBottom: '1px solid var(--surface-border)' }}>
    <span className="text-color-secondary text-sm">{label}</span>
    <span className="font-semibold text-sm">{value ?? '-'}</span>
  </div>
);

export default function DetailJadwal({
  visible, onHide, data,
  onValidasi, onRevisi,
  actionLoading,
}) {
  const toast      = useRef(null);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    if (!data?.id) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/result/${data.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setJobs(json.data.jobs || []);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat job' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && data?.id) fetchJobs();
    else setJobs([]);
  }, [visible, data?.id]);

  if (!data) return null;
  const s = STATUS_CONFIG[data.status_jadwal] || { label: data.status_jadwal, severity: 'info' };

  // ── Column templates ─────────────────────────────
  const statusTemplate = (row) => (
    <Tag value={row.job_status} severity={JOB_STATUS_SEVERITY[row.job_status] || 'info'} style={{ fontSize: '0.72rem' }} />
  );

  const priorityTemplate = (row) => {
    const score = row.priority_score || 0;
    const meta  = getPriorityMeta(score);
    return (
      <div className="flex align-items-center gap-2">
        <ProgressBar value={Math.min(score, 100)} showValue={false} style={{ height: '6px', width: '50px' }} color={meta.color} />
        <span className="font-semibold text-sm" style={{ color: meta.color }}>{score.toFixed(1)}</span>
      </div>
    );
  };

  const machineTemplate = (row) => (
    <div>
      <div className="font-semibold text-sm">{row.assigned_machine_code || '-'}</div>
      <div className="text-xs text-color-secondary">{row.assigned_machine_name || '-'}</div>
    </div>
  );

  const scheduleTemplate = (row) => (
    <div>
      <div className="text-sm">{formatDate(row.scheduled_start)}</div>
      <div className="text-xs text-color-secondary">{formatDate(row.scheduled_end)}</div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={`Detail — ${data.schedule_code}`}
        visible={visible}
        style={{ width: '90vw', maxWidth: '900px' }}
        modal onHide={onHide}
        draggable={false} dismissableMask
      >
        <div>
          <div className="flex justify-content-between align-items-center p-3 border-round mb-3"
            style={{ background: 'var(--surface-ground)' }}>
            <div>
              <div className="text-xl font-bold">{data.schedule_code}</div>
              <div className="text-color-secondary text-sm">Jadwal Produksi</div>
            </div>
            <Tag value={s.label} severity={s.severity} />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6">
              <InfoRow label="Makespan"    value={`${data.makespan} menit`} />
              <InfoRow label="Total Jobs"  value={data.total_jobs} />
              <InfoRow label="Total Mesin" value={data.total_machines} />
              <InfoRow label="Revisi ke-"  value={data.revision_count || 0} />
            </div>
            <div className="col-12 md:col-6">
              <InfoRow label="Divalidasi"     value={data.validated_by_name || '-'} />
              <InfoRow label="Waktu Validasi" value={formatDate(data.validated_at)} />
              <InfoRow label="Dibuat"         value={formatDate(data.created_at)} />
              <InfoRow label="Diperbarui"     value={formatDate(data.updated_at)} />
            </div>
          </div>

          {data.revision_note && (
            <div className="mt-3 p-3 border-round text-sm"
              style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
              <div className="font-semibold mb-1 text-xs text-color-secondary uppercase">Catatan Revisi</div>
              {data.revision_note}
            </div>
          )}

          <Divider className="my-3" />

          <div className="mb-2">
            <span className="font-semibold text-900 text-sm">Daftar Job ({jobs.length})</span>
          </div>

          <DataTable
            value={jobs}
            loading={loading}
            dataKey="id"
            paginator
            rows={5}
            rowsPerPageOptions={[5, 10, 25]}
            stripedRows
            size="small"
            emptyMessage="Belum ada job"
            sortField="scheduled_start"
            sortOrder={1}
          >
            <Column field="job_id"          header="Job ID"  sortable style={{ fontWeight: 600, fontSize: '0.85rem', width: 90 }} />
            <Column field="operation_type"  header="Operasi" sortable style={{ fontSize: '0.85rem', width: 110 }} />
            <Column header="Mesin"          body={machineTemplate} style={{ width: 130 }} />
            <Column header="Jadwal"         body={scheduleTemplate} style={{ minWidth: 150 }} />
            <Column field="processing_time" header="Durasi"  body={r => `${r.processing_time} mnt`} sortable style={{ width: 80 }} />
            <Column header="Prioritas"      body={priorityTemplate} sortField="priority_score" sortable style={{ minWidth: 130 }} />
            <Column header="Status"         body={statusTemplate} style={{ width: 110 }} />
          </DataTable>

          <div className="flex justify-content-end gap-2 mt-4">
            {!data.is_final && (
              <Button label="Validasi" icon="pi pi-check" severity="success"
                onClick={onValidasi} loading={actionLoading} />
            )}
            {data.is_final && (
              <Button label="Ajukan Revisi" icon="pi pi-replay" severity="warning"
                onClick={onRevisi} />
            )}
            <Button label="Tutup" icon="pi pi-times" text onClick={onHide} />
          </div>
        </div>
      </Dialog>
    </>
  );
}