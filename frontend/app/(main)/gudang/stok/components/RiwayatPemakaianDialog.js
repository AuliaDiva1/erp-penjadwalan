'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const RiwayatPemakaianDialog = ({ visible, onHide, material }) => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (!visible || !material) return;
    setData([]);
    setLoading(true);
    fetch(`${BASE_URL}/materials/${material.id}/movements?source_type=production`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, [visible, material]);

  const formatDate = (val) =>
    val ? new Date(val).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '-';

  const totalPemakaian = data.reduce((a, d) => a + Number(d.quantity), 0);

  return (
    <Dialog
      header={`Riwayat Pemakaian — ${material?.material_name || ''}`}
      visible={visible}
      style={{ width: '700px' }}
      modal onHide={onHide} draggable={false} dismissableMask
    >
      <div className="p-3 border-round mb-4 flex gap-4" style={{ background: 'var(--surface-ground)' }}>
        <div>
          <span className="text-sm text-color-secondary">Kode</span>
          <div className="font-bold">{material?.kode_bahan_baku}</div>
        </div>
        <div>
          <span className="text-sm text-color-secondary">Stok Saat Ini</span>
          <div className="font-bold">{material?.current_stock} {material?.nama_satuan}</div>
        </div>
        <div>
          <span className="text-sm text-color-secondary">Total Pemakaian</span>
          <div className="font-bold text-red-500">{totalPemakaian} {material?.nama_satuan}</div>
        </div>
        <div>
          <span className="text-sm text-color-secondary">Jumlah Job</span>
          <div className="font-bold">{data.length}</div>
        </div>
      </div>

      <DataTable
        value={data}
        loading={loading}
        paginator
        rows={10}
        stripedRows
        emptyMessage="Belum ada riwayat pemakaian produksi"
        filterDisplay="menu"
      >
        <Column
          header="Job ID"
          body={(row) => (
            <span className="font-semibold font-mono text-sm">
              {row.notes?.match(/Job\s(\S+)/)?.[1] || (row.source_id ? `#${row.source_id}` : '-')}
            </span>
          )}
          style={{ width: '100px' }}
        />
        <Column
          header="Qty Dipakai"
          body={(row) => (
            <span className="font-semibold text-red-500">
              -{row.quantity} {row.nama_satuan}
            </span>
          )}
        />
        <Column
          header="Stok Sebelum"
          body={(row) => <span>{row.stock_before} {row.nama_satuan}</span>}
        />
        <Column
          header="Stok Sesudah"
          body={(row) => <span>{row.stock_after} {row.nama_satuan}</span>}
        />
        <Column
          header="Keterangan"
          body={(row) => <span className="text-sm text-color-secondary">{row.notes || '-'}</span>}
        />
        <Column
          header="Tanggal"
          body={(row) => <span className="text-sm">{formatDate(row.created_at)}</span>}
        />
      </DataTable>
    </Dialog>
  );
};

export default RiwayatPemakaianDialog;