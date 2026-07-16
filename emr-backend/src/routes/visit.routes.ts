import { Router } from 'express';
import { visitController } from '../controllers/visit.controller';

const router = Router();

router.get('/patient/:patientId', visitController.getByPatientId);
// visit.routes.ts
router.get('/changes', visitController.getChangedSince); // above other routes
router.post('/', visitController.create);
router.put('/:id', visitController.update);
router.delete('/:id', visitController.softDelete);

export default router;