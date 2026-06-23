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

const getNextStatus = (current) => {
  if (current === 'pending')     return 'in_progress';
  if (current === 'in_progress') return 'completed';
  return current;
};

const FormKonfirmasi = ({ visible, onHide, onSave, selectedData }) => {
  const [status,  setStatus]  = useState('');
  const [qty,     setQty]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!visible || !selectedData) return;
    setStatus(getNextStatus(selectedData.status));
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

  const availableStatuses = STATUS_OPTIONS.filter((opt) => {
    if (selectedData?.status === 'pending')     return opt.value !== 'pending';
    if (selectedData?.status === 'in_progress') return opt.value === 'completed';
    return false;
  });

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-check-circle" style={{ color: '#10b981' }} />
          <span>Proses Pengadaan</span>
        </div>
      }
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
          <div className="flex justify-content-between mb-1">
            <span className="text-sm text-color-secondary">Stok saat notif</span>
            <span className="text-sm font-semibold text-red-500">
              {selectedData?.current_stock_at_trigger} {selectedData?.nama_satuan}
            </span>
          </div>
          <div className="flex justify-content-between">
            <span className="text-sm text-color-secondary">Status sekarang</span>
            <Tag
              value={selectedData?.status === 'pending' ? 'Pending' : 'Sedang Diproses'}
              severity={selectedData?.status === 'pending' ? 'warning' : 'info'}
            />
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
            Ubah Status ke <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={status}
            options={availableStatuses}
            onChange={(e) => { setStatus(e.value); setError(''); }}
            placeholder="-- Pilih Status --"
            className={error && !status ? 'p-invalid' : ''}
          />
          {status === 'completed' && qty > 0 && (
            <small className="text-green-500 mt-1 block">
              <i className="pi pi-info-circle mr-1" />
              Stok akan otomatis bertambah {qty} {selectedData?.nama_satuan}
            </small>
          )}
          {error && <small className="p-error mt-1 block">{error}</small>}
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
            label={status === 'completed' ? 'Selesaikan' : 'Proses'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: status === 'completed' ? '#22c55e' : '#3b82f6',
              borderColor: status === 'completed' ? '#22c55e' : '#3b82f6',
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormKonfirmasi;