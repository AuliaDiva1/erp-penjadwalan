'use client';
import { useState, useEffect, useRef } from 'react';
import { Dialog }       from 'primereact/dialog';
import { DataTable }    from 'primereact/datatable';
import { Column }       from 'primereact/column';
import { Button }       from 'primereact/button';
import { Tag }          from 'primereact/tag';
import { Toast }        from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressBar }  from 'primereact/progressbar';
import { Divider }      from 'primereact/divider';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
  if (score >= 80) return { label: 'Tinggi',        severity: 'danger',  color: '#ef4444' };
  if (score >= 60) return { label: 'Sedang',        severity: 'warning', color: '#f59e0b' };
  if (score >= 40) return { label: 'Rendah',        severity: 'info',    color: '#3b82f6' };
  return                   { label: 'Sangat Rendah', severity: 'success', color: '#22c55e' };
};

export default function DetailJadwal({ visible, onHide, data }) {
  const toast         = useRef(null);
  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState([]);
  const [resetting,   setResetting]   = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    if (!data?.id) return;
    setLoading(true);
    setSelected([]);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/result/${data.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setJobs(json.data.jobs || []);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat job' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && data?.id) fetchJobs();
  }, [visible, data?.id]);

  // ── Reset handler ────────────────────────────────
  const doReset = async (jobIds) => {
    setResetting(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs/reset-batch`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ job_ids: jobIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: json.message });
        fetchJobs();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal mereset job' });
    } finally {
      setResetting(false);
    }
  };

  const handleResetSelected = () => {
    if (selected.length === 0) return;
    confirmDialog({
      message:         `Reset ${selected.length} job terpilih ke Pending?`,
      header:          'Konfirmasi Reset',
      icon:            'pi pi-exclamation-triangle',
      acceptLabel:     'Ya, Reset',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-warning',
      accept:          () => doReset(selected.map(j => j.id)),
    });
  };

  const handleResetAll = () => {
    const resettable = jobs.filter(j => j.job_status !== 'In Progress');
    if (resettable.length === 0) return;
    confirmDialog({
      message:         `Reset semua ${resettable.length} job di jadwal ini ke Pending?`,
      header:          'Konfirmasi Reset Semua',
      icon:            'pi pi-exclamation-triangle',
      acceptLabel:     'Ya, Reset Semua',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-danger',
      accept:          () => doReset(resettable.map(j => j.id)),
    });
  };

  const handleResetOne = (row) => {
    confirmDialog({
      message:         `Reset job ${row.job_id} ke Pending?`,
      header:          'Konfirmasi Reset',
      icon:            'pi pi-exclamation-triangle',
      acceptLabel:     'Ya, Reset',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-warning',
      accept:          () => doReset([row.id]),
    });
  };

  // ── Column templates ─────────────────────────────
  const statusTemplate = (row) => (
    <Tag
      value={row.job_status}
      severity={JOB_STATUS_SEVERITY[row.job_status] || 'info'}
      style={{ fontSize: '0.72rem' }}
    />
  );

  const priorityTemplate = (row) => {
    const score = row.priority_score || 0;
    const meta  = getPriorityMeta(score);
    return (
      <div className="flex align-items-center gap-2">
        <ProgressBar
          value={Math.min(score, 100)}
          showValue={false}
          style={{ height: '6px', width: '50px' }}
          color={meta.color}
        />
        <span className="font-semibold text-sm" style={{ color: meta.color }}>
          {score.toFixed(1)}
        </span>
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

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-refresh"
      rounded text
      severity="warning"
      size="small"
      tooltip="Reset ke Pending"
      tooltipOptions={{ position: 'left' }}
      disabled={row.job_status === 'In Progress' || resetting}
      onClick={() => handleResetOne(row)}
    />
  );

  // ── Stats ────────────────────────────────────────
  const resettable = jobs.filter(j => j.job_status !== 'In Progress').length;

  // ── Header dialog ────────────────────────────────
  const dialogHeader = (
    <div className="flex align-items-center justify-content-between w-full pr-3">
      <div>
        <span className="font-semibold text-900">Detail Jadwal</span>
        {data && (
          <span className="ml-2 text-color-secondary text-sm">— {data.schedule_code}</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          label={`Reset Terpilih (${selected.length})`}
          icon="pi pi-refresh"
          severity="warning"
          size="small"
          outlined
          disabled={selected.length === 0 || resetting}
          onClick={handleResetSelected}
        />
        <Button
          label="Reset Semua"
          icon="pi pi-refresh"
          severity="danger"
          size="small"
          outlined
          disabled={resettable === 0 || resetting}
          onClick={handleResetAll}
        />
      </div>
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Dialog
        header={dialogHeader}
        visible={visible}
        style={{ width: '90vw', maxWidth: '1100px' }}
        modal
        draggable={false}
        dismissableMask
        onHide={() => { setSelected([]); onHide(); }}
      >
        {data && (
          <>
            {/* Info jadwal */}
            <div className="flex gap-4 flex-wrap mb-3">
              {[
                { label: 'Makespan',    value: `${data.makespan} menit` },
                { label: 'Total Jobs',  value: data.total_jobs },
                { label: 'Total Mesin', value: data.total_machines },
                { label: 'Status',      value: data.status_jadwal },
              ].map((s, i) => (
                <div key={i} className="text-sm">
                  <span className="text-color-secondary">{s.label}: </span>
                  <span className="font-semibold text-900">{s.value}</span>
                </div>
              ))}
            </div>

            <Divider className="my-2" />

            {/* Tabel job */}
            <DataTable
              value={jobs}
              loading={loading}
              selection={selected}
              onSelectionChange={(e) => setSelected(e.value)}
              selectionMode="checkbox"
              dataKey="id"
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              size="small"
              emptyMessage="Belum ada job"
              sortField="scheduled_start"
              sortOrder={1}
              rowClassName={(row) => row.job_status === 'In Progress' ? 'opacity-60' : ''}
            >
              <Column selectionMode="multiple" style={{ width: '40px' }} />
              <Column field="job_id"         header="Job ID"    sortable style={{ fontWeight: 600, fontSize: '0.85rem', width: 90 }} />
              <Column field="operation_type" header="Operasi"   sortable style={{ fontSize: '0.85rem', width: 110 }} />
              <Column header="Mesin"         body={machineTemplate} style={{ width: 130 }} />
              <Column header="Jadwal"        body={scheduleTemplate} style={{ minWidth: 150 }} />
              <Column field="processing_time" header="Durasi"   body={r => `${r.processing_time} mnt`} sortable style={{ width: 80 }} />
              <Column header="Prioritas"     body={priorityTemplate} sortField="priority_score" sortable style={{ minWidth: 130 }} />
              <Column header="Status"        body={statusTemplate} style={{ width: 110 }} />
              <Column header=""              body={actionTemplate} style={{ width: 60 }} />
            </DataTable>

            {selected.length > 0 && (
              <div className="mt-2 text-sm text-color-secondary">
                {selected.length} job dipilih
                {selected.some(j => j.job_status === 'In Progress') && (
                  <span className="text-orange-500 ml-2">
                    (job In Progress akan dilewati saat reset)
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}