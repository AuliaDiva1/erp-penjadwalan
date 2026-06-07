'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

const STATUS_OPTIONS = [
  { label: 'Pending',         value: 'pending'     },
  { label: 'Sedang Diproses', value: 'in_progress' },
  { label: 'Selesai',         value: 'completed'   },
];

const FormKonfirmasi = ({ visible, onHide, onSave, selectedData }) => {
  const [status,  setStatus]  = useState('');
  const [qty,     setQty]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!visible || !selectedData) return;
    setStatus(selectedData.status || 'pending');
    setQty(selectedData.required_qty > 0 ? selectedData.required_qty : null);
    setError('');
  }, [visible, selectedData]);

  const handleSubmit = async () => {
    if (!status)          { setError('Status wajib dipilih'); return; }
    if (!qty || qty <= 0) { setError('Qty pengadaan wajib diisi'); return; }
    setLoading(true);
    await onSave({ status, required_qty: qty });
    setLoading(false);
  };

  return (
    <Dialog
      header="Proses Pengadaan"
      visible={visible}
      style={{ width: '440px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Info bahan baku */}
        <div className="p-3 border-round mb-4" style={{ background: 'var(--surface-ground)' }}>
          <div className="flex justify-content-between align-items-center mb-2">
            <span className="font-semibold">{selectedData?.material_name}</span>
            <Tag value={selectedData?.kode_bahan_baku} severity="secondary" />
          </div>
          <div className="text-sm text-color-secondary">
            Stok saat notif:{' '}
            <b className="text-red-500">
              {selectedData?.current_stock_at_trigger} {selectedData?.nama_satuan}
            </b>
          </div>
        </div>

        {/* Qty pengadaan */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Qty Pengadaan <span className="text-red-500">*</span>
          </label>
          <div className="flex align-items-center gap-2">
            <InputNumber
              value={qty}
              onValueChange={(e) => { setQty(e.value); setError(''); }}
              min={1}
              showButtons
              placeholder="Masukkan jumlah..."
              className={error && (!qty || qty <= 0) ? 'p-invalid' : ''}
              style={{ flex: 1 }}
            />
            <span className="text-color-secondary font-semibold" style={{ minWidth: '40px' }}>
              {selectedData?.nama_satuan}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Status Pengadaan <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => { setStatus(e.value); setError(''); }}
            placeholder="-- Pilih Status --"
            className={error && !status ? 'p-invalid' : ''}
          />
          {error && <small className="p-error mt-1 block">{error}</small>}
          {status === 'completed' && qty > 0 && (
            <small className="text-green-500 mt-1 block">
              Stok akan otomatis bertambah {qty} {selectedData?.nama_satuan}
            </small>
          )}
        </div>

        <div className="flex justify-content-end gap-2 mt-4">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            label="Simpan"
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormKonfirmasi;