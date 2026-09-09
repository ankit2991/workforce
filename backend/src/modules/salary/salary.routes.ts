import { Router } from 'express';
import { getSalaryOverview, requestSalaryAdvance, getSalaryAdvances } from './salary.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSalaryOverview);
router.post('/advances', authenticate, requestSalaryAdvance);
router.get('/advances', authenticate, getSalaryAdvances);

export default router;
