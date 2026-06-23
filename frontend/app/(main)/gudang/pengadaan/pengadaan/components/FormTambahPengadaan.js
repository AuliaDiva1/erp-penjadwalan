'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const FormTambahPengadaan = ({ visible, onHide, onSave }) => {
  const [opTypes,    setOpTypes]    = useState([]);
  const [opType,     setOpType]     = useState(null);
  const [materials,  setMaterials]  = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [qty,        setQty]        = useState(null);
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);
  const [error,      setError]      = useState('');

  const getToken = () => localStorage.getItem('TOKEN');

  useEffect(() => {
    if (!visible) return;
    setOpType(null); setMaterials([]); setSelected(null);
    setQty(null); setNotes(''); setError('');
    fetch(`${BASE_URL}/operation-types`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(j => { if (j.success) setOpTypes(j.data.filter(o => o.is_active)); });
  }, [visible]);

  const handleSelectOpType = async (op) => {
    setOpType(op);
    setSelected(null); setQty(null); setError('');
    setLoadingMat(true);
    try {
      const res  = await fetch(`${BASE_URL}/materials?operation_type_id=${op.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      setMaterials(json.success ? json.data : []);
    } finally {
      setLoadingMat(false);
    }
  };

  const handleSelectMaterial = (mat) => {
    setSelected(mat);
    const cur = Number(mat.current_stock ?? 0);
    const min = Number(mat.min_stock_level ?? 10);
    setQty(Math.max(min - cur + 10, 10));
    setError('');
  };

  const handleSubmit = async () => {
    if (!opType)          { setError('Pilih operation type terlebih dahulu'); return; }
    if (!selected)        { setError('Pilih bahan baku terlebih dahulu'); return; }
    if (!qty || qty <= 0) { setError('Qty wajib diisi'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/procurements`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ material_id: selected.id, required_qty: qty, notes }),
      });
      const json = await res.json();
      if (json.success) { onSave(); onHide(); }
      else setError(json.message);
    } catch {
      setError('Gagal membuat pengadaan');
    } finally {
      setLoading(false);
    }
  };

  const rekQty = selected
    ? Math.max(Number(selected.min_stock_level ?? 10) - Number(selected.current_stock ?? 0) + 10, 10)
    : null;

  return (
    <Dialog
      header="Tambah Pengadaan Manual"
      visible={visible}
      style={{ width: '500px' }}
      modal onHide={onHide} draggable={false} dismissableMask
    >
      <div className="p-fluid">

        {/* Operation Type */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Operation Type <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={opType}
            options={opTypes}
            onChange={(e) => handleSelectOpType(e.value)}
            optionLabel="nama_operasi"
            filter
            filterPlaceholder="Cari operation type..."
            placeholder="-- Pilih Operation Type --"
            itemTemplate={(opt) => (
              <div className="flex justify-content-between align-items-center">
                <span>{opt.nama_operasi}</span>
                <Tag value={opt.kode_operasi} severity="secondary" />
              </div>
            )}
          />
        </div>

        {/* Bahan Baku */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">
            Bahan Baku <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={selected}
            options={materials}
            onChange={(e) => handleSelectMaterial(e.value)}
            optionLabel="material_name"
            filter
            filterPlaceholder="Cari bahan baku..."
            placeholder={
              !opType        ? 'Pilih operation type dulu' :
              loadingMat     ? 'Memuat...' :
              '-- Pilih Bahan Baku --'
            }
            disabled={!opType || loadingMat}
            emptyMessage="Tidak ada bahan baku untuk operation type ini"
            itemTemplate={(opt) => (
              <div className="flex justify-content-between align-items-center">
                <span>{opt.material_name}</span>
                <Tag value={opt.kode_bahan_baku} severity="secondary" />
              </div>
            )}
          />
        </div>

        {/* Info stok */}
        {selected && (
          <div className="p-3 border-round mb-4" style={{ background: 'var(--surface-ground)' }}>
            <div className="flex justify-content-between mb-2">
              <span className="text-sm text-color-secondary">Stok saat ini</span>
              <span className="font-semibold">{selected.current_stock} {selected.nama_satuan}</span>
            </div>
            <div className="flex justify-content-between mb-2">
              <span className="text-sm text-color-secondary">Min. stok</span>
              <span className="font-semibold">{selected.min_stock_level} {selected.nama_satuan}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-sm text-color-secondary">Rekomendasi qty</span>
              <span className="font-semibold text-primary">+{rekQty} {selected.nama_satuan}</span>
            </div>
          </div>
        )}

        {/* Qty */}
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
              placeholder="Jumlah pengadaan..."
              disabled={!selected}
              className={error && (!qty || qty <= 0) ? 'p-invalid' : ''}
              style={{ flex: 1 }}
            />
            {selected && (
              <span className="text-color-secondary font-semibold" style={{ minWidth: '40px' }}>
                {selected.nama_satuan}
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="field mb-4">
          <label className="font-bold block mb-2">Catatan</label>
          <InputTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan (opsional)..."
            autoResize
          />
        </div>

        {error && <small className="p-error block mb-3">{error}</small>}

        <div className="flex justify-content-end gap-2">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label="Buat Pengadaan"
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-plus'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormTambahPengadaan;