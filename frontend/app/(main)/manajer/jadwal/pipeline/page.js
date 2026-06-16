// halaman 1: JalankanPipelinePage
'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }     from 'primereact/toast';
import { Button }    from 'primereact/button';
import { Tag }       from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column }    from 'primereact/column';
import { Divider }   from 'primereact/divider';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const fmt = (val) =>
  val ? new Date(val).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';

export default function JalankanPipelinePage() {
  const toast  = useRef(null);
  const router = useRouter();

  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/jobs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setJobs(data.data.filter(j => j.job_status === 'Pending'));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data job' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/run`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        fetchJobs();
        toast.current.show({
          severity: 'success',
          summary:  'Pipeline Selesai',
          detail:   `Makespan ${data.data.makespan} menit — ${data.data.total_jobs} job dijadwalkan`,
          life: 6000,
        });
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menjalankan pipeline' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} />

      {/* Header */}
      <div className="flex justify-content-between align-items-start">
        <div>
          <h2 className="m-0 text-900 font-semibold" style={{ fontSize: '1.2rem' }}>
            Jalankan Pipeline
          </h2>
          <p className="m-0 mt-1 text-color-secondary text-sm">
            Penjadwalan otomatis job Pending menggunakan Fuzzy Mamdani dan CCEA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            label="Riwayat Jadwal"
            icon="pi pi-history"
            severity="secondary"
            outlined
            size="small"
            onClick={() => router.push('/manajer/pipeline/hasil')}
          />
          <Button
            label={running ? 'Memproses' : 'Jalankan Pipeline'}
            icon={running ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            size="small"
            disabled={running || jobs.length === 0}
            onClick={handleRun}
          />
        </div>
      </div>

      {/* Job Pending */}
      <div className="card p-0">
        <div className="flex justify-content-between align-items-center px-4 pt-4 pb-3">
          <div className="flex align-items-center gap-2">
            <span className="font-semibold text-900 text-sm">Job Pending</span>
            <Tag
              value={jobs.length}
              severity={jobs.length > 0 ? 'warning' : 'secondary'}
              style={{ fontSize: '0.72rem' }}
            />
          </div>
          <Button icon="pi pi-refresh" text size="small" onClick={fetchJobs} loading={loading} />
        </div>

        <Divider className="m-0" />

        {jobs.length === 0 && !loading ? (
          <div className="flex flex-column align-items-center justify-content-center py-6 gap-3 text-color-secondary">
            <i className="pi pi-inbox" style={{ fontSize: '2rem' }} />
            <span className="text-sm">Tidak ada job dengan status Pending</span>
            <Button
              label="Tambah Job"
              icon="pi pi-plus"
              size="small"
              text
              onClick={() => router.push('/manajer/job/tambah')}
            />
          </div>
        ) : (
          <DataTable value={jobs} loading={loading} size="small" stripedRows>
            <Column field="job_id"               header="Job ID"      style={{ fontWeight: 600, fontSize: '0.85rem', width: 110 }} />
            <Column field="operation_type"       header="Operasi"     style={{ fontSize: '0.85rem' }} />
            <Column field="processing_time"      header="Proc. Time"  body={r => `${r.processing_time} mnt`}  style={{ fontSize: '0.85rem', width: 110 }} />
            <Column field="energy_consumption"   header="Energy"      body={r => `${r.energy_consumption} kWh`} style={{ fontSize: '0.85rem', width: 100 }} />
            <Column field="machine_availability" header="Availability" body={r => `${r.machine_availability}%`} style={{ fontSize: '0.85rem', width: 100 }} />
            <Column
              header="Prioritas"
              body={r => (
                <Tag
                  value={r.is_urgent ? 'Urgent' : 'Normal'}
                  severity={r.is_urgent ? 'danger' : 'secondary'}
                  style={{ fontSize: '0.72rem' }}
                />
              )}
              style={{ width: 90 }}
            />
          </DataTable>
        )}
      </div>

      {/* Hasil singkat setelah run */}
      {result && (
        <div className="card p-0">
          <div className="flex justify-content-between align-items-center px-4 pt-4 pb-3">
            <div className="flex align-items-center gap-2">
              <span className="font-semibold text-900 text-sm">Hasil Pipeline</span>
              <Tag value="Selesai" severity="success" style={{ fontSize: '0.72rem' }} />
            </div>
            <Button
              label="Lihat Detail Lengkap"
              icon="pi pi-arrow-right"
              iconPos="right"
              text
              size="small"
              onClick={() => router.push('/manajer/pipeline/hasil')}
            />
          </div>

          <Divider className="m-0" />

          <div className="grid px-4 py-3" style={{ gap: 0 }}>
            {[
              { label: 'Makespan',       value: `${result.makespan} mnt`, color: '#6366f1', bg: '#eef2ff' },
              { label: 'Total Jobs',     value: result.total_jobs,        color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Total Mesin',    value: result.total_machines,    color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Kode Jadwal',    value: result.schedule?.schedule_code || '-', color: '#3b82f6', bg: '#eff6ff' },
            ].map((s, i) => (
              <div key={i} className="col-12 md:col-6 lg:col-3 p-2">
                <div
                  className="border-round p-3 text-center"
                  style={{ background: s.bg }}
                >
                  <div className="font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-color-secondary mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <Divider className="m-0" />

          <DataTable
            value={result.detail}
            size="small"
            stripedRows
            paginator
            rows={10}
            className="px-0"
          >
            <Column field="job_id"              header="Job ID"     style={{ fontWeight: 600, fontSize: '0.85rem', width: 100 }} />
            <Column field="assigned_machine_id" header="Mesin"      style={{ fontSize: '0.85rem', width: 90 }} />
            <Column field="scheduled_start"     header="Mulai"      body={r => fmt(r.scheduled_start)}    style={{ fontSize: '0.85rem' }} />
            <Column field="scheduled_end"       header="Selesai"    body={r => fmt(r.scheduled_end)}      style={{ fontSize: '0.85rem' }} />
            <Column field="duration"            header="Durasi"     body={r => `${r.duration} mnt`}       style={{ fontSize: '0.85rem', width: 80 }} />
            <Column field="deadline_predicted"  header="Deadline"   body={r => fmt(r.deadline_predicted)} style={{ fontSize: '0.85rem' }} />
            <Column field="skor_prioritas"      header="Skor"       body={r => r.skor_prioritas?.toFixed(2)} style={{ fontSize: '0.85rem', width: 70 }} />
          </DataTable>
        </div>
      )}
    </div>
  );
}