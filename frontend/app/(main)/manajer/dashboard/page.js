'use client';
import { useState, useEffect, useRef } from 'react';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressBar } from 'primereact/progressbar';
import { Button } from 'primereact/button';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_MAP = {
  Pending:       { severity: 'warning', color: '#f59e0b', bg: '#fffbeb' },
  Scheduled:     { severity: 'info',    color: '#8b5cf6', bg: '#f5f3ff' },
  'In Progress': { severity: 'info',    color: '#3b82f6', bg: '#eff6ff' },
  Completed:     { severity: 'success', color: '#22c55e', bg: '#f0fdf4' },
  Delayed:       { severity: 'danger',  color: '#ef4444', bg: '#fef2f2' },
  Failed:        { severity: 'danger',  color: '#dc2626', bg: '#fef2f2' },
};

const OPT_MAP = {
  'Optimal Efficiency':  { severity: 'success' },
  'High Efficiency':     { severity: 'info'    },
  'Moderate Efficiency': { severity: 'warning' },
  'Low Efficiency':      { severity: 'danger'  },
};

const fmt     = (v) => v ? new Date(v).toLocaleString('id-ID',     { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—';

export default function DashboardManajer() {
  const toast             = useRef(null);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/dashboard/manajer`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const s  = data?.job_stats;
  const ms = data?.machine_stats;

  const completionRate  = s  ? Math.round((s.completed / (s.total  || 1)) * 100) : 0;
  const machineUtilRate = ms ? Math.round((ms.active   / (ms.total || 1)) * 100) : 0;

  const trendData = (data?.job_trend || []).map(r => ({
    date:      fmtDate(r.date),
    total:     Number(r.total),
    completed: Number(r.completed),
    delayed:   Number(r.delayed),
  }));

  const statusDistData = s ? [
    { name: 'Pending',     value: s.pending,     fill: '#f59e0b' },
    { name: 'Scheduled',   value: s.scheduled,   fill: '#8b5cf6' },
    { name: 'In Progress', value: s.in_progress, fill: '#3b82f6' },
    { name: 'Completed',   value: s.completed,   fill: '#22c55e' },
    { name: 'Delayed',     value: s.delayed,     fill: '#ef4444' },
    { name: 'Failed',      value: s.failed,      fill: '#dc2626' },
  ] : [];

  const jobCards = s ? [
    { label: 'Total Job',        value: s.total,              icon: 'pi-briefcase',            color: '#6366f1', bg: '#eef2ff' },
    { label: 'Pending',          value: s.pending,            icon: 'pi-clock',                color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Scheduled',        value: s.scheduled,          icon: 'pi-calendar',             color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'In Progress',      value: s.in_progress,        icon: 'pi-spinner',              color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Completed',        value: s.completed,          icon: 'pi-check-circle',         color: '#22c55e', bg: '#f0fdf4' },
    { label: 'Delayed / Failed', value: s.delayed + s.failed, icon: 'pi-exclamation-triangle', color: '#ef4444', bg: '#fef2f2' },
  ] : [];

  // ── templates ──────────────────────────────────────────
  const statusTag = (row) =>
    <Tag value={row.job_status} severity={STATUS_MAP[row.job_status]?.severity || 'info'} />;

  const optTag = (row) => row.optimization_category
    ? <Tag value={row.optimization_category} severity={OPT_MAP[row.optimization_category]?.severity || 'info'} />
    : <span className="text-color-secondary text-sm">—</span>;

  const urgentTag = (row) => row.is_urgent
    ? <Tag value="Urgent" severity="danger" icon="pi pi-bolt" />
    : <span className="text-color-secondary text-sm">—</span>;

  const deadlineTag = (row) => !row.deadline
    ? <span className="text-color-secondary text-sm">—</span>
    : (
      <span className={row.deadline_warning ? 'text-red-500 font-bold' : ''}>
        {fmtDate(row.deadline)}
        {row.deadline_warning && <i className="pi pi-exclamation-triangle ml-1 text-xs" />}
      </span>
    );

  const makespanBadge = (row) => row.makespan != null
    ? <span className="font-semibold">{row.makespan} <small className="text-color-secondary">mnt</small></span>
    : <span className="text-color-secondary text-sm">—</span>;

  const priorityBar = (row) => {
    if (row.priority_score == null) return <span className="text-color-secondary text-sm">—</span>;
    const pct = Math.min(Math.round(row.priority_score * 100), 100);
    return (
      <div className="flex align-items-center gap-2">
        <ProgressBar value={pct} showValue={false} style={{ height: '6px', flex: 1 }} />
        <span className="text-xs">{row.priority_score?.toFixed(2)}</span>
      </div>
    );
  };

  const tooltipStyle = {
    background:   'var(--surface-card)',
    border:       '1px solid var(--surface-border)',
    borderRadius: '8px',
    fontSize:     '12px',
  };

  return (
    <div>
      <Toast ref={toast} />

      {/* ── Header ── */}
      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Dashboard Produksi</h2>
          <p className="m-0 text-color-secondary text-sm">
            Ringkasan performa, progres realisasi, dan kondisi mesin produksi
          </p>
        </div>
        <Button icon="pi pi-refresh" text rounded tooltip="Refresh" loading={loading} onClick={fetchDashboard} />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid mb-4">
        {jobCards.map((c, i) => (
          <div key={i} className="col-6 md:col-4 lg:col-2">
            <div className="card p-3 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${c.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: 44, height: 44, background: c.bg, flexShrink: 0 }}
              >
                <i className={`pi ${c.icon}`} style={{ fontSize: '1.3rem', color: c.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold">{loading ? '—' : c.value}</div>
                <div className="text-color-secondary text-xs">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid mb-4">

        {/* Area chart — tren 30 hari */}
        <div className="col-12 lg:col-8">
          <div className="card">
            <div className="flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">Tren Job — 30 Hari Terakhir</h5>
              <div className="flex gap-3 text-xs text-color-secondary">
                <span><span style={{ color: '#6366f1' }}>●</span> Total</span>
                <span><span style={{ color: '#22c55e' }}>●</span> Selesai</span>
                <span><span style={{ color: '#ef4444' }}>●</span> Terlambat</span>
              </div>
            </div>
            {trendData.length === 0 ? (
              <div className="flex align-items-center justify-content-center" style={{ height: 220 }}>
                <span className="text-color-secondary text-sm">Belum ada data tren</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal"     x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="total"     name="Total"     stroke="#6366f1" fill="url(#gTotal)"     strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="completed" name="Selesai"   stroke="#22c55e" fill="url(#gCompleted)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="delayed"   name="Terlambat" stroke="#ef4444" fill="none"             strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar chart — distribusi status */}
        <div className="col-12 lg:col-4">
          <div className="card">
            <h5 className="m-0 mb-3">Distribusi Status Job</h5>
            {statusDistData.length === 0 ? (
              <div className="flex align-items-center justify-content-center" style={{ height: 220 }}>
                <span className="text-color-secondary text-sm">Belum ada data</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusDistData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
                    {statusDistData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Completion + Mesin + Makespan ── */}
      <div className="grid mb-4">

        <div className="col-12 lg:col-5">
          <div className="card h-full">
            <h5 className="mt-0 mb-3">Tingkat Penyelesaian Job</h5>
            <div className="flex align-items-center gap-3 mb-2">
              <ProgressBar value={completionRate} style={{ flex: 1, height: '20px' }} />
              <span className="font-bold text-xl">{completionRate}%</span>
            </div>
            <small className="text-color-secondary">
              {s?.completed || 0} dari {s?.total || 0} job selesai
            </small>
            {s && (s.urgent > 0 || s.deadline_warning > 0) && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {s.urgent > 0 && (
                  <div className="flex align-items-center gap-2 p-2 border-round" style={{ background: '#fef2f2' }}>
                    <i className="pi pi-bolt text-red-500" />
                    <span className="text-sm text-red-500 font-medium">{s.urgent} Urgent</span>
                  </div>
                )}
                {s.deadline_warning > 0 && (
                  <div className="flex align-items-center gap-2 p-2 border-round" style={{ background: '#fffbeb' }}>
                    <i className="pi pi-exclamation-triangle text-yellow-500" />
                    <span className="text-sm text-yellow-600 font-medium">{s.deadline_warning} Deadline Warning</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 md:col-6 lg:col-4">
          <div className="card h-full">
            <h5 className="mt-0 mb-3">Status Mesin</h5>
            {ms && (
              <>
                <div className="flex align-items-center gap-2 mb-3">
                  <ProgressBar value={machineUtilRate} showValue={false} style={{ flex: 1, height: '8px' }} color="#22c55e" />
                  <span className="text-sm font-semibold text-green-600">{machineUtilRate}% aktif</span>
                </div>
                {[
                  { label: 'Aktif',       value: ms.active,      color: '#22c55e' },
                  { label: 'Maintenance', value: ms.maintenance, color: '#f59e0b' },
                  { label: 'Breakdown',   value: ms.breakdown,   color: '#ef4444' },
                  { label: 'Tidak Aktif', value: ms.inactive,    color: '#94a3b8' },
                ].map((m, i) => (
                  <div key={i} className="flex justify-content-between align-items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: m.color }}>{m.label}</span>
                    <span className="font-bold">{m.value}</span>
                  </div>
                ))}
                <div className="flex justify-content-between mt-2 pt-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold">{ms.total}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-12 md:col-6 lg:col-3">
          <div className="card h-full flex flex-column justify-content-center align-items-center gap-2">
            <i className="pi pi-chart-bar text-primary" style={{ fontSize: '2rem' }} />
            <div className="text-color-secondary text-sm">Rata-rata Makespan</div>
            <div className="text-4xl font-bold text-primary">
              {data?.avg_makespan != null ? data.avg_makespan : '—'}
            </div>
            <div className="text-color-secondary text-sm">menit / job selesai</div>
          </div>
        </div>
      </div>

      {/* ── Urgent jobs ── */}
      {data?.urgent_jobs?.length > 0 && (
        <div className="card mb-4" style={{ border: '1px solid #fca5a5' }}>
          <h5 className="mt-0 mb-3 text-red-600">
            <i className="pi pi-bolt mr-2" />
            Job Urgent — Perlu Perhatian Segera
          </h5>
          <DataTable value={data.urgent_jobs} size="small" emptyMessage="—">
            <Column field="job_id"         header="Job ID"   style={{ width: '90px', fontWeight: 600 }} />
            <Column field="operation_type" header="Operasi" />
            <Column field="machine_name"   header="Mesin"    body={(r) => r.machine_name || '—'} />
            <Column header="Deadline"      body={deadlineTag} />
            <Column header="Prioritas"     body={priorityBar} style={{ minWidth: '140px' }} />
            <Column header="Status"        body={statusTag} />
          </DataTable>
        </div>
      )}

      {/* ── Tabel bawah ── */}
      <div className="grid">
        <div className="col-12 lg:col-6">
          <div className="card">
            <h5 className="mt-0 mb-3">
              <i className="pi pi-spinner mr-2 text-blue-500" />
              Progres Realisasi Jadwal
            </h5>
            <DataTable value={data?.in_progress_jobs || []} size="small" emptyMessage="Tidak ada job berjalan" paginator rows={5}>
              <Column field="job_id"         header="Job ID"  style={{ width: '80px', fontWeight: 600 }} />
              <Column field="operation_type" header="Operasi" />
              <Column field="machine_name"   header="Mesin"   body={(r) => r.machine_name || '—'} />
              <Column header="Mulai"         body={(r) => fmt(r.scheduled_start)} />
              <Column header="Selesai"       body={(r) => fmt(r.scheduled_end)} />
              <Column header="Makespan"      body={makespanBadge} />
              <Column header="Urgent"        body={urgentTag} style={{ width: '80px' }} />
              <Column header="Status"        body={statusTag} />
            </DataTable>
          </div>
        </div>

        <div className="col-12 lg:col-6">
          <div className="card">
            <h5 className="mt-0 mb-3">
              <i className="pi pi-history mr-2 text-purple-500" />
              Job Terbaru
            </h5>
            <DataTable value={data?.recent_jobs || []} size="small" emptyMessage="Belum ada data job" paginator rows={5}>
              <Column field="job_id"         header="Job ID"  style={{ width: '80px', fontWeight: 600 }} />
              <Column field="operation_type" header="Operasi" />
              <Column field="machine_name"   header="Mesin"   body={(r) => r.machine_name || '—'} />
              <Column header="Deadline"      body={deadlineTag} />
              <Column header="Prioritas"     body={priorityBar} style={{ minWidth: '130px' }} />
              <Column header="Optimasi"      body={optTag} />
              <Column header="Status"        body={statusTag} />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
}