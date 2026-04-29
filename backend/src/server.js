import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import inventoryRoutes from './routes/inventoryRoutes.js'
import standardsRoutes from './routes/standardsRoutes.js'
import hviRoutes from './routes/hviRoutes.js'
import oeRoutes from './routes/oeRoutes.js'
import usterRoutes from './routes/usterRoutes.js'
import tensorapidRoutes from './routes/tensorapidRoutes.js'
import usterCardasRoutes from './routes/usterCardasRoutes.js'
import calidadFibraRoutes from './routes/calidadFibraRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'

const app = express()
const PORT = process.env.PORT || 3006

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Endpoints mínimos de la PoC
app.use('/api/inventory', inventoryRoutes)
app.use('/api/config', standardsRoutes)
app.use('/api/hvi', hviRoutes)
app.use('/api/oe', oeRoutes)
app.use('/api/uster', usterRoutes)
app.use('/api/tensorapid', tensorapidRoutes)
app.use('/api/uster-cardas', usterCardasRoutes)
app.use('/api/calidad-fibra', calidadFibraRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ PoC Backend corriendo en puerto ${PORT}`)
})
