'use client';
import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Delayed', value: 'Delayed' },
  { label: 'Failed', value: 'Failed' },
];

const FormActual = ({ visible, onHide, onSave, selectedData }) => {
  const [form, setForm] = useState({
    actual_start: null,
    actual_end: null,
    job_status: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !selectedData) return;
    setForm({
      actual_start: selectedData.actual_start ? new Date(selectedData.actual_start) : null,
      actual_end:   selectedData.actual_end   ? new Date(selectedData.actual_end)   : null,
      job_status:   selectedData.job_status   || 'Pending',
    });
  }, [visible, selectedData]);

  const handleSubmit = async () => {
    setLoading(true);
    await onSave({
      actual_start: form.actual_start ? form.actual_start.toISOString() : null,
      actual_end:   form.actual_end   ? form.actual_end.toISOString()   : null,
      job_status:   form.job_status,
    });
    setLoading(false);
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog
      header={`Input Aktual: ${selectedData?.job_id || ''}`}
      visible={visible}
      style={{ width: '400px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        <div className="mb-3 p-3 bg-blue-50 border-round">
          <small className="text-blue-700">
            <b>Job:</b> {selectedData?.job_id} &nbsp;|&nbsp;
            <b>Operasi:</b> {selectedData?.operation_type} &nbsp;|&nbsp;
            <b>Mesin:</b> {selectedData?.machine_name || '-'}
          </small>
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Status Job</label>
          <Dropdown
            value={form.job_status}
            options={STATUS_OPTIONS}
            onChange={(e) => set('job_status', e.value)}
            placeholder="-- Pilih Status --"
          />
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Actual Start</label>
          <Calendar
            value={form.actual_start}
            onChange={(e) => set('actual_start', e.value)}
            showTime hourFormat="24"
            placeholder="Pilih waktu mulai aktual"
            showIcon
          />
        </div>

        <div className="field mb-4">
          <label className="font-bold block mb-2">Actual End</label>
          <Calendar
            value={form.actual_end}
            onChange={(e) => set('actual_end', e.value)}
            showTime hourFormat="24"
            placeholder="Pilih waktu selesai aktual"
            showIcon
          />
        </div>

        <div className="flex justify-content-end gap-2 mt-4">
          <Button label="Batal" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
          <Button
            label="Simpan Aktual"
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default FormActual;