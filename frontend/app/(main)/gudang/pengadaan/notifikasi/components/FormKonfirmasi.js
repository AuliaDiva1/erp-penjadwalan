'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

const STATUS_OPTIONS = [
  { label: 'Pending',         value: 'pending'     },
  { label: 'Sedang Diproses', value: 'in_progress' },
  { label: 'Selesai',         value: 'completed'   },
];

const FormKonfirmasi = ({ visible, onHide, onSave, selectedData }) => {
  const [status, setStatus]   = useState('');
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!visible || !selectedData) return;
    setStatus(selectedData.status || 'pending');
    setNotes(selectedData.notes || '');
    setError('');
  }, [visible, selectedData]);

  const handleSubmit = async () => {
    if (!status) { setError('Status wajib dipilih'); return; }
    setLoading(true);
    await onSave({ status, notes: notes.trim() });
    setLoading(false);
  };

  return (
    <Dialog
      header="Proses Pengadaan"
      visible={visible}
      style={{ width: '460px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        <div className="p-3 border-round mb-4" style={{ background: 'var(--surface-ground)' }}>
          <div className="flex justify-content-between align-items-center mb-2">
            <span className="font-semibold">{selectedData?.material_name}</span>
            <Tag value={selectedData?.kode_bahan_baku} severity="secondary" />
          </div>
          <div className="flex gap-4 text-sm text-color-secondary">
            <span>
              Stok saat notif:{' '}
              <b className="text-red-500">
                {selectedData?.current_stock_at_trigger} {selectedData?.nama_satuan}
              </b>
            </span>
            <span>
              Dibutuhkan:{' '}
              <b className="text-primary">
                +{selectedData?.required_qty} {selectedData?.nama_satuan}
              </b>
            </span>
          </div>
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Status Pengadaan <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => { setStatus(e.value); setError(''); }}
            placeholder="-- Pilih Status --"
            className={error ? 'p-invalid' : ''}
          />
          {error && <small className="p-error">{error}</small>}
          {status === 'completed' && (
            <small className="text-green-500 mt-1 block">
              Stok bahan baku akan otomatis bertambah sebesar {selectedData?.required_qty} {selectedData?.nama_satuan}
            </small>
          )}
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Catatan</label>
          <InputTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Catatan pengadaan (opsional)..."
          />
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