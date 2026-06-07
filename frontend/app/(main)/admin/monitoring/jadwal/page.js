// MonitoringJadwalPage.jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import DetailJadwal from './components/DetailJadwal';
import RevisiDialog from './components/RevisiDialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

export default function MonitoringJadwalPage() {
  const toast                             = useRef(null);
  const [jadwal, setJadwal]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [globalFilter, setGlobalFilter]   = useState('');
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
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat data jadwal' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJadwal(); }, []);

  const handleValidasi = (row) => {
    confirmDialog({
      message: `Jadwal ${row.schedule_code} akan dijadikan Final. Lanjutkan?`,
      header:  'Konfirmasi Validasi',
      icon:    'pi pi-check-circle',
      accept:  async () => {
        setActionLoading(true);
        try {
          const res  = await fetch(`${BASE_URL}/schedules/${row.id}/validate`, {
            method: 'POST',
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
        method:  'POST',
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
      icon:            'pi pi-trash',
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

  const stats = {
    total:   jadwal.length,
    draft:   jadwal.filter(j => j.status_jadwal === 'draft').length,
    final:   jadwal.filter(j => j.status_jadwal === 'final').length,
    revised: jadwal.filter(j => j.status_jadwal === 'revised').length,
  };

  const statusTemplate  = (row) => {
    const s = STATUS_CONFIG[row.status_jadwal] || { label: row.status_jadwal, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} />;
  };

  const actionTemplate = (row) => (
    <div className="flex gap-1">
      <Button icon="pi pi-eye" rounded text severity="info" tooltip="Detail"
        onClick={() => { setSelected(row); setDetailVisible(true); }} />
      {!row.is_final && (
        <Button icon="pi pi-check" rounded text severity="success" tooltip="Validasi"
          onClick={() => handleValidasi(row)} loading={actionLoading} />
      )}
      {row.is_final && (
        <Button icon="pi pi-replay" rounded text severity="warning" tooltip="Ajukan Revisi"
          onClick={() => { setSelected(row); setRevisiNote(''); setRevisiVisible(true); }} />
      )}
      {!row.is_final && (
        <Button icon="pi pi-trash" rounded text severity="danger" tooltip="Hapus"
          onClick={() => handleHapus(row)} loading={actionLoading} />
      )}
    </div>
  );

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {jadwal.length} jadwal</span>
      <div className="flex gap-2 align-items-center">
        <Button icon="pi pi-refresh" text onClick={fetchJadwal} loading={loading} tooltip="Refresh" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Cari jadwal..."
          style={{ width: '220px' }}
        />
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
          { label: 'Total Jadwal', value: stats.total,   icon: 'pi-calendar',     color: '#6366f1' },
          { label: 'Draft',        value: stats.draft,   icon: 'pi-file',         color: '#64748b' },
          { label: 'Final',        value: stats.final,   icon: 'pi-check-circle', color: '#22c55e' },
          { label: 'Revised',      value: stats.revised, icon: 'pi-refresh',      color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="col-12 md:col-6 lg:col-3">
            <div className="card p-4 flex align-items-center gap-3"
              style={{ borderLeft: `4px solid ${s.color}` }}>
              <i className={`pi ${s.icon} text-3xl`} style={{ color: s.color }} />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-color-secondary text-sm">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <DataTable
          value={jadwal} loading={loading}
          paginator rows={10} rowsPerPageOptions={[5, 10, 25]}
          stripedRows globalFilter={globalFilter} header={header}
          emptyMessage="Belum ada data jadwal"
          sortField="id" sortOrder={-1}
        >
          <Column field="schedule_code"     header="Kode"      sortable style={{ fontWeight: 600, width: '120px' }} />
          <Column field="makespan"          header="Makespan"   body={(r) => `${r.makespan} menit`} sortable />
          <Column field="total_jobs"        header="Jobs"       sortable style={{ width: '70px' }} />
          <Column field="total_machines"    header="Mesin"      sortable style={{ width: '70px' }} />
          <Column field="status_jadwal"     header="Status"     body={statusTemplate} sortable />
          <Column field="revision_count"    header="Revisi"     sortable style={{ width: '70px' }} />
          <Column field="validated_by_name" header="Divalidasi" body={(r) => r.validated_by_name || '-'} />
          <Column field="created_at"        header="Dibuat"
            body={(r) => new Date(r.created_at).toLocaleDateString('id-ID')} sortable />
          <Column header="Aksi"             body={actionTemplate} style={{ width: '130px' }} />
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