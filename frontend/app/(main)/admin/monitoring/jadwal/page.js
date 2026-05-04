'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MonitoringJadwalPage() {
  const toast = useRef(null);
  const [jadwal, setJadwal]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [globalFilter, setGlobalFilter]   = useState('');
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
    total:   jadwal.length,
    draft:   jadwal.filter(j => j.status_jadwal === 'draft').length,
    final:   jadwal.filter(j => j.status_jadwal === 'final').length,
    revised: jadwal.filter(j => j.status_jadwal === 'revised').length,
  };

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const statusConfig = {
    draft:   { label: 'Draft',   severity: 'secondary' },
    final:   { label: 'Final',   severity: 'success'   },
    revised: { label: 'Revised', severity: 'warning'   },
  };

  const statusTemplate = (row) => {
    const s = statusConfig[row.status_jadwal] || { label: row.status_jadwal, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} />;
  };

  const finalTemplate = (row) => (
    <Tag
      value={row.is_final ? 'Final' : 'Draft'}
      severity={row.is_final ? 'success' : 'secondary'}
    />
  );

  const makespanTemplate = (row) => (
    <span className="font-semibold">
      {row.makespan} <span className="text-color-secondary text-sm font-normal">menit</span>
    </span>
  );

  const dateTemplate = (row) => (
    <span className="text-sm">
      {new Date(row.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
      })}
    </span>
  );

  const actionTemplate = (row) => (
    <Button
      icon="pi pi-eye"
      rounded text severity="info"
      tooltip="Lihat Detail"
      onClick={() => { setSelectedData(row); setDetailVisible(true); }}
    />
  );

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {jadwal.length} jadwal</span>
      <div className="flex align-items-center gap-2">
        <Button icon="pi pi-refresh" text onClick={fetchJadwal} loading={loading} tooltip="Refresh" />
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
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Monitoring Status Jadwal</h2>
        <p className="m-0 text-color-secondary text-sm">
          Pantau seluruh jadwal produksi yang dibuat oleh Manajer Produksi
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Jadwal', value: stats.total,   icon: 'pi-calendar',    color: '#6366f1', bg: '#eef2ff' },
          { label: 'Draft',        value: stats.draft,   icon: 'pi-file',         color: '#64748b', bg: '#f1f5f9' },
          { label: 'Final',        value: stats.final,   icon: 'pi-check-circle', color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Revised',      value: stats.revised, icon: 'pi-refresh',      color: '#f59e0b', bg: '#fffbeb' },
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
          <Column field="makespan"          header="Makespan"        body={makespanTemplate} sortable />
          <Column field="total_jobs"        header="Total Jobs"      sortable />
          <Column field="total_machines"    header="Total Mesin"     sortable />
          <Column field="status_jadwal"     header="Status"          body={statusTemplate} sortable />
          <Column field="is_final"          header="Final"           body={finalTemplate} />
          <Column field="revision_count"    header="Revisi ke-"      sortable />
          <Column field="validated_by_name" header="Divalidasi Oleh" body={(r) => r.validated_by_name || <span className="text-color-secondary">-</span>} />
          <Column field="created_at"        header="Dibuat"          body={dateTemplate} sortable />
          <Column header="Aksi"             body={actionTemplate}    style={{ width: '80px' }} />
        </DataTable>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog
        header={`Detail Jadwal — ${selectedData?.schedule_code}`}
        visible={detailVisible}
        style={{ width: '500px' }}
        modal
        onHide={() => setDetailVisible(false)}
        draggable={false}
        dismissableMask
      >
        {selectedData && (
          <div className="p-1">
            <div className="flex justify-content-between align-items-center p-3 border-round mb-4"
              style={{ background: 'var(--surface-ground)' }}>
              <div>
                <div className="text-2xl font-bold">{selectedData.schedule_code}</div>
                <div className="text-color-secondary text-sm mt-1">Jadwal Produksi</div>
              </div>
              <Tag
                value={statusConfig[selectedData.status_jadwal]?.label || selectedData.status_jadwal}
                severity={statusConfig[selectedData.status_jadwal]?.severity || 'info'}
              />
            </div>

            {[
              { label: 'Makespan',         value: `${selectedData.makespan} menit` },
              { label: 'Total Jobs',        value: selectedData.total_jobs },
              { label: 'Total Mesin',       value: selectedData.total_machines },
              { label: 'Status Final',      value: selectedData.is_final ? 'Sudah Final' : 'Belum Final' },
              { label: 'Revisi ke-',        value: selectedData.revision_count || 0 },
              { label: 'Divalidasi Oleh',   value: selectedData.validated_by_name || '-' },
              { label: 'Waktu Validasi',    value: formatDate(selectedData.validated_at) },
              { label: 'Dibuat',            value: formatDate(selectedData.created_at) },
              { label: 'Diperbarui',        value: formatDate(selectedData.updated_at) },
            ].map((item, i) => (
              <div key={i} className="flex justify-content-between align-items-center py-2"
                style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <span className="text-color-secondary text-sm">{item.label}</span>
                <span className="font-semibold text-sm">{item.value ?? '-'}</span>
              </div>
            ))}

            {selectedData.revision_note && (
              <div className="mt-3 p-3 border-round" style={{ background: '#fff8e1', border: '1px solid #ffe082' }}>
                <div className="text-xs font-semibold text-color-secondary mb-1 uppercase">Catatan Revisi</div>
                <div className="text-sm">{selectedData.revision_note}</div>
              </div>
            )}

            <div className="flex justify-content-end mt-4">
              <Button label="Tutup" icon="pi pi-times" className="p-button-text" onClick={() => setDetailVisible(false)} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}