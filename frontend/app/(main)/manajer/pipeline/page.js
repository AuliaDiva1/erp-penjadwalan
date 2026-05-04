'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function JalankanPipelinePage() {
  const toast                   = useRef(null);
  const router                  = useRouter();
  const [jobs,     setJobs]     = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resJobs, resMachines] = await Promise.all([
        fetch(`${BASE_URL}/jobs`,     { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${BASE_URL}/machines`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const dataJobs     = await resJobs.json();
      const dataMachines = await resMachines.json();

      if (dataJobs.success) {
        // hanya tampilkan job Pending saja
        setJobs(dataJobs.data.filter(j => j.job_status === 'Pending'));
      }
      if (dataMachines.success) {
        setMachines(dataMachines.data.filter(m => m.status === 'active'));
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRunPipeline = async () => {
    if (jobs.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary:  'Perhatian',
        detail:   'Tidak ada job Pending. Tambah job baru terlebih dahulu.',
      });
      return;
    }
    if (machines.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary:  'Perhatian',
        detail:   'Tidak ada mesin aktif di sistem.',
      });
      return;
    }

    setRunning(true);
    setResult(null);
    try {
      const res  = await fetch(`${BASE_URL}/pipeline/run`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        // refresh jobs setelah pipeline selesai (status berubah jadi Scheduled)
        fetchData();
        toast.current.show({
          severity: 'success',
          summary:  'Pipeline Selesai!',
          detail:   `Makespan: ${data.data.makespan} menit | ${data.data.total_jobs} jobs dijadwalkan`,
          life:     8000,
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

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const statusTemplate = (row) => {
    const map = {
      Pending:       'warning',
      Scheduled:     'info',
      'In Progress': 'success',
      Completed:     'success',
      Delayed:       'danger',
      Failed:        'danger',
    };
    return <Tag value={row.job_status} severity={map[row.job_status] || 'info'} />;
  };

  return (
    <div>
      <Toast ref={toast} />

      {/* HEADER */}
      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Jalankan Pipeline Algoritma</h2>
          <p className="m-0 text-color-secondary text-sm">
            Eksekusi Random Forest → Fuzzy Mamdani → CCEA secara otomatis
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            label="Lihat Hasil"
            icon="pi pi-chart-bar"
            severity="secondary"
            text
            onClick={() => router.push('/manajer/pipeline/hasil')}
          />
          <Button
            label={running ? 'Memproses...' : 'Jalankan Pipeline'}
            icon={running ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            onClick={handleRunPipeline}
            disabled={running || jobs.length === 0}
            size="large"
          />
        </div>
      </div>

      {/* STEP INFO */}
      <div className="grid mb-4">
        {[
          { step: '1', label: 'Random Forest', desc: 'Prediksi deadline tiap job',          color: '#6366f1', bg: '#eef2ff' },
          { step: '2', label: 'Fuzzy Mamdani', desc: 'Hitung skor prioritas 27 rules',      color: '#f59e0b', bg: '#fffbeb' },
          { step: '3', label: 'CCEA',           desc: 'Optimasi urutan & alokasi mesin',     color: '#22c55e', bg: '#f0fdf4' },
          { step: '4', label: 'Hasil Jadwal',   desc: 'Jadwal tersimpan otomatis ke sistem', color: '#3b82f6', bg: '#eff6ff' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round font-bold text-white"
                style={{ width: 48, height: 48, background: s.color, fontSize: '1.2rem', flexShrink: 0 }}
              >
                {s.step}
              </div>
              <div>
                <div className="font-semibold">{s.label}</div>
                <div className="text-color-secondary text-xs mt-1">{s.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PERINGATAN KALAU TIDAK ADA JOB PENDING */}
      {jobs.length === 0 && !loading && (
        <div className="card p-4 mb-4 flex align-items-center gap-3"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <i className="pi pi-exclamation-triangle" style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
          <div>
            <div className="font-semibold" style={{ color: '#92400e' }}>Tidak Ada Job Pending</div>
            <div className="text-sm mt-1" style={{ color: '#92400e' }}>
              Semua job sudah dijadwalkan atau belum ada job yang ditambahkan.
              Tambah job baru untuk menjalankan pipeline.
            </div>
          </div>
          <Button
            label="Input Job Baru"
            icon="pi pi-plus"
            className="ml-auto"
            severity="warning"
            outlined
            onClick={() => router.push('/manajer/job/tambah')}
          />
        </div>
      )}

      <div className="grid">

        {/* JOBS PENDING */}
        <div className="col-12 lg:col-8">
          <div className="card">
            <div className="flex justify-content-between align-items-center mb-3">
              <div className="flex align-items-center gap-2">
                <span className="font-semibold">Jobs Pending Siap Diproses</span>
                <Tag value={jobs.length} severity={jobs.length > 0 ? 'warning' : 'secondary'} />
              </div>
              <Button icon="pi pi-refresh" text onClick={fetchData} loading={loading} tooltip="Refresh" />
            </div>

            {jobs.length === 0 && !loading ? (
              <div className="flex flex-column align-items-center p-4 gap-2">
                <i className="pi pi-inbox" style={{ fontSize: '2rem', color: '#64748b' }} />
                <span className="text-color-secondary text-sm">Tidak ada job dengan status Pending</span>
              </div>
            ) : (
              <DataTable value={jobs} loading={loading} size="small" stripedRows>
                <Column field="job_id"               header="Job ID"    sortable style={{ fontWeight: 600 }} />
                <Column field="operation_type"       header="Operasi"   sortable />
                <Column field="processing_time"      header="Proc Time" body={(r) => `${r.processing_time} mnt`} sortable />
                <Column field="energy_consumption"   header="Energy"    body={(r) => `${r.energy_consumption} kWh`} />
                <Column field="machine_availability" header="Avail"     body={(r) => `${r.machine_availability}%`} />
                <Column header="Status"              body={statusTemplate} />
              </DataTable>
            )}
          </div>
        </div>

        {/* MESIN AKTIF */}
        <div className="col-12 lg:col-4">
          <div className="card">
            <div className="flex align-items-center gap-2 mb-3">
              <span className="font-semibold">Mesin Aktif</span>
              <Tag value={machines.length} severity="success" />
            </div>
            {machines.length === 0 ? (
              <p className="text-color-secondary text-sm">Tidak ada mesin aktif</p>
            ) : (
              machines.map((m, i) => (
                <div key={i} className="flex justify-content-between align-items-center py-2"
                  style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <span className="font-semibold text-sm">{m.machine_id}</span>
                  <span className="text-color-secondary text-sm">{m.machine_name}</span>
                  <Tag value="Aktif" severity="success" />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* HASIL PIPELINE */}
      {result && (
        <div className="card mt-4">
          <div className="flex align-items-center gap-2 mb-4">
            <i className="pi pi-check-circle" style={{ color: '#22c55e', fontSize: '1.5rem' }} />
            <h3 className="m-0">Hasil Pipeline</h3>
            <Tag value="Berhasil" severity="success" className="ml-2" />
            <Button
              label="Lihat Detail Lengkap"
              icon="pi pi-arrow-right"
              text
              className="ml-auto"
              onClick={() => router.push('/manajer/pipeline/hasil')}
            />
          </div>

          <div className="grid mb-4">
            {[
              { label: 'Makespan',    value: `${result.makespan} menit`,    color: '#6366f1' },
              { label: 'Total Jobs',  value: result.total_jobs,             color: '#22c55e' },
              { label: 'Total Mesin', value: result.total_machines,         color: '#f59e0b' },
              { label: 'Kode Jadwal', value: result.schedule?.schedule_code, color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} className="col-12 md:col-3">
                <div className="p-3 border-round text-center" style={{ background: 'var(--surface-ground)' }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-color-secondary text-sm">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <DataTable value={result.detail} size="small" stripedRows paginator rows={10}>
            <Column field="job_id"              header="Job ID"           sortable style={{ fontWeight: 600 }} />
            <Column field="assigned_machine_id" header="Mesin"            sortable />
            <Column field="scheduled_start"     header="Mulai"            body={(r) => formatDate(r.scheduled_start)} sortable />
            <Column field="scheduled_end"       header="Selesai"          body={(r) => formatDate(r.scheduled_end)} sortable />
            <Column field="duration"            header="Durasi"           body={(r) => `${r.duration} mnt`} />
            <Column field="skor_prioritas"      header="Skor Prioritas"   body={(r) => r.skor_prioritas?.toFixed(2)} sortable />
            <Column field="deadline_predicted"  header="Deadline Prediksi" body={(r) => formatDate(r.deadline_predicted)} />
          </DataTable>
        </div>
      )}
    </div>
  );
}