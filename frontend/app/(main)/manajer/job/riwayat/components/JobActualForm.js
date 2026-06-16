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

const STATUS_COLOR = {
  Pending:       '#f59e0b',
  Scheduled:     '#3b82f6',
  'In Progress': '#22c55e',
  Completed:     '#22c55e',
  Delayed:       '#ef4444',
  Failed:        '#ef4444',
};

export default function JobActualForm({
  visible, onHide, selectedJob, actualForm, setActualForm, onSave, saving,
}) {
  const handleSave = () => {
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
    if (newStatus === 'In Progress' && !actualForm.actual_start) updated.actual_start = now;
    if (newStatus === 'Completed' && !actualForm.actual_end) {
      updated.actual_end = now;
      if (!actualForm.actual_start) updated.actual_start = now;
    }
    setActualForm(updated);
  };

  const isEndBeforeStart =
    actualForm.actual_start && actualForm.actual_end &&
    actualForm.actual_end < actualForm.actual_start;

  const isLate = actualForm.actual_end && selectedJob?.scheduled_end &&
    actualForm.actual_end > new Date(selectedJob.scheduled_end);

  const fmtSchedule = (val) => val
    ? new Date(val).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="pi pi-clock" style={{ fontSize: '0.9rem', color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>Input Aktual</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', fontWeight: 400 }}>
              {selectedJob?.job_id}
            </div>
          </div>
        </div>
      }
      visible={visible}
      style={{ width: '460px', borderRadius: 16 }}
      modal onHide={onHide} draggable={false} dismissableMask
      contentStyle={{ padding: '1.25rem 1.5rem' }}
    >
      {/* Job Meta */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginBottom: 16,
      }}>
        {[
          { label: 'Job', value: selectedJob?.job_id },
          { label: 'Operasi', value: selectedJob?.operation_type },
          { label: 'Mesin', value: selectedJob?.machine_name || '-' },
        ].map((item) => (
          <div key={item.label} style={{
            background: 'var(--surface-ground)', borderRadius: 8,
            padding: '8px 10px',
          }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-color-secondary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Jadwal Sistem */}
      {selectedJob?.scheduled_start && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, padding: '10px 12px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="pi pi-calendar" style={{ color: '#3b82f6', fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.78rem', color: '#1e40af' }}>
            <b>Jadwal:</b>&nbsp;
            {fmtSchedule(selectedJob.scheduled_start)} → {fmtSchedule(selectedJob.scheduled_end)}
          </span>
        </div>
      )}

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Status Job
        </label>
        <Dropdown
          value={actualForm.job_status}
          options={ACTUAL_STATUS_OPTIONS}
          onChange={(e) => handleStatusChange(e.value)}
          placeholder="Pilih status..."
          style={{ width: '100%' }}
          itemTemplate={(opt) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_COLOR[opt.value] || '#94a3b8', flexShrink: 0,
              }} />
              {opt.label}
            </div>
          )}
        />
      </div>

      {/* Date row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Actual Start
          </label>
          <Calendar
            value={actualForm.actual_start}
            onChange={(e) => setActualForm(p => ({ ...p, actual_start: e.value }))}
            showTime hourFormat="24" showIcon showButtonBar
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Actual End
          </label>
          <Calendar
            value={actualForm.actual_end}
            onChange={(e) => setActualForm(p => ({ ...p, actual_end: e.value }))}
            showTime hourFormat="24" showIcon showButtonBar
            minDate={actualForm.actual_start || undefined}
            style={{ width: '100%' }}
            className={isEndBeforeStart ? 'p-invalid' : ''}
          />
        </div>
      </div>
      {isEndBeforeStart && (
        <small className="p-error" style={{ display: 'block', marginBottom: 8 }}>
          Actual End tidak boleh sebelum Actual Start
        </small>
      )}

      {/* Warning terlambat */}
      {isLate && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '10px 12px', marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="pi pi-exclamation-triangle" style={{ color: '#dc2626', fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.78rem', color: '#991b1b' }}>
            Job selesai melebihi jadwal sistem — akan ditandai <b>deadline warning</b>.
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--surface-border)',
      }}>
        <Button label="Batal" icon="pi pi-times" className="p-button-text p-button-sm"
          onClick={onHide} disabled={saving} />
        <Button
          label={saving ? 'Menyimpan...' : 'Simpan Aktual'}
          icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
          className="p-button-sm"
          onClick={handleSave}
          disabled={saving || isEndBeforeStart}
        />
      </div>
    </Dialog>
  );
}