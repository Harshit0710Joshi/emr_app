import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';

const router = Router();

router.get('/changes', patientController.getChangedSince);
router.get('/', patientController.getAll);
router.get('/:id', patientController.getById);
router.post('/', patientController.create);
router.put('/:id', patientController.update);
router.delete('/:id', patientController.softDelete);

export default router;