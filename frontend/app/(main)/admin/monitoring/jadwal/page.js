'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressBar } from 'primereact/progressbar';
import DetailJadwal from './components/DetailJadwal';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const statusConfig = {
  on_track:  { label: 'On Track',  severity: 'success' },
  delayed:   { label: 'Terlambat', severity: 'danger'  },
  completed: { label: 'Selesai',   severity: 'info'    },
  pending:   { label: 'Menunggu',  severity: 'warning' },
};

export default function MonitoringJadwalPage() {
  const toast = useRef(null);
  const [jadwal, setJadwal]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedData, setSelectedData]   = useState(null);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setJadwal(data.data);
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data jadwal' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJadwal(); }, []);

  const stats = {
    total:     jadwal.length,
    on_track:  jadwal.filter(j => j.progress_status === 'on_track').length,
    delayed:   jadwal.filter(j => j.progress_status === 'delayed').length,
    completed: jadwal.filter(j => j.progress_status === 'completed').length,
  };

  // === TEMPLATES ===
  const statusTemplate = (row) => {
    const s = statusConfig[row.progress_status] || { label: row.progress_status, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} />;
  };

  const progressTemplate = (row) => {
    const pct   = row.progress_pct ?? 0;
    const color =
      row.progress_status === 'delayed'   ? '#ef4444' :
      row.progress_status === 'completed' ? '#6366f1' : '#22c55e';
    return (
      <div className="flex align-items-center gap-2" style={{ minWidth: 140 }}>
        <ProgressBar
          value={pct}
          showValue={false}
          style={{ height: '6px', flex: 1, background: 'var(--surface-border)' }}
          color={color}
        />
        <span className="text-sm font-medium" style={{ minWidth: 36 }}>{pct}%</span>
      </div>
    );
  };

  const makespanTemplate = (row) => (
    <span className="font-medium">
      {row.makespan} <span className="text-color-secondary text-sm font-normal">menit</span>
    </span>
  );

  const dateTemplate = (field) => (row) => {
    const val = row[field];
    if (!val) return <span className="text-color-secondary">-</span>;
    return (
      <span className="text-sm">
        {new Date(val).toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </span>
    );
  };

  const finalTemplate = (row) => (
    <Tag
      value={row.is_final ? 'Final' : 'Draft'}
      severity={row.is_final ? 'success' : 'secondary'}
    />
  );

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-eye"
      rounded
      text
      severity="info"
      tooltip="Lihat Detail"
      onClick={() => { setSelectedData(row); setDetailVisible(true); }}
    />
  );

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {jadwal.length} jadwal</span>
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Cari jadwal..."
          style={{ width: '220px' }}
        />
      </span>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      {/* HEADER */}
      <div className="mb-4">
        <h2 className="m-0 mb-1">Monitoring Status Jadwal</h2>
        <p className="m-0 text-color-secondary text-sm">
          Pantau realisasi jadwal produksi yang sedang berjalan secara real-time
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid mb-4">
        {[
          { label: 'Total Jadwal', value: stats.total,     icon: 'pi-calendar',            color: '#6366f1', bg: '#eef2ff' },
          { label: 'On Track',     value: stats.on_track,  icon: 'pi-check-circle',        color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Terlambat',    value: stats.delayed,   icon: 'pi-exclamation-triangle', color: '#ef4444', bg: '#fef2f2' },
          { label: 'Selesai',      value: stats.completed, icon: 'pi-flag',                color: '#6366f1', bg: '#eef2ff' },
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
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="card">
        <DataTable
          value={jadwal}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          stripedRows
          globalFilter={globalFilter}
          header={header}
          emptyMessage="Belum ada data jadwal produksi"
          sortField="id"
          sortOrder={-1}
        >
          <Column field="schedule_code"     header="Kode Jadwal"    sortable style={{ fontWeight: 600 }} />
          <Column field="makespan"          header="Makespan"       body={makespanTemplate} sortable />
          <Column field="total_jobs"        header="Total Jobs"     sortable />
          <Column field="total_machines"    header="Total Mesin"    sortable />
          <Column field="progress_pct"      header="Progress"       body={progressTemplate} sortable />
          <Column field="progress_status"   header="Status"         body={statusTemplate} sortable />
          <Column field="is_final"          header="Final"          body={finalTemplate} />
          <Column field="validated_by_name" header="Divalidasi Oleh"
            body={(r) => r.validated_by_name || <span className="text-color-secondary">-</span>}
          />
          <Column field="start_date" header="Mulai"   body={dateTemplate('start_date')} sortable />
          <Column field="end_date"   header="Selesai" body={dateTemplate('end_date')}   sortable />
          <Column header="Aksi" body={actionTemplate} style={{ width: '80px' }} />
        </DataTable>
      </div>

      {/* DIALOG DETAIL */}
      <DetailJadwal
        visible={detailVisible}
        onHide={() => setDetailVisible(false)}
        data={selectedData}
      />
    </div>
  );
}