'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';

const FormRevisi = ({ visible, onHide, onSave, selectedData }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNote('');
    setError('');
  }, [visible]);

  const handleSubmit = async () => {
    if (!note.trim()) { setError('Catatan revisi wajib diisi'); return; }
    setLoading(true);
    await onSave({ revision_note: note.trim() });
    setLoading(false);
  };

  return (
    <Dialog
      header={`Ajukan Revisi: ${selectedData?.schedule_code || ''}`}
      visible={visible}
      style={{ width: '480px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">
        <div className="mb-3 p-3 border-round" style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
          <div className="flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle" style={{ color: '#f59e0b' }} />
            <span className="text-sm font-medium">Jadwal akan dikembalikan ke status <strong>Revised</strong> dan perlu dioptimasi ulang.</span>
          </div>
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Catatan Revisi <span className="text-red-500">*</span></label>
          <InputTextarea
            value={note}
            onChange={(e) => { setNote(e.target.value); setError(''); }}
            rows={4}
            placeholder="Jelaskan alasan revisi jadwal ini..."
            className={error ? 'p-invalid' : ''}
          />
          {error && <small className="p-error">{error}</small>}
        </div>

        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label="Ajukan Revisi"
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
            severity="warning"
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormRevisi;