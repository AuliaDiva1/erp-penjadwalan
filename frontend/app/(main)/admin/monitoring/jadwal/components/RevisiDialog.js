// RevisiDialog.jsx
'use client';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';

export default function RevisiDialog({
  visible, onHide, scheduleCode,
  revisiNote, setRevisiNote,
  onSubmit, actionLoading,
}) {
  return (
    <Dialog
      header={`Ajukan Revisi — ${scheduleCode}`}
      visible={visible}
      style={{ width: '420px' }}
      modal onHide={onHide}
      draggable={false} dismissableMask
    >
      <div>
        <p className="text-sm text-color-secondary mt-0">
          Jadwal akan dikembalikan ke status <b>Revised</b> dan tidak lagi berstatus Final.
          Isi catatan revisi dengan jelas.
        </p>
        <InputTextarea
          value={revisiNote}
          onChange={(e) => setRevisiNote(e.target.value)}
          rows={4}
          placeholder="Tuliskan alasan atau catatan revisi..."
          style={{ width: '100%' }}
          autoResize
        />
        <div className="flex justify-content-end gap-2 mt-3">
          <Button label="Batal" icon="pi pi-times" text onClick={onHide} />
          <Button label="Ajukan Revisi" icon="pi pi-send" severity="warning"
            onClick={onSubmit} loading={actionLoading} />
        </div>
      </div>
    </Dialog>
  );
}