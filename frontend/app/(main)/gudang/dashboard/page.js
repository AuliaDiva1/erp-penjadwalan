'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardPage() {
  const toast    = useRef(null);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [resGudang, resMesin, resOpType] = await Promise.all([
        fetch(`${BASE_URL}/dashboard/gudang/dashboard`,   { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${BASE_URL}/machines`,                      { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${BASE_URL}/operation-types?active=false`,  { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);

      const [gudang, mesin, opType] = await Promise.all([
        resGudang.json(),
        resMesin.json(),
        resOpType.json(),
      ]);

      if (!gudang.success || !mesin.success || !opType.success) {
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat sebagian data dashboard' });
      }

      // Agregasi status mesin dari list
      const mesinList = mesin.data ?? [];
      const mesinAgg  = mesinList.reduce(
        (acc, m) => { acc[m.status] = (acc[m.status] ?? 0) + 1; return acc; },
        { active: 0, maintenance: 0, breakdown: 0, inactive: 0 }
      );

      setData({
        stok:       gudang.data?.stok      ?? {},
        kritis:     gudang.data?.kritis    ?? [],
        riwayat:    gudang.data?.riwayat   ?? [],
        pengadaan:  gudang.data?.pengadaan ?? {},
        mesinAgg:   { total: mesinList.length, ...mesinAgg },
        mesinList,
        opTypes:    opType.data ?? [],
      });

      // Notifikasi stok habis
      if (gudang.data?.stok?.habis > 0) {
        toast.current.show({
          severity: 'error',
          summary:  `🚨 ${gudang.data.stok.habis} Bahan Baku Habis!`,
          detail:   'Ada bahan baku yang stoknya sudah habis, segera lakukan pengadaan!',
          life:     10000,
          sticky:   true,
        });
      }

      // Notifikasi stok kritis
      if (gudang.data?.kritis?.length > 0) {
        toast.current.show({
          severity: 'warn',
          summary:  `⚠ ${gudang.data.kritis.length} Stok Kritis!`,
          detail:   gudang.data.kritis.map(k => k.material_name).join(', '),
          life:     8000,
          sticky:   gudang.data.kritis.length >= 3,
        });
      }

      // Notifikasi mesin breakdown
      if (mesinAgg.breakdown > 0) {
        toast.current.show({
          severity: 'error',
          summary:  `🔧 ${mesinAgg.breakdown} Mesin Breakdown!`,
          detail:   mesinList.filter(m => m.status === 'breakdown').map(m => m.machine_name).join(', '),
          life:     8000,
        });
      }

    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getStokStatus = (current, min) => {
    if (current === 0)  return { label: 'Habis',  severity: 'danger',  color: '#ef4444' };
    if (current <= min) return { label: 'Kritis', severity: 'warning', color: '#f59e0b' };
    return                     { label: 'Aman',   severity: 'success', color: '#22c55e' };
  };

  const getMesinStatus = (status) => {
    const map = {
      active:      { label: 'Aktif',       severity: 'success' },
      maintenance: { label: 'Maintenance', severity: 'warning' },
      breakdown:   { label: 'Breakdown',   severity: 'danger'  },
      inactive:    { label: 'Nonaktif',    severity: 'secondary' },
    };
    return map[status] || { label: status, severity: 'info' };
  };

  const getPengadaanStatus = (status) => {
    const map = {
      pending:     { label: 'Pending',  severity: 'warning' },
      in_progress: { label: 'Diproses', severity: 'info'    },
      completed:   { label: 'Selesai',  severity: 'success' },
    };
    return map[status] || { label: status, severity: 'info' };
  };

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  // ── Skeleton loading ─────────────────────────────────────────────────────────

  if (!data && !loading) return (
    <div className="flex align-items-center justify-content-center" style={{ height: '60vh' }}>
      <Button label="Muat Dashboard" icon="pi pi-refresh" onClick={fetchDashboard} />
    </div>
  );

  // ── Stat card renderer ───────────────────────────────────────────────────────

  const StatCard = ({ label, value, icon, color, bg }) => (
    <div className="col-12 md:col-6 lg:col-3">
      <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${color}`, borderRadius: 0 }}>
        <div
          className="flex align-items-center justify-content-center border-round"
          style={{ width: 48, height: 48, background: bg }}
        >
          <i className={`pi ${icon}`} style={{ fontSize: '1.4rem', color }} />
        </div>
        <div>
          <div className="text-2xl font-bold">{loading ? '…' : (value ?? '-')}</div>
          <div className="text-color-secondary text-sm">{label}</div>
        </div>
      </div>
    </div>
  );

  const SectionLabel = ({ label }) => (
    <div className="mb-2 mt-3">
      <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: '0.07em' }}>
        {label}
      </span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <Toast ref={toast} />

      {/* Header */}
      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Dashboard Staff Gudang</h2>
          <p className="m-0 text-color-secondary text-sm">
            Pantau stok, mesin, pengadaan &amp; operasi secara real-time
          </p>
        </div>
        <Button icon="pi pi-refresh" label="Refresh" text onClick={fetchDashboard} loading={loading} />
      </div>

      {/* ── Stok Bahan Baku ── */}
      <SectionLabel label="Status Stok Bahan Baku" />
      <div className="grid mb-2">
        <StatCard label="Total Bahan Baku" value={data?.stok?.total}  icon="pi-box"                 color="#6366f1" bg="#eef2ff" />
        <StatCard label="Stok Aman"        value={data?.stok?.aman}   icon="pi-check-circle"         color="#22c55e" bg="#f0fdf4" />
        <StatCard label="Stok Kritis"      value={data?.stok?.kritis} icon="pi-exclamation-triangle" color="#f59e0b" bg="#fffbeb" />
        <StatCard label="Stok Habis"       value={data?.stok?.habis}  icon="pi-times-circle"         color="#ef4444" bg="#fef2f2" />
      </div>

      {/* ── Mesin ── */}
      <SectionLabel label="Status Mesin Produksi" />
      <div className="grid mb-2">
        <StatCard label="Total Mesin"  value={data?.mesinAgg?.total}       icon="pi-server"               color="#6366f1" bg="#eef2ff" />
        <StatCard label="Aktif"        value={data?.mesinAgg?.active}      icon="pi-check-circle"          color="#22c55e" bg="#f0fdf4" />
        <StatCard label="Maintenance"  value={data?.mesinAgg?.maintenance} icon="pi-wrench"                color="#f59e0b" bg="#fffbeb" />
        <StatCard label="Breakdown"    value={data?.mesinAgg?.breakdown}   icon="pi-exclamation-triangle"  color="#ef4444" bg="#fef2f2" />
      </div>

      {/* ── Pengadaan ── */}
      <SectionLabel label="Status Pengadaan" />
      <div className="grid mb-4">
        <StatCard label="Total Pengadaan" value={data?.pengadaan?.total}       icon="pi-list"         color="#6366f1" bg="#eef2ff" />
        <StatCard label="Pending"         value={data?.pengadaan?.pending}     icon="pi-clock"        color="#f59e0b" bg="#fffbeb" />
        <StatCard label="Diproses"        value={data?.pengadaan?.in_progress} icon="pi-cog"          color="#3b82f6" bg="#eff6ff" />
        <StatCard label="Selesai"         value={data?.pengadaan?.completed}   icon="pi-check-circle" color="#22c55e" bg="#f0fdf4" />
      </div>

      {/* ── Tabel bawah ── */}
      <div className="grid">

        {/* Stok Kritis & Habis */}
        <div className="col-12 lg:col-6">
          <div className="card h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-exclamation-triangle" style={{ color: '#f59e0b' }} />
              <span className="font-semibold">Stok Kritis &amp; Habis</span>
              {(data?.kritis?.length ?? 0) > 0 && (
                <Tag value={data.kritis.length} severity="warning" className="ml-auto" />
              )}
            </div>

            {loading ? (
              <div className="flex justify-content-center p-4">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }} />
              </div>
            ) : (data?.kritis?.length ?? 0) === 0 ? (
              <div className="flex flex-column align-items-center justify-content-center p-4 gap-2">
                <i className="pi pi-check-circle" style={{ fontSize: '2rem', color: '#22c55e' }} />
                <span className="text-color-secondary text-sm">Semua stok dalam kondisi aman</span>
              </div>
            ) : (
              <DataTable value={data?.kritis} size="small" stripedRows emptyMessage="Semua stok aman">
                <Column field="kode_bahan_baku" header="Kode"      style={{ width: '90px', fontWeight: 600 }} />
                <Column field="material_name"   header="Bahan Baku" />
                <Column
                  header="Stok"
                  body={(row) => {
                    const s = getStokStatus(row.current_stock, row.min_stock_level);
                    return <span style={{ color: s.color }} className="font-semibold">{row.current_stock} {row.nama_satuan}</span>;
                  }}
                />
                <Column
                  header="Progress"
                  body={(row) => {
                    const pct = Math.min(Math.round((row.current_stock / (row.min_stock_level * 2)) * 100), 100);
                    const s   = getStokStatus(row.current_stock, row.min_stock_level);
                    return <ProgressBar value={pct} showValue={false} style={{ height: '6px', minWidth: '80px' }} color={s.color} />;
                  }}
                />
                <Column
                  header="Status"
                  body={(row) => {
                    const s = getStokStatus(row.current_stock, row.min_stock_level);
                    return <Tag value={s.label} severity={s.severity} />;
                  }}
                />
              </DataTable>
            )}
          </div>
        </div>

        {/* Status Mesin */}
        <div className="col-12 lg:col-6">
          <div className="card h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-server" style={{ color: '#6366f1' }} />
              <span className="font-semibold">Status Mesin Produksi</span>
            </div>
            <DataTable value={data?.mesinList} loading={loading} size="small" stripedRows emptyMessage="Belum ada data mesin">
              <Column field="machine_id"           header="ID"     style={{ width: '80px', fontWeight: 600 }} />
              <Column field="machine_name"          header="Mesin" />
              <Column
                field="machine_availability"
                header="Avail."
                style={{ width: '80px' }}
                body={(row) => `${row.machine_availability}%`}
              />
              <Column
                field="status"
                header="Status"
                body={(row) => {
                  const s = getMesinStatus(row.status);
                  return <Tag value={s.label} severity={s.severity} />;
                }}
              />
            </DataTable>
          </div>
        </div>

        {/* Riwayat Pengadaan */}
        <div className="col-12 lg:col-6">
          <div className="card h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-history" style={{ color: '#6366f1' }} />
              <span className="font-semibold">Riwayat Pengadaan Terbaru</span>
            </div>
            <DataTable value={data?.riwayat} loading={loading} size="small" stripedRows emptyMessage="Belum ada riwayat pengadaan">
              <Column field="material_name" header="Bahan Baku" />
              <Column field="required_qty"  header="Qty" body={(row) => `${row.required_qty} ${row.nama_satuan}`} />
              <Column
                field="is_auto"
                header="Tipe"
                body={(row) => <Tag value={row.is_auto ? 'Otomatis' : 'Manual'} severity={row.is_auto ? 'info' : 'secondary'} />}
              />
              <Column
                field="status"
                header="Status"
                body={(row) => {
                  const s = getPengadaanStatus(row.status);
                  return <Tag value={s.label} severity={s.severity} />;
                }}
              />
              <Column
                field="created_at"
                header="Tanggal"
                body={(row) => <span className="text-sm text-color-secondary">{formatDate(row.created_at)}</span>}
              />
            </DataTable>
          </div>
        </div>

        {/* Operation Types */}
        <div className="col-12 lg:col-6">
          <div className="card h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-sliders-h" style={{ color: '#22c55e' }} />
              <span className="font-semibold">Operation Types</span>
            </div>
            <DataTable value={data?.opTypes} loading={loading} size="small" stripedRows emptyMessage="Belum ada operation type">
              <Column field="kode_operasi" header="Kode"    style={{ width: '70px', fontWeight: 600 }} />
              <Column field="nama_operasi" header="Operasi" />
              <Column
                field="is_active"
                header="Status"
                style={{ width: '90px' }}
                body={(row) => <Tag value={row.is_active ? 'Aktif' : 'Nonaktif'} severity={row.is_active ? 'success' : 'secondary'} />}
              />
            </DataTable>
          </div>
        </div>

      </div>
    </div>
  );
}
