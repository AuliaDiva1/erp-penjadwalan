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

const card = {
  borderRadius: 12,
  border: '1px solid var(--surface-200)',
  background: 'var(--surface-card)',
  padding: '1.25rem',
};

const SectionTitle = ({ children }) => (
  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
    {children}
  </p>
);

const Divider = () => (
  <div style={{ height: 1, background: 'var(--surface-200)', margin: '0.6rem 0' }} />
);

const EmptyState = ({ icon, text }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '2rem 0', color: 'var(--text-color-secondary)' }}>
    <i className={`pi ${icon}`} style={{ fontSize: '1.5rem', opacity: 0.45 }} />
    <p style={{ margin: 0, fontSize: '0.82rem' }}>{text}</p>
  </div>
);

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
    <i className="pi pi-spin pi-spinner" style={{ color: 'var(--text-color-secondary)', fontSize: '1.1rem' }} />
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
  const [loading,        setLoading]        = useState(true);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchAll = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [resStats, resStok, resJadwal, resLog, resModul] = await Promise.all([
        fetch(`${BASE_URL}/dashboard/admin/stats`,        { headers }),
        fetch(`${BASE_URL}/dashboard/admin/stok-kritis`,  { headers }),
        fetch(`${BASE_URL}/dashboard/admin/jadwal`,       { headers }),
        fetch(`${BASE_URL}/dashboard/admin/log?limit=10`, { headers }),
        fetch(`${BASE_URL}/dashboard/admin/modul`,        { headers }),
      ]);

      const [dStats, dStok, dJadwal, dLog, dModul] = await Promise.all([
        resStats.json(), resStok.json(), resJadwal.json(),
        resLog.json(), resModul.json(),
      ]);

      if (dStats.success)  setStats(dStats.data);
      if (dStok.success)   setStokKritis(dStok.data);
      if (dJadwal.success) {
        setRecentJobs(dJadwal.data.recent          || []);
        setInProgressJobs(dJadwal.data.in_progress || []);
      }
      if (dLog.success)   setLogs(dLog.data    || []);
      if (dModul.success) setModulSummary(dModul.data);
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

  const menuShortcuts = [
    { label: 'Kelola Pengguna',   icon: 'pi-users',      desc: 'Tambah, edit, dan kelola akun pengguna',      route: '/admin/pengguna',                   color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Kelola Mesin',      icon: 'pi-server',     desc: 'Manajemen data mesin produksi',                route: '/admin/mesin',                      color: '#0891b2', bg: '#e0f2fe' },
    { label: 'Kelola Bahan Baku', icon: 'pi-box',        desc: 'Manajemen material dan batas minimum stok',    route: '/admin/materials',                  color: '#059669', bg: '#d1fae5' },
    { label: 'Fuzzy Mamdani',     icon: 'pi-sliders-h',  desc: 'Atur 27 rules dan bobot operation type',       route: '/admin/konfigurasi/fuzzy/parameter', color: '#d97706', bg: '#fef3c7' },
    { label: 'Parameter CCEA',    icon: 'pi-chart-line', desc: 'Atur populasi, iterasi, dan dekomposisi CCEA', route: '/admin/konfigurasi/ccea',            color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Log Aktivitas',     icon: 'pi-history',    desc: 'Pantau semua aktivitas pengguna di sistem',    route: '/admin/monitoring/log',             color: '#0891b2', bg: '#e0f2fe' },
  ];

  const noUrut = (_, options) => options.rowIndex + 1;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0.5rem' }}>
      <Toast ref={toast} />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-200)' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 4, fontSize: '1.2rem', fontWeight: 700 }}>Dashboard Admin</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-color-secondary)' }}>Panel administrasi ERP Penjadwalan Produksi</p>
        </div>
        <Button label="Refresh" icon="pi pi-refresh" outlined size="small" onClick={fetchAll} loading={loading} />
      </div>

      {/* STAT CARDS */}
      <SectionTitle>Ringkasan Sistem</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: '1.75rem' }}>
        {statCards.map((s, i) => (
          <div key={i} onClick={() => router.push(s.route)}
            style={{ ...card, borderLeft: `3px solid ${s.color}`, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>{s.label}</p>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`pi ${s.icon}`} style={{ fontSize: '0.82rem', color: s.color }} />
              </div>
            </div>
            <p style={{ margin: 0, marginBottom: 3, fontSize: '1.7rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-color-secondary)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* JOB STATUS BAR */}
      {stats?.jobs && (
        <>
          <SectionTitle>Status Job Produksi</SectionTitle>
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: '1.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${jobBarItems.length}, 1fr)` }}>
              {jobBarItems.map((j, i) => (
                <div key={i} onClick={() => router.push('/admin/monitoring/jadwal')}
                  style={{ textAlign: 'center', padding: '1rem 0.5rem', borderRight: i < jobBarItems.length - 1 ? '1px solid var(--surface-200)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <p style={{ margin: 0, marginBottom: 4, fontSize: '1.5rem', fontWeight: 700, color: j.color, lineHeight: 1 }}>{j.value ?? 0}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 500 }}>{j.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* STOK KRITIS + JOB BERJALAN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '1.75rem' }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="pi pi-exclamation-triangle" style={{ color: '#dc2626', fontSize: '0.9rem' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Stok Bahan Baku Kritis</span>
            </div>
            <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/stok')} />
          </div>
          {loading ? <LoadingSpinner /> : stokKritis.length === 0 ? (
            <EmptyState icon="pi-check-circle" text="Semua stok dalam kondisi aman" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stokKritis.slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#fff5f5', border: '1px solid #fecaca' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{s.material_name}</p>
                    <p style={{ margin: 0, marginTop: 2, fontSize: '0.72rem', color: 'var(--text-color-secondary)' }}>Min: {s.min_stock_level} {s.nama_satuan}</p>
                  </div>
                  <Tag value={`${s.current_stock} ${s.nama_satuan}`} severity={s.current_stock === 0 ? 'danger' : 'warning'} />
                </div>
              ))}
              {stokKritis.length > 5 && <p style={{ margin: 0, marginTop: 2, fontSize: '0.72rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>+{stokKritis.length - 5} item lainnya</p>}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="pi pi-spin pi-spinner" style={{ color: '#4f46e5', fontSize: '0.9rem' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Job Sedang Berjalan</span>
              {inProgressJobs.length > 0 && <Tag value={String(inProgressJobs.length)} severity="info" style={{ fontSize: '0.7rem' }} />}
            </div>
            <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/jadwal')} />
          </div>
          {loading ? <LoadingSpinner /> : inProgressJobs.length === 0 ? (
            <EmptyState icon="pi-calendar" text="Tidak ada job yang sedang berjalan" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inProgressJobs.slice(0, 5).map((j, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-50)', border: '1px solid var(--surface-200)' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.job_id} — {j.nama_operasi ?? j.operation_type ?? '-'}</p>
                    <p style={{ margin: 0, marginTop: 2, fontSize: '0.72rem', color: 'var(--text-color-secondary)' }}>{j.machine_name ?? '-'} · {formatDate(j.scheduled_start)}</p>
                  </div>
                  {jobStatusTemplate(j)}
                </div>
              ))}
              {inProgressJobs.length > 5 && <p style={{ margin: 0, marginTop: 2, fontSize: '0.72rem', color: 'var(--text-color-secondary)', textAlign: 'center' }}>+{inProgressJobs.length - 5} job lainnya</p>}
            </div>
          )}
        </div>
      </div>

      {/* RECENT JOBS TABLE */}
      <div style={{ ...card, marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="pi pi-list" style={{ color: '#7c3aed', fontSize: '0.9rem' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Aktivitas Job Terbaru</span>
          </div>
          <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/jadwal')} />
        </div>
        <DataTable value={recentJobs} loading={loading} emptyMessage="Belum ada data job" size="small" stripedRows style={{ fontSize: '0.82rem' }}>
          <Column header="No"          body={(_, o) => o.rowIndex + 1}                              style={{ width: '3rem', textAlign: 'center' }} />
          <Column field="job_id"       header="Job ID"                                              style={{ fontWeight: 600 }} />
          <Column header="Operasi"     body={(r) => r.nama_operasi ?? r.operation_type ?? '-'}      />
          <Column header="Mesin"       body={(r) => r.machine_name ?? '-'}                          />
          <Column header="Status"      body={jobStatusTemplate}                                     />
          <Column header="Dijadwalkan" body={(r) => formatDate(r.scheduled_start)}                  />
          <Column header="Diperbarui"  body={(r) => formatDate(r.updated_at)}                       />
        </DataTable>
      </div>

      {/* LOG AKTIVITAS */}
      <div style={{ ...card, marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="pi pi-history" style={{ color: '#0891b2', fontSize: '0.9rem' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Log Aktivitas Sistem</span>
          </div>
          <Button label="Lihat Semua" text size="small" onClick={() => router.push('/admin/monitoring/log')} />
        </div>
        <DataTable value={logs} loading={loading} emptyMessage="Belum ada log" size="small" stripedRows style={{ fontSize: '0.82rem' }}>
          <Column header="No"         body={(_, o) => o.rowIndex + 1}                                                             style={{ width: '3rem', textAlign: 'center' }} />
          <Column header="Pengguna"   body={(r) => r.full_name || r.username || '-'}                                               />
          <Column header="Role"       body={(r) => r.role ? <Tag value={r.role} severity="info" /> : '-'}                         />
          <Column field="module"      header="Modul"                                                                               />
          <Column header="Aksi"       body={(r) => <Tag value={r.action} severity={ACTION_CONFIG[r.action] ?? 'info'} />}         />
          <Column field="description" header="Deskripsi"                                                                           />
          <Column header="Waktu"      body={(r) => formatDate(r.created_at)}                                                       />
        </DataTable>
      </div>

      {/* RINGKASAN MODUL + INFO SISTEM */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: '1.75rem' }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.9rem' }}>
            <i className="pi pi-th-large" style={{ color: '#059669', fontSize: '0.9rem' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Ringkasan Semua Modul</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {modulItems.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--surface-50)', border: '1px solid var(--surface-200)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`pi ${m.icon}`} style={{ color: m.color, fontSize: '0.9rem' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</p>
                  <p style={{ margin: 0, marginTop: 2, fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.9rem' }}>
            <i className="pi pi-info-circle" style={{ color: '#0891b2', fontSize: '0.9rem' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Informasi Sistem</span>
          </div>
          {[
            { key: 'Sistem',     val: 'ERP Penjadwalan Produksi'                    },
            { key: 'Algoritma',  val: 'Fuzzy Mamdani + CCEA'                        },
            { key: 'Status API', val: <Tag value="Online" severity="success" />     },
            { key: 'Frontend',   val: 'Next.js + PrimeReact'                        },
            { key: 'Backend',    val: 'Express.js + Flask'                          },
          ].map((r, i, arr) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>{r.key}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{r.val}</span>
              </div>
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </div>

      {/* AKSES CEPAT */}
      <SectionTitle>Akses Cepat</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {menuShortcuts.map((m, i) => (
          <div key={i} onClick={() => router.push(m.route)}
            style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '1rem', transition: 'box-shadow 0.2s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`pi ${m.icon}`} style={{ fontSize: '0.9rem', color: m.color }} />
            </div>
            <div>
              <p style={{ margin: 0, marginBottom: 3, fontWeight: 600, fontSize: '0.85rem' }}>{m.label}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-color-secondary)', lineHeight: 1.5 }}>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}