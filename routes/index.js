import { Router } from 'express';
import AppController from '../contollers/AppController';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stat', AppController.getStats);

export default router;
