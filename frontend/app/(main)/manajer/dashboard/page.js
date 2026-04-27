'use client';
import { useState, useEffect, useRef } from 'react';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressBar } from 'primereact/progressbar';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100/api';

const STATUS_SEVERITY = {
  Pending:       'warning',
  Scheduled:     'info',
  'In Progress': 'info',
  Completed:     'success',
  Delayed:       'danger',
  Failed:        'danger',
};

export default function DashboardManajer() {
  const toast = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/dashboard/manajer`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const s = data?.job_stats;
  const completionRate = s ? Math.round((s.completed / (s.total || 1)) * 100) : 0;

  const statCards = s ? [
    { label: 'Total Job',   value: s.total,       icon: 'pi-briefcase',           bg: 'surface-100' },
    { label: 'Pending',     value: s.pending,     icon: 'pi-clock',               bg: 'yellow-50'   },
    { label: 'Scheduled',   value: s.scheduled,   icon: 'pi-calendar',            bg: 'purple-50'   },
    { label: 'In Progress', value: s.in_progress, icon: 'pi-spin pi-spinner',     bg: 'cyan-50'     },
    { label: 'Completed',   value: s.completed,   icon: 'pi-check-circle',        bg: 'green-50'    },
    { label: 'Delayed',     value: s.delayed,     icon: 'pi-exclamation-triangle',bg: 'red-50'      },
  ] : [];

  const statusTemplate = (row) => (
    <Tag value={row.job_status} severity={STATUS_SEVERITY[row.job_status] || 'info'} />
  );

  const timeTemplate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Dashboard Produksi</h2>
        <p className="m-0 text-color-secondary text-sm">
          Ringkasan performa dan progres realisasi jadwal produksi
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid mb-4">
        {statCards.map((card, i) => (
          <div className="col-6 md:col-4 lg:col-2" key={i}>
            <div className={`card p-3 bg-${card.bg}`}>
              <div className="flex align-items-center justify-content-between">
                <div>
                  <p className="m-0 text-sm text-color-secondary">{card.label}</p>
                  <h3 className="m-0 mt-1">{loading ? '-' : card.value}</h3>
                </div>
                <i className={`pi ${card.icon} text-2xl text-color-secondary`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Rate + Mesin */}
      <div className="grid mb-4">
        <div className="col-12 lg:col-8">
          <div className="card">
            <h5 className="mt-0 mb-3">Tingkat Penyelesaian Job</h5>
            <div className="flex align-items-center gap-3 mb-2">
              <ProgressBar value={completionRate} style={{ flex: 1, height: '22px' }} />
              <span className="font-bold text-xl">{completionRate}%</span>
            </div>
            <small className="text-color-secondary">
              {s?.completed || 0} dari {s?.total || 0} job telah selesai
            </small>
          </div>
        </div>

        <div className="col-12 lg:col-4">
          <div className="card h-full">
            <h5 className="mt-0 mb-3">Status Mesin</h5>
            {data?.machine_stats && (
              <div className="flex flex-column gap-2">
                <div className="flex justify-content-between">
                  <span className="text-green-600 font-medium">Aktif</span>
                  <span className="font-bold">{data.machine_stats.active}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-yellow-600 font-medium">Maintenance</span>
                  <span className="font-bold">{data.machine_stats.maintenance}</span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-red-600 font-medium">Tidak Aktif</span>
                  <span className="font-bold">{data.machine_stats.inactive}</span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-content-between">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">{data.machine_stats.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="grid">
        <div className="col-12 lg:col-6">
          <div className="card">
            <h5 className="mt-0 mb-3">
              <i className="pi pi-spin pi-spinner mr-2 text-cyan-500" />
              Progres Realisasi Jadwal
            </h5>
            <DataTable
              value={data?.in_progress_jobs || []}
              emptyMessage="Tidak ada job yang sedang berjalan"
              size="small"
              rows={5}
            >
              <Column field="job_id" header="Job ID" style={{ width: '90px' }} />
              <Column field="operation_type" header="Operasi" />
              <Column field="machine_name" header="Mesin" body={(r) => r.machine_name || '-'} />
              <Column header="Jadwal Mulai" body={(r) => timeTemplate(r.scheduled_start)} />
              <Column header="Status" body={statusTemplate} />
            </DataTable>
          </div>
        </div>

        <div className="col-12 lg:col-6">
          <div className="card">
            <h5 className="mt-0 mb-3">
              <i className="pi pi-history mr-2 text-blue-500" />
              Job Terbaru
            </h5>
            <DataTable
              value={data?.recent_jobs || []}
              emptyMessage="Belum ada data job"
              size="small"
              rows={5}
            >
              <Column field="job_id" header="Job ID" style={{ width: '90px' }} />
              <Column field="operation_type" header="Operasi" />
              <Column field="machine_name" header="Mesin" body={(r) => r.machine_name || '-'} />
              <Column header="Diperbarui" body={(r) => timeTemplate(r.updated_at)} />
              <Column header="Status" body={statusTemplate} />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
}