'use client';
import { Button }   from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Dialog }   from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';

const ACTUAL_STATUS_OPTIONS = [
  { label: 'Pending',     value: 'Pending'     },
  { label: 'Scheduled',   value: 'Scheduled'   },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed',   value: 'Completed'   },
  { label: 'Delayed',     value: 'Delayed'     },
  { label: 'Failed',      value: 'Failed'      },
];

export default function JobActualForm({
  visible,
  onHide,
  selectedJob,
  actualForm,
  setActualForm,
  onSave,
  saving,
}) {
  return (
    <Dialog
      header={`Input Aktual: ${selectedJob?.job_id}`}
      visible={visible}
      style={{ width: '440px' }}
      modal onHide={onHide}
      draggable={false} dismissableMask
    >
      <div className="p-fluid">
        <div className="mb-3 p-3 border-round" style={{ background: 'var(--surface-ground)' }}>
          <small>
            <b>Job:</b> {selectedJob?.job_id} &nbsp;|&nbsp;
            <b>Operasi:</b> {selectedJob?.operation_type} &nbsp;|&nbsp;
            <b>Mesin:</b> {selectedJob?.machine_name || '-'}
          </small>
        </div>

        <div className="field mb-3">
          <label className="font-bold block mb-2">Status Job</label>
          <Dropdown
            value={actualForm.job_status}
            options={ACTUAL_STATUS_OPTIONS}
            onChange={(e) => setActualForm(p => ({ ...p, job_status: e.value }))}
            style={{ width: '100%' }}
          />
        </div>

        <div className="field mb-3">
          <label className="font-bold block mb-2">Actual Start</label>
          <Calendar
            value={actualForm.actual_start}
            onChange={(e) => setActualForm(p => ({ ...p, actual_start: e.value }))}
            showTime hourFormat="24" showIcon style={{ width: '100%' }}
          />
        </div>

        <div className="field mb-3">
          <label className="font-bold block mb-2">Actual End</label>
          <Calendar
            value={actualForm.actual_end}
            onChange={(e) => setActualForm(p => ({ ...p, actual_end: e.value }))}
            showTime hourFormat="24" showIcon style={{ width: '100%' }}
          />
        </div>

        <div className="flex justify-content-end gap-2 mt-3">
          <Button
            label="Batal" icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            disabled={saving}
          />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Aktual'}
            icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={onSave}
            disabled={saving}
          />
        </div>
      </div>
    </Dialog>
  );
}