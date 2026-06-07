import {
  getMaterialsByOperationType,
  getOperationMaterialById,
  addOperationMaterial,
  updateOperationMaterial,
  deleteOperationMaterial,
} from '../models/operationMaterialModel.js';
import { getOperationTypeById } from '../models/operationTypeModel.js';

export const getMaterialsByOperationTypeController = async (req, res) => {
  try {
    const { operation_type_id } = req.params; // ✅ pindah ke params, lebih RESTful
    const data = await getMaterialsByOperationType(operation_type_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOperationMaterial = async (req, res) => {
  try {
    const { operation_type_id, material_name, jurnal_sumber } = req.body;
    if (!operation_type_id) return res.status(400).json({ success: false, message: 'operation_type_id wajib diisi' });
    if (!material_name?.trim()) return res.status(400).json({ success: false, message: 'Nama material wajib diisi' });

    // ✅ validasi operation_type_id valid dan aktif
    const opType = await getOperationTypeById(operation_type_id);
    if (!opType) return res.status(404).json({ success: false, message: 'Operation type tidak ditemukan' });
    if (!opType.is_active) return res.status(400).json({ success: false, message: 'Operation type tidak aktif' });

    const data = await addOperationMaterial({ operation_type_id, material_name, jurnal_sumber });
    res.status(201).json({ success: true, message: 'Material berhasil ditambahkan', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOperationMaterialController = async (req, res) => {
  try {
    const existing = await getOperationMaterialById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Material tidak ditemukan' });

    const { material_name, jurnal_sumber } = req.body;
    const data = await updateOperationMaterial(req.params.id, { material_name, jurnal_sumber });
    res.json({ success: true, message: 'Material berhasil diperbarui', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOperationMaterialController = async (req, res) => {
  try {
    const existing = await getOperationMaterialById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Material tidak ditemukan' });

    await deleteOperationMaterial(req.params.id);
    res.json({ success: true, message: 'Material berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};