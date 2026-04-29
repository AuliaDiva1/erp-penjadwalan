'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardGudangPage() {
  const toast = useRef(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/dashboard/gudang/dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);

        if (json.data?.stok?.habis > 0) {
          toast.current.show({
            severity: 'error',
            summary: `🚨 ${json.data.stok.habis} Bahan Baku Habis!`,
            detail: 'Ada bahan baku yang stoknya sudah habis, segera lakukan pengadaan!',
            life: 10000,
            sticky: true,
          });
        }

        if (json.data?.kritis?.length > 0) {
          toast.current.show({
            severity: 'warn',
            summary: `⚠ ${json.data.kritis.length} Stok Kritis!`,
            detail: json.data.kritis.map(k => k.material_name).join(', '),
            life: 8000,
            sticky: json.data.kritis.length >= 3,
          });
        }
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const getStokStatus = (current, min) => {
    if (current === 0)  return { label: 'Habis',  severity: 'danger',  color: '#ef4444' };
    if (current <= min) return { label: 'Kritis', severity: 'warning', color: '#f59e0b' };
    return                     { label: 'Aman',   severity: 'success', color: '#22c55e' };
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

  if (!data && !loading) return (
    <div className="flex align-items-center justify-content-center" style={{ height: '60vh' }}>
      <Button label="Muat Dashboard" icon="pi pi-refresh" onClick={fetchDashboard} />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Dashboard Gudang</h2>
          <p className="m-0 text-color-secondary text-sm">
            Pantau status stok dan pengadaan bahan baku secara real-time
          </p>
        </div>
        <Button icon="pi pi-refresh" label="Refresh" text onClick={fetchDashboard} loading={loading} />
      </div>

      <div className="mb-2">
        <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: '0.07em' }}>
          Status Stok Bahan Baku
        </span>
      </div>
      <div className="grid mb-4">
        {[
          { label: 'Total Bahan Baku', value: data?.stok?.total,  icon: 'pi-box',                  color: '#6366f1', bg: '#eef2ff' },
          { label: 'Stok Aman',        value: data?.stok?.aman,   icon: 'pi-check-circle',          color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Stok Kritis',      value: data?.stok?.kritis, icon: 'pi-exclamation-triangle',  color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Stok Habis',       value: data?.stok?.habis,  icon: 'pi-times-circle',          color: '#ef4444', bg: '#fef2f2' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: 48, height: 48, background: s.bg }}
              >
                <i className={`pi ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value ?? '-'}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <span className="text-xs font-semibold text-color-secondary uppercase" style={{ letterSpacing: '0.07em' }}>
          Status Pengadaan
        </span>
      </div>
      <div className="grid mb-4">
        {[
          { label: 'Total Pengadaan', value: data?.pengadaan?.total,      icon: 'pi-list',         color: '#6366f1', bg: '#eef2ff' },
          { label: 'Pending',         value: data?.pengadaan?.pending,     icon: 'pi-clock',        color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Diproses',        value: data?.pengadaan?.in_progress, icon: 'pi-cog',          color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Selesai',         value: data?.pengadaan?.completed,   icon: 'pi-check-circle', color: '#22c55e', bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-4 flex align-items-center gap-3" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div
                className="flex align-items-center justify-content-center border-round"
                style={{ width: 48, height: 48, background: s.bg }}
              >
                <i className={`pi ${s.icon}`} style={{ fontSize: '1.4rem', color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value ?? '-'}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid">

        <div className="col-12 lg:col-6">
          <div className="card h-full">
            <div className="flex align-items-center gap-2 mb-3">
              <i className="pi pi-exclamation-triangle" style={{ color: '#f59e0b' }} />
              <span className="font-semibold">Stok Kritis & Habis</span>
              {data?.kritis?.length > 0 && (
                <Tag value={data.kritis.length} severity="warning" className="ml-auto" />
              )}
            </div>

            {loading ? (
              <div className="flex justify-content-center p-4">
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }} />
              </div>
            ) : data?.kritis?.length === 0 ? (
              <div className="flex flex-column align-items-center justify-content-center p-4 gap-2">
                <i className="pi pi-check-circle" style={{ fontSize: '2rem', color: '#22c55e' }} />
                <span className="text-color-secondary text-sm">Semua stok dalam kondisi aman</span>
              </div>
            ) : (
              <DataTable value={data?.kritis} size="small" stripedRows emptyMessage="Semua stok aman">
                <Column field="kode_bahan_baku" header="Kode" style={{ width: '90px', fontWeight: 600 }} />
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

      </div>
    </div>
  );
}