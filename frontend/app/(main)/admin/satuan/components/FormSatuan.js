'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

const FormSatuan = ({ visible, onHide, onSave, selectedData }) => {
  const [namaSatuan, setNamaSatuan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNamaSatuan(selectedData?.nama_satuan || '');
    setError('');
  }, [visible, selectedData]);

  const handleSubmit = async () => {
    if (!namaSatuan.trim()) { setError('Nama satuan wajib diisi'); return; }
    setLoading(true);
    await onSave({ nama_satuan: namaSatuan.trim() });
    setLoading(false);
  };

  return (
    <Dialog
      header={selectedData ? `Edit Satuan: ${selectedData.nama_satuan}` : 'Tambah Satuan Baru'}
      visible={visible}
      style={{ width: '380px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">
        {selectedData && (
          <div className="field mb-4">
            <label className="font-bold block mb-2">Kode Satuan</label>
            <InputText value={selectedData.kode_satuan} disabled className="p-disabled bg-gray-100" />
          </div>
        )}

        <div className="field mb-4">
          <label className="font-bold block mb-2">Nama Satuan <span className="text-red-500">*</span></label>
          <InputText
            value={namaSatuan}
            onChange={(e) => { setNamaSatuan(e.target.value); setError(''); }}
            placeholder="Contoh: Kilogram, Liter, Pcs"
            className={error ? 'p-invalid' : ''}
          />
          {error && <small className="p-error">{error}</small>}
        </div>

        <div className="flex justify-content-end gap-2 mt-5">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label={selectedData ? 'Simpan Perubahan' : 'Simpan Satuan'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormSatuan;