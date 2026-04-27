import {
  getAllMachines,
  getMachineById,
  getMachineByMachineId,
  addMachine,
  updateMachine,
  deleteMachine,
  toggleMachineStatus,
} from '../models/machineModel.js';

export const createMachine = async (req, res) => {
  try {
    const { machine_id, machine_name, operation_type, capacity_per_hour, energy_rate, machine_availability } = req.body;

    const existing = await getMachineByMachineId(machine_id);
    if (existing) return res.status(400).json({ success: false, message: 'Machine ID sudah digunakan' });

    const machine = await addMachine({
      machine_id, machine_name, operation_type,
      capacity_per_hour, energy_rate,
      machine_availability: machine_availability ?? 95,
      status: 'active',
    });

    res.status(201).json({ success: true, message: 'Mesin berhasil ditambahkan', data: machine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllMachinesController = async (req, res) => {
  try {
    const machines = await getAllMachines();
    res.json({ success: true, data: machines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMachineByIdController = async (req, res) => {
  try {
    const machine = await getMachineById(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Mesin tidak ditemukan' });
    res.json({ success: true, data: machine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMachineController = async (req, res) => {
  try {
    const machine = await getMachineById(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Mesin tidak ditemukan' });

    const updated = await updateMachine(req.params.id, req.body);
    res.json({ success: true, message: 'Mesin berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMachineController = async (req, res) => {
  try {
    const machine = await getMachineById(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Mesin tidak ditemukan' });

    await deleteMachine(req.params.id);
    res.json({ success: true, message: 'Mesin berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleMachineStatusController = async (req, res) => {
  try {
    const machine = await getMachineById(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Mesin tidak ditemukan' });

    const newStatus = machine.status === 'active' ? 'inactive' : 'active';
    await toggleMachineStatus(req.params.id, newStatus);
    res.json({ success: true, message: `Status mesin diubah menjadi ${newStatus}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};