'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';

const FormUpdateStock = ({ visible, onHide, onSave, selectedData }) => {
  const [currentStock, setCurrentStock] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !selectedData) return;
    setCurrentStock(selectedData.current_stock ?? 0);
  }, [visible, selectedData]);

  const handleSubmit = async () => {
    setLoading(true);
    await onSave({ current_stock: currentStock });
    setLoading(false);
  };

  const isLow = selectedData && currentStock <= selectedData.min_stock_level;

  return (
    <Dialog
      header={`Update Stok: ${selectedData?.material_name || ''}`}
      visible={visible}
      style={{ width: '380px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">
        <div className="mb-3 p-3 bg-blue-50 border-round">
          <small className="text-blue-700">
            <b>Kode:</b> {selectedData?.kode_bahan_baku} &nbsp;|&nbsp;
            <b>Satuan:</b> {selectedData?.nama_satuan} &nbsp;|&nbsp;
            <b>Min Stok:</b> {selectedData?.min_stock_level}
          </small>
        </div>

        <div className="field mb-3">
          <label className="font-bold block mb-2">Jumlah Stok Saat Ini</label>
          <InputNumber
            value={currentStock}
            onValueChange={(e) => setCurrentStock(e.value)}
            min={0}
            showButtons
            suffix={` ${selectedData?.nama_satuan || ''}`}
          />
        </div>

        {isLow && (
          <div className="p-3 bg-red-50 border-round mb-3">
            <small className="text-red-500 font-bold">
              ⚠ Stok di bawah batas minimum ({selectedData?.min_stock_level} {selectedData?.nama_satuan})!
              Sistem akan memicu notifikasi pengadaan otomatis.
            </small>
          </div>
        )}

        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label="Simpan Stok"
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormUpdateStock;