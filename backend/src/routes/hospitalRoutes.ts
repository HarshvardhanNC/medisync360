import { Router } from 'express';
import { createHospital, getHospitals } from '../controllers/hospitalController';

const router = Router();

router.post('/', createHospital);
router.get('/', getHospitals);

export default router;
