import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import inventoryRoutes from './routes/inventoryRoutes.js'
import standardsRoutes from './routes/standardsRoutes.js'

const app = express()
const PORT = process.env.PORT || 3005

app.use(cors())
app.use(express.json())

// Endpoints mínimos de la PoC
app.use('/api/inventory', inventoryRoutes)
app.use('/api/config', standardsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`✓ PoC Backend corriendo en puerto ${PORT}`)
})
