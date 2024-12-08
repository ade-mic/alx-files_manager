import express from 'express';
import { Router } from 'express';
import { appendFile } from 'fs';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stat', AppController.getStats);

export default router;