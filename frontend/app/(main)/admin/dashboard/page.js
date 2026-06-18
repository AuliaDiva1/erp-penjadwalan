'use client';
import { useState, useEffect, useRef } from 'react';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const JOB_STATUS_CONFIG = {
  pending:     { label: 'Pending',   severity: 'warning'  },
  scheduled:   { label: 'Terjadwal', severity: 'info'     },
  in_progress: { label: 'Berjalan',  severity: 'info'     },
  completed:   { label: 'Selesai',   severity: 'success'  },
  delayed:     { label: 'Terlambat', severity: 'danger'   },
  failed:      { label: 'Gagal',     severity: 'danger'   },
};

const ACTION_CONFIG = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  READ:   'secondary',
};

const SectionTitle = ({ children }) => (
  <p className="text-xs font-semibold text-color-secondary mb-2"
    style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
    {children}
  </p>
);

const EmptyState = ({ icon, text }) => (
  <div className="flex flex-column align-items-center justify-content-center gap-2 py-4">
    <i className={`pi ${icon}`} style={{ fontSize: '1.75rem', color: 'var(--text-color-secondary)' }} />
    <p className="text-color-secondary text-sm m-0">{text}</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex justify-content-center py-4">
    <i className="pi pi-spin pi-spinner text-color-secondary" />
  </div>
);

export default function AdminDashboard() {
  const toast                               = useRef(null);
  const router                              = useRouter();
  const [stats,          setStats]          = useState(null);
  const [stokKritis,     setStokKritis]     = useState([]);
  const [recentJobs,     setRecentJobs]     = useState([]);
  const [inProgressJobs, setInProgressJobs] = useState([]);
  const [logs,           setLogs]           = useState([]);
  const [modulSummary,   setModulSummary]   = useState(null);
  const [modelRF,        setModelRF]        = useState(null);
  const [loading,        setLoading]        = useState(true);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchAll = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [resStats, resStok, resJadwal, resLog, resModul, resModel] = await Promise.all([
        fetch(`${BASE_URL}/dashboard/admin/stats`,        { headers }),
        fetch(`${BASE_URL}/dashboard/admin/stok-kritis`,  { headers }),
        fetch(`${BASE_URL}/dashboard/admin/jadwal`,       { headers }),
        fetch(`${BASE_URL}/dashboard/admin/log?limit=10`, { headers }),
        fetch(`${BASE_URL}/dashboard/admin/modul`,        { headers }),
        fetch(`${BASE_URL}/dashboard/admin/model-rf`,     { headers }),
      ]);

      const [dStats, dStok, dJadwal, dLog, dModul, dModel] = await Promise.all([
        resStats.json(), resStok.json(), resJadwal.json(),
        resLog.json(), resModul.json(), resModel.json(),
      ]);

      if (dStats.success)  setStats(dStats.data);
      if (dStok.success)   setStokKritis(dStok.data);
      if (dJadwal.success) {
        setRecentJobs(dJadwal.data.recent          || []);
        setInProgressJobs(dJadwal.data.in_progress || []);
      }
      if (dLog.success)   setLogs(dLog.data    || []);
      if (dModul.success) setModulSummary(dModul.data);
      if (dModel.success) setModelRF(dModel.data);
    } catch (err) {
      console.error('fetchAll error:', err);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const jobStatusTemplate = (row) => {
    const key    = row.job_status?.toLowerCase().replace(' ', '_');
    const config = JOB_STATUS_CONFIG[key] ?? { label: row.job_status, severity: 'secondary' };
    return <Tag value={config.label} severity={config.severity} />;
  };

  const statCards = [
    { label: 'Total Pengguna',   value: stats?.users?.total            ?? 0, sub: `${stats?.users?.aktif ?? 0} aktif`,          icon: 'pi-users',                color: '#4f46e5', bg: '#eef2ff', route: '/admin/pengguna'          },
    { label: 'Mesin Aktif',      value: stats?.machines?.active        ?? 0, sub: `${stats?.machines?.total ?? 0} total mesin`, icon: 'pi-server',               color: '#0891b2', bg: '#e0f2fe', route: '/admin/mesin'              },
    { label: 'Total Bahan Baku', value: modulSummary?.total_materials  ?? 0, sub: `${stats?.stok_kritis ?? 0} item kritis`,    icon: 'pi-box',                  color: '#059669', bg: '#d1fae5', route: '/admin/materials'          },
    { label: 'Stok Kritis',      value: stats?.stok_kritis             ?? 0, sub: 'perlu pengadaan',                            icon: 'pi-exclamation-triangle', color: '#dc2626', bg: '#fee2e2', route: '/admin/monitoring/stok'   },
    { label: 'Job Berjalan',     value: stats?.jobs?.in_progress       ?? 0, sub: `${stats?.jobs?.scheduled ?? 0} terjadwal`,  icon: 'pi-calendar',             color: '#d97706', bg: '#fef3c7', route: '/admin/monitoring/jadwal' },
    { label: 'Log Hari Ini',     value: stats?.log_hari_ini            ?? 0, sub: 'aktivitas sistem',                           icon: 'pi-list',                 color: '#7c3aed', bg: '#f5f3ff', route: '/admin/monitoring/log'    },
  ];

  const jobBarItems = [
    { label: 'Total',     value: stats?.jobs?.total,       color: '#64748b' },
    { label: 'Pending',   value: stats?.jobs?.pending,     color: '#d97706' },
    { label: 'Terjadwal', value: stats?.jobs?.scheduled,   color: '#0891b2' },
    { label: 'Berjalan',  value: stats?.jobs?.in_progress, color: '#4f46e5' },
    { label: 'Selesai',   value: stats?.jobs?.completed,   color: '#059669' },
    { label: 'Terlambat', value: stats?.jobs?.delayed,     color: '#dc2626' },
    { label: 'Gagal',     value: stats?.jobs?.failed,      color: '#991b1b' },
  ];

  const modulItems = modulSummary ? [
    { label: 'Total Pengguna',    value: modulSummary.total_users,       icon: 'pi-users',     color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Total Mesin',       value: modulSummary.total_machines,    icon: 'pi-server',    color: '#0891b2', bg: '#e0f2fe' },
    { label: 'Total Material',    value: modulSummary.total_materials,   icon: 'pi-box',       color: '#059669', bg: '#d1fae5' },
    { label: 'Total Job',         value: modulSummary.total_jobs,        icon: 'pi-file-edit', color: '#d97706', bg: '#fef3c7' },
    { label: 'Total Jadwal',      value: modulSummary.total_schedules,   icon: 'pi-calendar',  color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Pengadaan Pending', value: modulSummary.pending_pengadaan, icon: 'pi-bell',      color: '#dc2626', bg: '#fee2e2' },
  ] : [];

  const rfRows = modelRF ? [
    { key: 'Nama Model', val: modelRF.nama_model  || 'Random Forest Regressor' },
    { key: 'Versi',      val: modelRF.versi        || '-' },
    { key: 'MAE',        val: modelRF.mae          ? `${modelRF.mae} menit`                    : '-' },
    { key: 'RMSE',       val: modelRF.rmse         ? `${modelRF.rmse} menit`                   : '-' },
    { key: 'R²',         val: modelRF.r2_score     ? `${(modelRF.r2_score * 100).toFixed(1)}%` : '-' },
    { key: 'Status',     val: modelRF.is_active
        ? <Tag value="Aktif" severity="success" />
        : <Tag value="Tidak Aktif" severity="secondary" /> },
    { key: 'Dilatih',    val: formatDate(modelRF.trained_at) },
  ] : [];

  const menuShortcuts = [
    { label: 'Kelola Pengguna',   icon: 'pi-users',      desc: 'Tambah, edit, dan kelola akun pengguna',      route: '/admin/pengguna',                    color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Kelola Mesin',      icon: 'pi-server',     desc: 'Manajemen data mesin produksi',                route: '/admin/mesin',                       color: '#0891b2', bg: '#e0f2fe' },
    { label: 'Kelola Bahan Baku', icon: 'pi-box',        desc: 'Manajemen material dan batas minimum stok',    route: '/admin/materials',                   color: '#059669', bg: '#d1fae5' },
    { label: 'Fuzzy Mamdani',     icon: 'pi-sliders-h',  desc: 'Atur 27 rules dan bobot operation type',       route: '/admin/konfigurasi/fuzzy/parameter',  color: '#d97706', bg: '#fef3c7' },
    { label: 'Parameter CCEA',    icon: 'pi-chart-line', desc: 'Atur populasi, iterasi, dan dekomposisi CCEA', route: '/admin/konfigurasi/ccea',             color: '#d97706', bg: '#fef3c7' },
    { label: 'Model Prediksi RF', icon: 'pi-cog',        desc: 'Pantau dan reset model Random Forest',         route: '/admin/konfigurasi/model',            color: '#7c3aed', bg: '#f5f3ff' },
  ];

  const noUrut = (options) => options.rowIndex + 1;

  const cardStyle = {
    borderRadius: 10,
    border: '1px solid var(--surface-200)',
    background: 'var(--surface-card)',
    padding: '1.25rem',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Toast ref={toast} />

      {/* HEADER */}
      <div className="flex align-items-center justify-content-between mb-4 pb-3"
        style={{ borderBottom: '1px solid var(--surface-200)' }}>
        <div>
          <h2 className="m-0 mb-1" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dashboard Admin</h2>
          <p className="m-0 text-color-secondary text-sm">Panel administrasi ERP Penjadwalan Produksi</p>
        </div>
        <Button label="Refresh" icon="pi pi-refresh" outlined size="small" onClick={fetchAll} loading={loading} />
      </div>

      {/* STAT CARDS */}
      <SectionTitle>Ringkasan Sistem</SectionTitle>
      <div className="grid mb-4">
        {statCards.map((s, i) => (
          <div key={i} className="col-12 sm:col-6 lg:col-4 xl:col-2">
            <div
              onClick={() => router.push(s.route)}
              className="cursor-pointer"
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${s.color}`,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="flex align-items-center justify-content-between mb-2">
                <p className="text-xs text-color-secondary m-0"
                  style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
                  {s.label}
                </p>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, background: s.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`pi ${s.icon}`} style={{ fontSize: '0.9rem', color: s.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold m-0 mb-1" style={{ color: s.color }}>
                {loading ? '—' : s.value}
              </p>
              <p className="text-xs text-color-secondary m-0">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* JOB STATUS BAR */}
      {stats?.jobs && (
        <>
          <SectionTitle>Status Job Produksi</SectionTitle>
          <div className="mb-4" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div className="grid m-0">
              {jobBarItems.map((j, i) => (
                <div
                  key={i}
                  className="col text-center py-3 cursor-pointer"
                  style={{
                    borderRight: i < jobBarItems.length - 1 ? '1px solid var(--surface-200)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => router.push('/admin/monitoring/jadwal')}
                >
                  <p className="text-2xl font-bold m-0 mb-1" style={{ color: j.color }}>{j.value ?? 0}</p>
                  <p className="text-xs text-color-secondary m-0" style={{ fontWeight: 500 }}>{j.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* STOK KRITIS & JOB BERJALAN */}
      <div className="grid mb-4">
        {/* Stok Kritis */}
        <div className="col-12 lg:col-6">
          <div style={cardStyle} className="h-full">
            <div className="flex justify-content-between align-items-center mb-3">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-exclamation-triangle" style={{ color: '#dc2626', fontSize: '1rem' }} />
                <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Stok Bahan Baku Kritis</h4>
              </div>
              <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/stok')} />
            </div>
            {loading ? <LoadingSpinner /> : stokKritis.length === 0 ? (
              <EmptyState icon="pi-check-circle" text="Semua stok dalam kondisi aman" />
            ) : (
              <div className="flex flex-column gap-2">
                {stokKritis.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex justify-content-between align-items-center px-3 py-2 border-round"
                    style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                    <div>
                      <p className="font-semibold m-0 text-sm">{s.material_name}</p>
                      <p className="text-xs text-color-secondary m-0 mt-1">
                        Min: {s.min_stock_level} {s.nama_satuan}
                      </p>
                    </div>
                    <Tag
                      value={`${s.current_stock} ${s.nama_satuan}`}
                      severity={s.current_stock === 0 ? 'danger' : 'warning'}
                    />
                  </div>
                ))}
                {stokKritis.length > 5 && (
                  <p className="text-xs text-color-secondary text-center m-0 mt-1">
                    +{stokKritis.length - 5} item lainnya
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Job Berjalan */}
        <div className="col-12 lg:col-6">
          <div style={cardStyle} className="h-full">
            <div className="flex justify-content-between align-items-center mb-3">
              <div className="flex align-items-center gap-2">
                <i className="pi pi-spin pi-spinner" style={{ color: '#4f46e5', fontSize: '1rem' }} />
                <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Job Sedang Berjalan</h4>
                {inProgressJobs.length > 0 && (
                  <Tag value={inProgressJobs.length} severity="info" style={{ fontSize: '0.75rem' }} />
                )}
              </div>
              <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/jadwal')} />
            </div>
            {loading ? <LoadingSpinner /> : inProgressJobs.length === 0 ? (
              <EmptyState icon="pi-calendar" text="Tidak ada job yang sedang berjalan" />
            ) : (
              <div className="flex flex-column gap-2">
                {inProgressJobs.slice(0, 5).map((j, i) => (
                  <div key={i} className="flex justify-content-between align-items-center px-3 py-2 border-round"
                    style={{ background: 'var(--surface-50)', border: '1px solid var(--surface-200)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-semibold m-0 text-sm" style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {j.job_id} — {j.nama_operasi ?? j.operation_type ?? '-'}
                      </p>
                      <p className="text-xs text-color-secondary m-0 mt-1">
                        {j.machine_name ?? '-'} · {formatDate(j.scheduled_start)}
                      </p>
                    </div>
                    <div style={{ marginLeft: '0.75rem', flexShrink: 0 }}>
                      {jobStatusTemplate(j)}
                    </div>
                  </div>
                ))}
                {inProgressJobs.length > 5 && (
                  <p className="text-xs text-color-secondary text-center m-0 mt-1">
                    +{inProgressJobs.length - 5} job lainnya sedang berjalan
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT JOBS TABLE */}
      <div style={cardStyle} className="mb-4">
        <div className="flex justify-content-between align-items-center mb-3">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-list" style={{ color: '#7c3aed', fontSize: '1rem' }} />
            <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Aktivitas Job Terbaru</h4>
          </div>
          <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/jadwal')} />
        </div>
        <DataTable
          value={recentJobs}
          loading={loading}
          emptyMessage="Belum ada data job"
          size="small"
          stripedRows
          style={{ fontSize: '0.875rem' }}
        >
          <Column header="No"          body={noUrut}                                           style={{ width: '3rem', textAlign: 'center' }} />
          <Column field="job_id"       header="Job ID"                                         style={{ fontWeight: 600 }} />
          <Column header="Operasi"     body={(r) => r.nama_operasi ?? r.operation_type ?? '-'} />
          <Column header="Mesin"       body={(r) => r.machine_name ?? '-'} />
          <Column header="Status"      body={jobStatusTemplate} />
          <Column header="Dijadwalkan" body={(r) => formatDate(r.scheduled_start)} />
          <Column header="Diperbarui"  body={(r) => formatDate(r.updated_at)} />
        </DataTable>
      </div>

      {/* LOG AKTIVITAS */}
      <div style={cardStyle} className="mb-4">
        <div className="flex justify-content-between align-items-center mb-3">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-history" style={{ color: '#0891b2', fontSize: '1rem' }} />
            <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Log Aktivitas Sistem</h4>
          </div>
          <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/log')} />
        </div>
        <DataTable
          value={logs}
          loading={loading}
          emptyMessage="Belum ada log"
          size="small"
          stripedRows
          style={{ fontSize: '0.875rem' }}
        >
          <Column header="No"          body={noUrut}                                                                  style={{ width: '3rem', textAlign: 'center' }} />
          <Column header="Pengguna"    body={(r) => r.full_name || r.username || '-'} />
          <Column header="Role"        body={(r) => r.role ? <Tag value={r.role} severity="info" /> : '-'} />
          <Column field="module"       header="Modul" />
          <Column header="Aksi"        body={(r) => <Tag value={r.action} severity={ACTION_CONFIG[r.action] ?? 'info'} />} />
          <Column field="description"  header="Deskripsi" />
          <Column header="Waktu"       body={(r) => formatDate(r.created_at)} />
        </DataTable>
      </div>

      {/* RINGKASAN MODUL + RF + INFO SISTEM */}
      <div className="grid mb-4">
        <div className="col-12 lg:col-8">
          <div style={cardStyle} className="h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-th-large" style={{ color: '#059669', fontSize: '1rem' }} />
              <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Ringkasan Semua Modul</h4>
            </div>
            <div className="grid">
              {modulItems.map((m, i) => (
                <div key={i} className="col-6 md:col-4 mb-3">
                  <div className="flex align-items-center gap-2">
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: m.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <i className={`pi ${m.icon}`} style={{ color: m.color, fontSize: '1rem' }} />
                    </div>
                    <div>
                      <p className="text-xl font-bold m-0" style={{ color: m.color }}>{m.value}</p>
                      <p className="text-xs text-color-secondary m-0">{m.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 lg:col-4 flex flex-column gap-3">
          {/* Model RF */}
          <div style={cardStyle}>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-cog" style={{ color: '#7c3aed', fontSize: '1rem' }} />
              <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Model Prediksi RF</h4>
            </div>
            {modelRF ? (
              <>
                {rfRows.map((r, i) => (
                  <div key={i} className="flex justify-content-between align-items-center py-2"
                    style={{ borderBottom: i < rfRows.length - 1 ? '1px solid var(--surface-200)' : 'none' }}>
                    <span className="text-color-secondary text-sm">{r.key}</span>
                    <span className="font-semibold text-sm">{r.val}</span>
                  </div>
                ))}
                <Button
                  label="Reset / Update Model"
                  icon="pi pi-refresh"
                  size="small"
                  outlined
                  className="w-full mt-3"
                  onClick={() => router.push('/admin/konfigurasi/model')}
                />
              </>
            ) : (
              <>
                <p className="text-color-secondary text-sm mb-3">Model belum dilatih atau Flask tidak aktif.</p>
                <Button
                  label="Buka Halaman Model"
                  icon="pi pi-cog"
                  size="small"
                  outlined
                  className="w-full"
                  onClick={() => router.push('/admin/konfigurasi/model')}
                />
              </>
            )}
          </div>

          {/* Info Sistem */}
          <div style={cardStyle}>
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-info-circle" style={{ color: '#0891b2', fontSize: '1rem' }} />
              <h4 className="m-0" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Informasi Sistem</h4>
            </div>
            {[
              { key: 'Sistem',     val: 'ERP Penjadwalan Produksi'                                           },
              { key: 'Algoritma',  val: 'Fuzzy Mamdani + CCEA + RF'                                          },
              { key: 'Status API', val: <Tag value="Online"  severity="success" />                           },
              { key: 'Flask',      val: modelRF
                  ? <Tag value="Online"  severity="success" />
                  : <Tag value="Offline" severity="danger"  /> },
            ].map((r, i) => (
              <div key={i} className="flex justify-content-between align-items-center py-2"
                style={{ borderBottom: i < 3 ? '1px solid var(--surface-200)' : 'none' }}>
                <span className="text-color-secondary text-sm">{r.key}</span>
                <span className="font-semibold text-sm">{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AKSES CEPAT */}
      <SectionTitle>Akses Cepat</SectionTitle>
      <div className="grid">
        {menuShortcuts.map((m, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-4">
            <div
              onClick={() => router.push(m.route)}
              className="flex align-items-start gap-3 p-3 cursor-pointer"
              style={{
                ...cardStyle,
                padding: '1rem',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 9, background: m.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className={`pi ${m.icon}`} style={{ fontSize: '1rem', color: m.color }} />
              </div>
              <div>
                <p className="font-semibold m-0 mb-1 text-sm">{m.label}</p>
                <p className="text-xs text-color-secondary m-0">{m.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}