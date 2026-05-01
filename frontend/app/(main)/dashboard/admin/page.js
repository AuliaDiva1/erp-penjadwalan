'use client';
import { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminDashboard() {
  const toast = useRef(null);
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUser: 0,
    totalMesin: 0,
    totalMaterial: 0,
    stokKritis: 0,
    jadwalBerjalan: 0,
    logHariIni: 0,
  });
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/admin/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      // stats tetap default jika API belum ada
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    {
      label: 'Total Pengguna',
      value: stats.totalUser,
      icon: 'pi pi-users',
      color: '#4f46e5',
      bg: '#eef2ff',
      route: '/dashboard/admin/pengguna',
    },
    {
      label: 'Total Mesin',
      value: stats.totalMesin,
      icon: 'pi pi-server',
      color: '#0891b2',
      bg: '#e0f2fe',
      route: '/dashboard/admin/mesin',
    },
    {
      label: 'Total Bahan Baku',
      value: stats.totalMaterial,
      icon: 'pi pi-box',
      color: '#059669',
      bg: '#d1fae5',
      route: '/dashboard/admin/material',
    },
    {
      label: 'Stok Kritis',
      value: stats.stokKritis,
      icon: 'pi pi-exclamation-triangle',
      color: '#dc2626',
      bg: '#fee2e2',
      route: '/dashboard/admin/monitoring/stok',
    },
    {
      label: 'Jadwal Berjalan',
      value: stats.jadwalBerjalan,
      icon: 'pi pi-calendar',
      color: '#d97706',
      bg: '#fef3c7',
      route: '/dashboard/admin/monitoring/jadwal',
    },
    {
      label: 'Log Hari Ini',
      value: stats.logHariIni,
      icon: 'pi pi-list',
      color: '#7c3aed',
      bg: '#f5f3ff',
      route: '/dashboard/admin/monitoring/log',
    },
  ];

  const menuShortcuts = [
    {
      label: 'Kelola Pengguna',
      icon: 'pi pi-users',
      desc: 'Tambah, edit, dan kelola akun pengguna sistem',
      route: '/dashboard/admin/pengguna',
      severity: 'info',
    },
    {
      label: 'Kelola Mesin',
      icon: 'pi pi-server',
      desc: 'Manajemen data mesin produksi',
      route: '/dashboard/admin/mesin',
      severity: 'info',
    },
    {
      label: 'Kelola Bahan Baku',
      icon: 'pi pi-box',
      desc: 'Manajemen data material dan batas minimum stok',
      route: '/dashboard/admin/material',
      severity: 'info',
    },
    {
      label: 'Konfigurasi Fuzzy',
      icon: 'pi pi-sliders-h',
      desc: 'Atur 27 rules dan bobot Operation Type',
      route: '/dashboard/admin/konfigurasi/fuzzy/parameter',
      severity: 'warning',
    },
    {
      label: 'Konfigurasi CCEA',
      icon: 'pi pi-chart-line',
      desc: 'Atur populasi, iterasi, dan dekomposisi',
      route: '/dashboard/admin/konfigurasi/ccea',
      severity: 'warning',
    },
    {
      label: 'Model Prediksi RF',
      icon: 'pi pi-cog',
      desc: 'Training ulang model Random Forest',
      route: '/dashboard/admin/konfigurasi/model',
      severity: 'warning',
    },
  ];

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="m-0 mb-1">Dashboard Admin</h2>
          <p className="m-0 text-color-secondary text-sm">
            Selamat datang di panel admin ERP Penjadwalan Produksi
          </p>
        </div>
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          outlined
          size="small"
          onClick={fetchStats}
          loading={loading}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid mb-4">
        {statCards.map((s, i) => (
          <div key={i} className="col-12 sm:col-6 lg:col-4 xl:col-2">
            <div
              className="card cursor-pointer hover:shadow-4 transition-all transition-duration-200"
              onClick={() => router.push(s.route)}
              style={{ borderLeft: `4px solid ${s.color}` }}
            >
              <div className="flex align-items-center justify-content-between">
                <div>
                  <p className="text-sm text-color-secondary m-0 mb-1">{s.label}</p>
                  <p className="text-3xl font-bold m-0" style={{ color: s.color }}>
                    {loading ? '...' : s.value}
                  </p>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: s.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className={s.icon} style={{ fontSize: '1.4rem', color: s.color }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Menu Shortcuts */}
      <div className="card">
        <h4 className="mt-0 mb-3">Akses Cepat</h4>
        <div className="grid">
          {menuShortcuts.map((m, i) => (
            <div key={i} className="col-12 md:col-6 lg:col-4">
              <div
                className="flex align-items-start gap-3 p-3 border-round cursor-pointer hover:surface-100 transition-all transition-duration-150"
                style={{ border: '1px solid var(--surface-200)' }}
                onClick={() => router.push(m.route)}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: m.severity === 'warning' ? '#fef3c7' : '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i
                    className={`pi ${m.icon}`}
                    style={{
                      fontSize: '1.1rem',
                      color: m.severity === 'warning' ? '#d97706' : '#0891b2',
                    }}
                  />
                </div>
                <div>
                  <p className="font-semibold m-0 mb-1">{m.label}</p>
                  <p className="text-sm text-color-secondary m-0">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info System */}
      <div className="card">
        <h4 className="mt-0 mb-3">Informasi Sistem</h4>
        <div className="grid">
          <div className="col-12 md:col-4">
            <p className="text-sm text-color-secondary m-0 mb-1">Nama Sistem</p>
            <p className="font-semibold m-0">ERP Penjadwalan Produksi</p>
          </div>
          <div className="col-12 md:col-4">
            <p className="text-sm text-color-secondary m-0 mb-1">Algoritma</p>
            <p className="font-semibold m-0">Fuzzy Mamdani + CCEA + Random Forest</p>
          </div>
          <div className="col-12 md:col-4">
            <p className="text-sm text-color-secondary m-0 mb-1">Status API</p>
            <Tag value="Online" severity="success" icon="pi pi-check-circle" />
          </div>
        </div>
      </div>
    </div>
  );
}