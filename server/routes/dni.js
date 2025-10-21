import express from 'express';
import Dni from '../models/Dni.js';

const router = express.Router();

/**
 * @route POST /api/dni/save
 * @desc Guarda SIEMPRE un nuevo registro, incluso si el DNI ya existe
 */
router.post('/save', async (req, res) => {
  const { 
    dniNumber, 
    hologramReadable, 
    homogenityPassed, 
    profileUsed,
    customFields,
    watermarkText 
  } = req.body;

  try {
    const recordData = {
      dniNumber,
      hologramReadable,
      homogenityPassed,
      profileUsed,
    };
    
    // ✅ Guardar customFields si es personalizado
    if (profileUsed === 'personalizado' && customFields) {
      if (typeof customFields !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'customFields debe ser un objeto con valores true/false'
        });
      }
      
      recordData.customFields = new Map(Object.entries(customFields));
    }

    // ✅ Guardar marca de agua si existe
    if (watermarkText) {
      if (watermarkText.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El texto de la marca de agua no puede superar 50 caracteres'
        });
      }
      
      recordData.watermarkText = watermarkText.trim();
    }

    const record = new Dni(recordData);
    await record.save();

    res.status(201).json({
      success: true,
      message: 'Nuevo DNI registrado correctamente',
      record,
    });
  } catch (error) {
    console.error('❌ Error al guardar DNI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/dni
 * @desc Obtener todos los DNIs registrados
 */
router.get('/', async (req, res) => {
  try {
    const records = await Dni.find().sort({ uploadDate: -1 });

    if (records.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay DNIs registrados todavía',
        records: [],
      });
    }

    res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('❌ Error al obtener DNIs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los DNIs',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/dni/:dniNumber
 * @desc Obtener todos los registros de un mismo número de DNI
 */
router.get('/:dniNumber', async (req, res) => {
  const { dniNumber } = req.params;
  try {
    const records = await Dni.find({ dniNumber }).sort({ uploadDate: -1 });
    if (!records.length) {
      return res.status(404).json({ success: false, message: 'DNI no encontrado' });
    }
    res.status(200).json({ success: true, count: records.length, records });
  } catch (error) {
    console.error('❌ Error al obtener DNI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/dni/history/:dniNumber
 * @desc Devuelve un historial resumido del DNI (fecha y perfil usado)
 */
router.get('/history/:dniNumber', async (req, res) => {
  const { dniNumber } = req.params;
  try {
    const records = await Dni.find({ dniNumber })
      .sort({ uploadDate: -1 })
      .select('uploadDate profileUsed homogenityPassed hologramReadable customFields watermarkText -_id');

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: `No hay historial para el DNI ${dniNumber}`,
      });
    }

    const history = records.map((r) => ({
      fecha: r.uploadDate,
      perfil: r.profileUsed,
      holograma_ok: r.hologramReadable,
      homogenidad_ok: r.homogenityPassed,
      customFields: r.customFields ? Object.fromEntries(r.customFields) : null,
      watermarkText: r.watermarkText || null,
    }));

    res.status(200).json({
      success: true,
      dniNumber,
      totalProcesos: history.length,
      history,
    });
  } catch (error) {
    console.error('❌ Error al obtener historial de DNI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/dni/:dniNumber
 * @desc Eliminar todos los registros de un número de DNI
 */
router.delete('/:dniNumber', async (req, res) => {
  const { dniNumber } = req.params;
  try {
    const result = await Dni.deleteMany({ dniNumber });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron registros de ese DNI para eliminar',
      });
    }
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} registro(s) de DNI eliminado(s) correctamente`,
    });
  } catch (error) {
    console.error('❌ Error al eliminar DNI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;