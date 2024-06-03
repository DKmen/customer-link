import { pinoHttp as pino } from 'pino-http'
import { readFileSync } from 'fs'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { errorHandler } from './src/helper/errorHandler.js'
import { logger } from './src/helper/logger.js'
import router from './router.js'

const service = JSON.parse(readFileSync('./package.json', 'utf8'))

const app = express()

const { ENV = 'local' } = process.env

logger.info({ name: service.name, version: service.version, env: ENV })

app.use(cors())
app.use(helmet())
app.use(bodyParser.json())
app.use(pino({ logger }))

app.use(router)

app.use(errorHandler)

export default app
