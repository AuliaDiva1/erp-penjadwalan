'use client';
import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import FormRevisi from './components/FormRevisi';
import DetailJadwal from './components/DetailJadwal';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const statusConfig = {
  draft:   { label: 'Draft',   severity: 'secondary' },
  final:   { label: 'Final',   severity: 'success'   },
  revised: { label: 'Revised', severity: 'warning'   },
};

export default function JadwalPage() {
  const toast = useRef(null);
  const [jadwal, setJadwal]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [revisiVisible, setRevisiVisible] = useState(false);
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

  const handleValidate = (row) => {
    confirmDialog({
      message: `Yakin ingin memfinalisasi jadwal ${row.schedule_code}? Status akan berubah menjadi Final dan tidak bisa diubah kecuali direvisi.`,
      header: 'Konfirmasi Validasi',
      icon: 'pi pi-check-circle',
      acceptClassName: 'p-button-success',
      acceptLabel: 'Ya, Finalisasi',
      rejectLabel: 'Batal',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/schedules/${row.id}/validate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Jadwal berhasil difinalisasi' });
          fetchJadwal();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const handleRevisi = async (payload) => {
    const res  = await fetch(`${BASE_URL}/schedules/${selectedData.id}/revise`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Jadwal diajukan untuk revisi' });
      setRevisiVisible(false);
      fetchJadwal();
    } else {
      toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
    }
  };

  const handleDelete = (row) => {
    confirmDialog({
      message: `Yakin ingin menghapus jadwal ${row.schedule_code}?`,
      header: 'Konfirmasi Hapus',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Ya, Hapus',
      rejectLabel: 'Batal',
      accept: async () => {
        const res  = await fetch(`${BASE_URL}/schedules/${row.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          toast.current.show({ severity: 'success', summary: 'Berhasil', detail: data.message });
          fetchJadwal();
        } else {
          toast.current.show({ severity: 'error', summary: 'Gagal', detail: data.message });
        }
      },
    });
  };

  const statusTemplate = (row) => {
    const s = statusConfig[row.status_jadwal] || { label: row.status_jadwal, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} />;
  };

  const finalTemplate = (row) => (
    <Tag
      value={row.is_final ? 'Final' : 'Belum'}
      severity={row.is_final ? 'success' : 'secondary'}
      icon={row.is_final ? 'pi pi-check' : 'pi pi-minus'}
    />
  );

  const makespanTemplate = (row) => (
    <span className="font-semibold">
      {row.makespan} <span className="text-color-secondary font-normal text-sm">menit</span>
    </span>
  );

  const dateTemplate = (row) => (
    <span className="text-sm">
      {new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  );

  const actionTemplate = (row) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-eye"
        rounded text severity="info"
        tooltip="Detail"
        onClick={() => { setSelectedData(row); setDetailVisible(true); }}
      />
      <Button
        icon="pi pi-check-circle"
        rounded text severity="success"
        tooltip="Finalisasi"
        disabled={row.is_final}
        onClick={() => handleValidate(row)}
      />
      <Button
        icon="pi pi-refresh"
        rounded text severity="warning"
        tooltip="Ajukan Revisi"
        disabled={!row.is_final}
        onClick={() => { setSelectedData(row); setRevisiVisible(true); }}
      />
      <Button
        icon="pi pi-trash"
        rounded text severity="danger"
        tooltip="Hapus"
        onClick={() => handleDelete(row)}
      />
    </div>
  );

  const header = (
    <div className="flex justify-content-between align-items-center">
      <span className="text-sm text-color-secondary">Total {jadwal.length} jadwal ditemukan</span>
      <div className="flex align-items-center gap-2">
        <Button icon="pi pi-refresh" text onClick={fetchJadwal} tooltip="Refresh" loading={loading} />
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
      <ConfirmDialog />

      <div className="mb-4">
        <h2 className="m-0 mb-1">Jadwal Produksi</h2>
        <p className="m-0 text-color-secondary text-sm">
          Kelola dan pantau jadwal produksi hasil optimasi CCEA
        </p>
      </div>

      <div className="grid mb-4">
        {[
          { label: 'Total Jadwal', value: stats.total,   icon: 'pi-calendar',     color: '#6366f1', bg: '#eef2ff' },
          { label: 'Draft',        value: stats.draft,   icon: 'pi-file',          color: '#64748b', bg: '#f1f5f9' },
          { label: 'Final',        value: stats.final,   icon: 'pi-check-circle',  color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Revised',      value: stats.revised, icon: 'pi-refresh',       color: '#f59e0b', bg: '#fffbeb' },
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
          <Column field="schedule_code"     header="Kode Jadwal"     sortable style={{ fontWeight: 600 }} />
          <Column field="makespan"          header="Makespan"         body={makespanTemplate} sortable />
          <Column field="total_jobs"        header="Total Jobs"       sortable />
          <Column field="total_machines"    header="Total Mesin"      sortable />
          <Column field="status_jadwal"     header="Status"           body={statusTemplate} sortable />
          <Column field="is_final"          header="Final"            body={finalTemplate} />
          <Column field="revision_count"    header="Revisi"           sortable />
          <Column field="validated_by_name" header="Divalidasi Oleh"  body={(r) => r.validated_by_name || '-'} />
          <Column field="created_at"        header="Dibuat"           body={dateTemplate} sortable />
          <Column header="Aksi"             body={actionTemplate}     style={{ width: '160px' }} />
        </DataTable>
      </div>

      <FormRevisi
        visible={revisiVisible}
        onHide={() => setRevisiVisible(false)}
        onSave={handleRevisi}
        selectedData={selectedData}
      />
      <DetailJadwal
        visible={detailVisible}
        onHide={() => setDetailVisible(false)}
        data={selectedData}
      />
    </div>
  );
}