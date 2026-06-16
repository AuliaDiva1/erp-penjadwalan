'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast }      from 'primereact/toast';
import { Button }     from 'primereact/button';
import { Tag }        from 'primereact/tag';
import { DataTable }  from 'primereact/datatable';
import { Column }     from 'primereact/column';
import { useRouter }  from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const fmt = (val) => val ? new Date(val).toLocaleString('id-ID', {
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
      const res  = await fetch(`${BASE_URL}/jobs`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) setJobs(data.data.filter(j => j.job_status === 'Pending'));
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleRun = async () => {
    if (jobs.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Tidak ada job Pending.' });
      return;
    }
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
          severity: 'success', summary: 'Pipeline Selesai',
          detail: `Makespan: ${data.data.makespan} menit | ${data.data.total_jobs} job dijadwalkan`,
          life: 8000,
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

  const card = {
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    borderRadius: 12,
    padding: '1.25rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Toast ref={toast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Jalankan Pipeline</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
            Fuzzy Mamdani → CCEA untuk menjadwalkan job Pending
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            label="Riwayat Jadwal" icon="pi pi-history"
            severity="secondary" outlined size="small"
            onClick={() => router.push('/manajer/pipeline/hasil')}
          />
          <Button
            label={running ? 'Memproses...' : 'Jalankan Pipeline'}
            icon={running ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            onClick={handleRun}
            disabled={running || jobs.length === 0}
            size="small"
          />
        </div>
      </div>

      {/* Tabel Jobs Pending */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Job Pending</span>
            <Tag value={jobs.length} severity={jobs.length > 0 ? 'warning' : 'secondary'} style={{ fontSize: '0.72rem' }} />
          </div>
          <Button icon="pi pi-refresh" text size="small" onClick={fetchJobs} loading={loading} />
        </div>

        {jobs.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
            <span style={{ fontSize: '0.875rem' }}>Tidak ada job Pending</span>
            <div style={{ marginTop: 12 }}>
              <Button label="Tambah Job" icon="pi pi-plus" size="small" text
                onClick={() => router.push('/manajer/job/tambah')} />
            </div>
          </div>
        ) : (
          <DataTable value={jobs} loading={loading} size="small" stripedRows>
            <Column field="job_id"               header="Job ID"    style={{ fontWeight: 600, fontSize: '0.85rem', width: 100 }} />
            <Column field="operation_type"       header="Operasi"   style={{ fontSize: '0.85rem' }} />
            <Column field="processing_time"      header="Proc Time" body={r => `${r.processing_time} mnt`} style={{ fontSize: '0.85rem', width: 100 }} />
            <Column field="energy_consumption"   header="Energy"    body={r => `${r.energy_consumption} kWh`} style={{ fontSize: '0.85rem', width: 100 }} />
            <Column field="machine_availability" header="Avail"     body={r => `${r.machine_availability}%`} style={{ fontSize: '0.85rem', width: 80 }} />
            <Column header="Prioritas"
              body={r => <Tag value={r.is_urgent ? 'Urgent' : 'Normal'} severity={r.is_urgent ? 'danger' : 'secondary'} style={{ fontSize: '0.72rem' }} />}
              style={{ width: 90 }}
            />
          </DataTable>
        )}
      </div>

      {/* Hasil Pipeline */}
      {result && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="pi pi-check-circle" style={{ color: '#22c55e', fontSize: '1.1rem' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Hasil Pipeline</span>
              <Tag value="Berhasil" severity="success" style={{ fontSize: '0.72rem' }} />
            </div>
            <Button label="Lihat Detail" icon="pi pi-arrow-right" iconPos="right"
              text size="small" onClick={() => router.push('/manajer/pipeline/hasil')} />
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' }}>
            {[
              { label: 'Makespan',    value: `${result.makespan} mnt`, color: '#6366f1' },
              { label: 'Total Jobs',  value: result.total_jobs,        color: '#22c55e' },
              { label: 'Total Mesin', value: result.total_machines,    color: '#f59e0b' },
              { label: 'Kode Jadwal', value: result.schedule?.schedule_code?.slice(-6) || '-', color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface-ground)', borderRadius: 8,
                padding: '0.75rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabel hasil */}
          <DataTable value={result.detail} size="small" stripedRows paginator rows={10}>
            <Column field="job_id"             header="Job ID"      style={{ fontWeight: 600, fontSize: '0.85rem', width: 90 }} />
            <Column field="assigned_machine_id" header="Mesin"      style={{ fontSize: '0.85rem', width: 80 }} />
            <Column field="scheduled_start"    header="Mulai"       body={r => fmt(r.scheduled_start)} style={{ fontSize: '0.85rem' }} />
            <Column field="scheduled_end"      header="Selesai"     body={r => fmt(r.scheduled_end)} style={{ fontSize: '0.85rem' }} />
            <Column field="duration"           header="Durasi"      body={r => `${r.duration} mnt`} style={{ fontSize: '0.85rem', width: 80 }} />
            <Column field="deadline_predicted" header="Deadline"    body={r => fmt(r.deadline_predicted)} style={{ fontSize: '0.85rem' }} />
            <Column field="skor_prioritas"     header="Skor"        body={r => r.skor_prioritas?.toFixed(2)} style={{ fontSize: '0.85rem', width: 70 }} />
          </DataTable>
        </div>
      )}
    </div>
  );
}