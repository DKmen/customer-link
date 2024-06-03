import express from 'express'
import identify from './src/routes/index.js';

const router = express.Router()

router.use(identify);

export default router
