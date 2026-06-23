// MonitoringJadwalPage.jsx
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import DetailJadwal from './components/DetailJadwal';
import RevisiDialog from './components/RevisiDialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

const STATUS_FILTER_OPTIONS = [
  { label: 'Semua Status', value: null },
  { label: 'Draft',        value: 'draft' },
  { label: 'Final',        value: 'final' },
  { label: 'Revised',      value: 'revised' },
];

export default function MonitoringJadwalPage() {
  const toast                             = useRef(null);
  const [jadwal, setJadwal]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [globalFilter, setGlobalFilter]   = useState('');
  const [statusFilter, setStatusFilter]   = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [revisiVisible, setRevisiVisible] = useState(false);
  const [selected, setSelected]           = useState(null);
  const [revisiNote, setRevisiNote]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setJadwal(json.data);
      else toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message || 'Gagal memuat data jadwal' });
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data jadwal' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJadwal(); }, []);

  const handleValidasi = (row) => {
    confirmDialog({
      message:     `Jadwal ${row.schedule_code} akan dijadikan Final. Lanjutkan?`,
      header:      'Konfirmasi Validasi',
      icon:        'pi pi-check-circle',
      acceptLabel: 'Ya, Validasi',
      rejectLabel: 'Batal',
      accept: async () => {
        setActionLoading(true);
        try {
          const res  = await fetch(`${BASE_URL}/schedules/${row.id}/validate`, {
            method:  'PATCH', // ✅ sesuai route backend (router.patch)
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const json = await res.json();
          if (json.success) {
            toast.current.show({ severity: 'success', summary: 'Berhasil', detail: `${row.schedule_code} divalidasi` });
            fetchJadwal();
            setDetailVisible(false);
          } else {
            toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
          }
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memvalidasi jadwal' });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRevisiSubmit = async () => {
    if (!revisiNote.trim()) {
      toast.current.show({ severity: 'warn', summary: 'Perhatian', detail: 'Catatan revisi wajib diisi' });
      return;
    }
    setActionLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/schedules/${selected.id}/revise`, {
        method:  'PATCH', // ✅ sesuai route backend (router.patch)
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ revision_note: revisiNote }),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Jadwal diajukan untuk revisi' });
        setRevisiVisible(false);
        setRevisiNote('');
        setDetailVisible(false);
        fetchJadwal();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal mengajukan revisi' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHapus = (row) => {
    confirmDialog({
      message:         `Jadwal ${row.schedule_code} akan dihapus permanen. Lanjutkan?`,
      header:          'Konfirmasi Hapus',
      icon:            'pi pi-exclamation-triangle',
      acceptLabel:     'Ya, Hapus',
      rejectLabel:     'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setActionLoading(true);
        try {
          const res  = await fetch(`${BASE_URL}/schedules/${row.id}`, {
            method:  'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const json = await res.json();
          if (json.success) {
            toast.current.show({ severity: 'success', summary: 'Berhasil', detail: `${row.schedule_code} dihapus` });
            fetchJadwal();
          } else {
            toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
          }
        } catch {
          toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menghapus jadwal' });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filteredJadwal = useMemo(() => {
    if (!statusFilter) return jadwal;
    return jadwal.filter((j) => j.status_jadwal === statusFilter);
  }, [jadwal, statusFilter]);

  const stats = {
    total:   jadwal.length,
    draft:   jadwal.filter(j => j.status_jadwal === 'draft').length,
    final:   jadwal.filter(j => j.status_jadwal === 'final').length,
    revised: jadwal.filter(j => j.status_jadwal === 'revised').length,
  };

  const statusTemplate = (row) => {
    const s = STATUS_CONFIG[row.status_jadwal] || { label: row.status_jadwal, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} style={{ minWidth: 64, justifyContent: 'center' }} />;
  };

  const kodeTemplate = (row) => (
    <div className="flex align-items-center gap-2">
      <span className="font-semibold text-900">{row.schedule_code}</span>
      {row.revision_count > 0 && (
        <span className="text-xs text-color-secondary">(rev. {row.revision_count})</span>
      )}
    </div>
  );

  const validatedTemplate = (row) =>
    row.validated_by_name
      ? <span className="text-sm">{row.validated_by_name}</span>
      : <span className="text-sm text-color-secondary">—</span>;

  const actionTemplate = (row) => (
    <div className="flex gap-1 justify-content-center">
      <Button icon="pi pi-eye" rounded text severity="info" tooltip="Lihat Detail" tooltipOptions={{ position: 'top' }}
        onClick={() => { setSelected(row); setDetailVisible(true); }} />
      {!row.is_final && (
        <Button icon="pi pi-check" rounded text severity="success" tooltip="Validasi" tooltipOptions={{ position: 'top' }}
          onClick={() => handleValidasi(row)} loading={actionLoading} />
      )}
      {row.is_final && (
        <Button icon="pi pi-replay" rounded text severity="warning" tooltip="Ajukan Revisi" tooltipOptions={{ position: 'top' }}
          onClick={() => { setSelected(row); setRevisiNote(''); setRevisiVisible(true); }} />
      )}
      {!row.is_final && (
        <Button icon="pi pi-trash" rounded text severity="danger" tooltip="Hapus" tooltipOptions={{ position: 'top' }}
          onClick={() => handleHapus(row)} loading={actionLoading} />
      )}
    </div>
  );

  const header = (
    <div className="flex flex-wrap justify-content-between align-items-center gap-3">
      <span className="text-sm text-color-secondary">
        Menampilkan {filteredJadwal.length} dari {jadwal.length} jadwal
      </span>
      <div className="flex flex-wrap gap-2 align-items-center">
        <Dropdown
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(e) => setStatusFilter(e.value)}
          placeholder="Filter Status"
          style={{ width: '160px' }}
        />
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cari kode jadwal..."
            style={{ width: '220px' }}
          />
        </span>
        <Button icon="pi pi-refresh" outlined onClick={fetchJadwal} loading={loading} tooltip="Refresh" />
      </div>
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Monitoring Jadwal Produksi</h2>
        <p className="m-0 text-color-secondary text-sm">
          Kelola dan pantau seluruh jadwal produksi — validasi, revisi, dan hapus jadwal
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Jadwal', value: stats.total,   icon: 'pi-calendar',     color: '#6366f1', bg: '#eef2ff' },
          { label: 'Draft',        value: stats.draft,   icon: 'pi-file',         color: '#64748b', bg: '#f1f5f9' },
          { label: 'Final',        value: stats.final,   icon: 'pi-check-circle', color: '#22c55e', bg: '#ecfdf5' },
          { label: 'Revised',      value: stats.revised, icon: 'pi-refresh',      color: '#f59e0b', bg: '#fffbeb' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-3 flex align-items-center gap-3 shadow-1 border-round-xl"
              style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="flex align-items-center justify-content-center border-round-lg"
                style={{ width: 46, height: 46, background: s.bg }}>
                <i className={`pi ${s.icon} text-xl`} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold line-height-1">{s.value}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-1 border-round-xl">
        <DataTable
          value={filteredJadwal} loading={loading}
          paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows globalFilter={globalFilter} header={header}
          emptyMessage="Belum ada data jadwal yang cocok"
          sortField="id" sortOrder={-1}
          responsiveLayout="scroll"
          className="p-datatable-sm"
        >
          <Column field="schedule_code"     header="Kode"       body={kodeTemplate} sortable style={{ minWidth: 140 }} />
          <Column field="makespan"          header="Makespan"   body={(r) => `${r.makespan} menit`} sortable style={{ width: 110 }} />
          <Column field="total_jobs"        header="Jobs"       sortable style={{ width: 70, textAlign: 'center' }} />
          <Column field="total_machines"    header="Mesin"      sortable style={{ width: 70, textAlign: 'center' }} />
          <Column field="status_jadwal"     header="Status"     body={statusTemplate} sortable style={{ width: 110 }} />
          <Column field="validated_by_name" header="Divalidasi" body={validatedTemplate} style={{ minWidth: 130 }} />
          <Column field="created_at"        header="Dibuat"
            body={(r) => new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            sortable style={{ width: 120 }} />
          <Column header="Aksi"             body={actionTemplate} style={{ width: 140 }} />
        </DataTable>
      </div>

      <DetailJadwal
        visible={detailVisible}
        onHide={() => setDetailVisible(false)}
        data={selected}
        onValidasi={() => handleValidasi(selected)}
        onRevisi={() => { setRevisiNote(''); setRevisiVisible(true); }}
        actionLoading={actionLoading}
      />

      <RevisiDialog
        visible={revisiVisible}
        onHide={() => setRevisiVisible(false)}
        scheduleCode={selected?.schedule_code}
        revisiNote={revisiNote}
        setRevisiNote={setRevisiNote}
        onSubmit={handleRevisiSubmit}
        actionLoading={actionLoading}
      />
    </div>
  );
}