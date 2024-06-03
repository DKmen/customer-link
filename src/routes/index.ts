import express from 'express';
import { identify } from '../controller';

const router = express.Router();

router.post('/identify', identify)

export default router;