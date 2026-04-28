'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100/api';

const getStokStatus = (current, min) => {
  if (current === 0)         return { label: 'Habis',  severity: 'danger',  color: '#ef4444' };
  if (current <= min)        return { label: 'Kritis', severity: 'warning', color: '#f59e0b' };
  return                            { label: 'Aman',   severity: 'success', color: '#22c55e' };
};

const SectionTitle = ({ label }) => (
  <div
    className="text-xs font-semibold text-color-secondary uppercase mb-2 mt-3"
    style={{ letterSpacing: '0.07em' }}
  >
    {label}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div
    className="flex justify-content-between align-items-center py-2"
    style={{ borderBottom: '1px solid var(--surface-border)' }}
  >
    <span className="text-color-secondary text-sm">{label}</span>
    <span className="text-sm font-medium">{value ?? '-'}</span>
  </div>
);

const DetailStok = ({ visible, onHide, data }) => {
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (!visible || !data) return;
    fetchRiwayat();
  }, [visible, data]);

  const fetchRiwayat = async () => {
    setLoadingRiwayat(true);
    try {
      const res = await fetch(`${BASE_URL}/procurements?material_id=${data.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setRiwayat(json.data);
    } catch {
      setRiwayat([]);
    } finally {
      setLoadingRiwayat(false);
    }
  };

  if (!data) return null;

  const status = getStokStatus(data.current_stock, data.min_stock_level);
  const pct = Math.min(Math.round((data.current_stock / (data.min_stock_level * 2)) * 100), 100);

  const formatDate = (val) =>
    val
      ? new Date(val).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '-';

  const statusPengadaanTemplate = (row) => {
    const map = {
      pending:     { label: 'Pending',     severity: 'warning' },
      in_progress: { label: 'Diproses',    severity: 'info'    },
      completed:   { label: 'Selesai',     severity: 'success' },
    };
    const s = map[row.status] || { label: row.status, severity: 'info' };
    return <Tag value={s.label} severity={s.severity} />;
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-box text-primary" />
          <span>Detail Stok Bahan Baku</span>
          <Tag value={status.label} severity={status.severity} className="ml-2" style={{ fontSize: '0.75rem' }} />
        </div>
      }
      visible={visible}
      style={{ width: '540px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="px-1">

        {/* HEADER CARD */}
        <div
          className="flex justify-content-between align-items-center p-3 border-round mb-3"
          style={{ background: 'var(--surface-ground)' }}
        >
          <div>
            <div className="text-xl font-semibold">{data.material_name}</div>
            <div className="text-color-secondary text-sm mt-1">{data.kode_bahan_baku}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: status.color }}>
              {data.current_stock}
            </div>
            <div className="text-color-secondary text-xs">{data.nama_satuan}</div>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mb-4">
          <div className="flex justify-content-between align-items-center mb-2">
            <span className="text-sm text-color-secondary">Level Stok</span>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
          <ProgressBar
            value={pct}
            showValue={false}
            style={{ height: '8px', borderRadius: '999px', background: 'var(--surface-border)' }}
            color={status.color}
          />
          <div className="flex justify-content-between mt-1">
            <small className="text-color-secondary">0</small>
            <small className="text-color-secondary">Min: {data.min_stock_level} {data.nama_satuan}</small>
          </div>
        </div>

        {/* INFO DASAR */}
        <SectionTitle label="Informasi Bahan Baku" />
        <InfoRow label="Kode"            value={data.kode_bahan_baku} />
        <InfoRow label="Nama"            value={data.material_name} />
        <InfoRow label="Satuan"          value={`${data.kode_satuan} - ${data.nama_satuan}`} />
        <InfoRow label="Stok Saat Ini"   value={`${data.current_stock} ${data.nama_satuan}`} />
        <InfoRow label="Batas Minimum"   value={`${data.min_stock_level} ${data.nama_satuan}`} />
        <InfoRow label="Selisih ke Min"  value={`${data.current_stock - data.min_stock_level} ${data.nama_satuan}`} />

        {/* RIWAYAT PENGADAAN */}
        <SectionTitle label="Riwayat Pengadaan Terakhir" />
        <DataTable
          value={riwayat}
          loading={loadingRiwayat}
          rows={5}
          paginator={riwayat.length > 5}
          emptyMessage="Belum ada riwayat pengadaan"
          size="small"
          stripedRows
        >
          <Column field="required_qty"   header="Qty"     body={(r) => `${r.required_qty} ${data.nama_satuan}`} />
          <Column field="status"         header="Status"  body={statusPengadaanTemplate} />
          <Column field="is_auto"        header="Tipe"    body={(r) => <Tag value={r.is_auto ? 'Otomatis' : 'Manual'} severity={r.is_auto ? 'info' : 'secondary'} />} />
          <Column field="created_at"     header="Tanggal" body={(r) => formatDate(r.created_at)} />
        </DataTable>

        <div className="flex justify-content-end mt-4">
          <Button label="Tutup" icon="pi pi-times" className="p-button-text" onClick={onHide} />
        </div>

      </div>
    </Dialog>
  );
};

export default DetailStok;