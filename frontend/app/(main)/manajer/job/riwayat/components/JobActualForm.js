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
  const handleSave = () => {
    // validasi: actual_end tidak boleh sebelum actual_start
    if (actualForm.actual_start && actualForm.actual_end) {
      if (actualForm.actual_end < actualForm.actual_start) {
        alert('Actual End tidak boleh sebelum Actual Start');
        return;
      }
    }
    onSave();
  };

  const handleStatusChange = (newStatus) => {
    const now = new Date();
    const updated = { ...actualForm, job_status: newStatus };

    // auto-isi actual_start kalau pilih In Progress dan belum ada
    if (newStatus === 'In Progress' && !actualForm.actual_start) {
      updated.actual_start = now;
    }

    // auto-isi actual_end kalau pilih Completed dan belum ada
    if (newStatus === 'Completed' && !actualForm.actual_end) {
      updated.actual_end = now;
      // auto-isi actual_start juga kalau masih kosong
      if (!actualForm.actual_start) {
        updated.actual_start = now;
      }
    }

    setActualForm(updated);
  };

  const isEndBeforeStart =
    actualForm.actual_start &&
    actualForm.actual_end &&
    actualForm.actual_end < actualForm.actual_start;

  return (
    <Dialog
      header={`Input Aktual: ${selectedJob?.job_id}`}
      visible={visible}
      style={{ width: '440px' }}
      modal
      onHide={onHide}
      draggable={false}
      dismissableMask
    >
      <div className="p-fluid">

        {/* Info Job */}
        <div className="mb-3 p-3 border-round" style={{ background: 'var(--surface-ground)' }}>
          <small>
            <b>Job:</b> {selectedJob?.job_id} &nbsp;|&nbsp;
            <b>Operasi:</b> {selectedJob?.operation_type} &nbsp;|&nbsp;
            <b>Mesin:</b> {selectedJob?.machine_name || '-'}
          </small>
        </div>

        {/* Info jadwal dari sistem */}
        {selectedJob?.scheduled_start && (
          <div className="mb-3 p-3 border-round" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <small style={{ color: '#1e40af' }}>
              <b>Jadwal sistem:</b>&nbsp;
              {new Date(selectedJob.scheduled_start).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              &nbsp;→&nbsp;
              {selectedJob.scheduled_end
                ? new Date(selectedJob.scheduled_end).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '-'}
            </small>
          </div>
        )}

        {/* Status */}
        <div className="field mb-3">
          <label className="font-bold block mb-2">Status Job</label>
          <Dropdown
            value={actualForm.job_status}
            options={ACTUAL_STATUS_OPTIONS}
            onChange={(e) => handleStatusChange(e.value)}
            placeholder="Pilih status..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Actual Start */}
        <div className="field mb-3">
          <label className="font-bold block mb-2">Actual Start</label>
          <Calendar
            value={actualForm.actual_start}
            onChange={(e) => setActualForm(p => ({ ...p, actual_start: e.value }))}
            showTime
            hourFormat="24"
            showIcon
            showButtonBar
            style={{ width: '100%' }}
          />
        </div>

        {/* Actual End */}
        <div className="field mb-3">
          <label className="font-bold block mb-2">Actual End</label>
          <Calendar
            value={actualForm.actual_end}
            onChange={(e) => setActualForm(p => ({ ...p, actual_end: e.value }))}
            showTime
            hourFormat="24"
            showIcon
            showButtonBar
            minDate={actualForm.actual_start || undefined}
            style={{ width: '100%' }}
            className={isEndBeforeStart ? 'p-invalid' : ''}
          />
          {isEndBeforeStart && (
            <small className="p-error">Actual End tidak boleh sebelum Actual Start</small>
          )}
        </div>

        {/* Warning kalau terlambat dari jadwal */}
        {actualForm.actual_end && selectedJob?.scheduled_end &&
          actualForm.actual_end > new Date(selectedJob.scheduled_end) && (
          <div className="mb-3 p-3 border-round" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <small style={{ color: '#991b1b' }}>
              <i className="pi pi-exclamation-triangle mr-1" />
              Job selesai melebihi jadwal sistem. Akan ditandai <b>deadline warning</b>.
            </small>
          </div>
        )}

        {/* Tombol */}
        <div className="flex justify-content-end gap-2 mt-3">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="p-button-text"
            onClick={onHide}
            disabled={saving}
          />
          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Aktual'}
            icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleSave}
            disabled={saving || isEndBeforeStart}
          />
        </div>

      </div>
    </Dialog>
  );
}