'use client';
import { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const OPERATION_TYPES = ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling'];
const HIMPUNAN       = ['Rendah', 'Sedang', 'Tinggi'];
const PRIORITAS      = ['Rendah', 'Sedang', 'Tinggi'];

const DEFAULT_RULES = [];
HIMPUNAN.forEach(pt => {
  HIMPUNAN.forEach(ec => {
    HIMPUNAN.forEach(ma => {
      let prioritas = 'Sedang';
      if (pt === 'Tinggi' && ec === 'Tinggi') prioritas = 'Tinggi';
      else if (pt === 'Rendah' && ec === 'Rendah') prioritas = 'Rendah';
      else if (ma === 'Rendah' && pt === 'Tinggi') prioritas = 'Tinggi';
      else if (ma === 'Tinggi' && pt === 'Rendah') prioritas = 'Rendah';
      DEFAULT_RULES.push({
        processing_time:      pt,
        energy_consumption:   ec,
        machine_availability: ma,
        prioritas,
      });
    });
  });
});

const DEFAULT_MF = {
  processing_time:      { rendah: [20, 20, 57],  sedang: [20, 57, 95],   tinggi: [57, 95, 120]  },
  energy_consumption:   { rendah: [2.01, 2.01, 6.33], sedang: [2.01, 6.33, 10.66], tinggi: [6.33, 10.66, 14.98] },
  machine_availability: { rendah: [80, 80, 86],  sedang: [80, 86, 93],   tinggi: [86, 93, 99]   },
};

export default function FuzzyParameterPage() {
  const toast    = useRef(null);
  const [config, setConfig]   = useState(null);
  const [rules, setRules]     = useState(DEFAULT_RULES);
  const [mf, setMf]           = useState(DEFAULT_MF);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [isEdit, setIsEdit]   = useState(false);

  const getToken = () => localStorage.getItem('TOKEN');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/konfigurasi/fuzzy`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
        setRules(json.data.fuzzy_rules);
        setMf(json.data.membership_functions);
        setIsEdit(true);
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal memuat konfigurasi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleRuleChange = (index, value) => {
    const updated = [...rules];
    updated[index].prioritas = value;
    setRules(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url    = isEdit ? `${BASE_URL}/konfigurasi/fuzzy/${config.id}` : `${BASE_URL}/konfigurasi/fuzzy`;
      const method = isEdit ? 'PUT' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          fuzzy_rules:          rules,
          membership_functions: mf,
          bobot_operation_type: config?.bobot_operation_type || {
            Additive: 1.20, Milling: 1.15, Grinding: 1.10, Lathe: 1.00, Drilling: 0.95,
          },
          versi: `v${new Date().toISOString().slice(0, 10)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.current.show({ severity: 'success', summary: 'Berhasil', detail: 'Konfigurasi Fuzzy Mamdani disimpan' });
        fetchConfig();
      } else {
        toast.current.show({ severity: 'error', summary: 'Gagal', detail: json.message });
      }
    } catch {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Gagal menyimpan konfigurasi' });
    } finally {
      setSaving(false);
    }
  };

  const prioritasTemplate = (row, { rowIndex }) => (
    <Dropdown
      value={row.prioritas}
      options={PRIORITAS.map(p => ({ label: p, value: p }))}
      onChange={(e) => handleRuleChange(rowIndex, e.value)}
      style={{ width: '130px' }}
    />
  );

  const tagTemplate = (field) => (row) => {
    const map = { Rendah: 'success', Sedang: 'info', Tinggi: 'warning' };
    return <Tag value={row[field]} severity={map[row[field]] || 'info'} />;
  };

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="m-0 mb-1">Konfigurasi Fuzzy Mamdani — Parameter & Rules</h2>
          <p className="m-0 text-color-secondary text-sm">
            Atur 27 rules inferensi dan fungsi keanggotaan variabel input
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon="pi pi-refresh" text onClick={fetchConfig} loading={loading} tooltip="Refresh" />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-save'}
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      </div>

      {config && (
        <div className="card p-3 mb-4" style={{ background: 'var(--surface-ground)' }}>
          <div className="flex gap-4 text-sm">
            <span>Versi aktif: <b>{config.versi || '-'}</b></span>
            <span>Diperbarui oleh: <b>{config.updated_by || '-'}</b></span>
            <span>Tanggal: <b>{config.updated_at ? new Date(config.updated_at).toLocaleString('id-ID') : '-'}</b></span>
          </div>
        </div>
      )}

      {/* MEMBERSHIP FUNCTIONS */}
      <div className="card mb-4">
        <h3 className="mt-0 mb-3">Fungsi Keanggotaan (Triangular)</h3>
        <div className="grid">
          {Object.entries(mf).map(([varName, himpunan]) => (
            <div key={varName} className="col-12 md:col-4">
              <div className="p-3 border-round" style={{ border: '1px solid var(--surface-border)' }}>
                <div className="font-semibold mb-2 capitalize">
                  {varName.replace(/_/g, ' ')}
                </div>
                {Object.entries(himpunan).map(([h, vals]) => (
                  <div key={h} className="flex justify-content-between align-items-center py-1 text-sm">
                    <span className="capitalize text-color-secondary">{h}</span>
                    <span className="font-mono">[{vals.join(', ')}]</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 27 RULES */}
      <div className="card">
        <h3 className="mt-0 mb-3">27 Rules Inferensi IF-THEN</h3>
        <DataTable
          value={rules}
          loading={loading}
          stripedRows
          size="small"
          emptyMessage="Belum ada rules"
        >
          <Column
            header="No"
            body={(row, { rowIndex }) => rowIndex + 1}
            style={{ width: '50px' }}
          />
          <Column
            field="processing_time"
            header="IF Processing Time"
            body={tagTemplate('processing_time')}
          />
          <Column
            field="energy_consumption"
            header="AND Energy Consumption"
            body={tagTemplate('energy_consumption')}
          />
          <Column
            field="machine_availability"
            header="AND Machine Availability"
            body={tagTemplate('machine_availability')}
          />
          <Column
            header="THEN Prioritas"
            body={prioritasTemplate}
            style={{ width: '160px' }}
          />
        </DataTable>
      </div>
    </div>
  );
}