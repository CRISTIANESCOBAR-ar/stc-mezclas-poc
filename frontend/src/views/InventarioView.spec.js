import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import InventarioView from './InventarioView.vue'
import { optimizeBlend } from '../../../backend/src/services/blend/optimizer.js'

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({}) } }))

const stock = [
  { PRODUTOR: 'TEST', LOTE: 'heavy', QTDE_ESTOQUE: 4, SALDO_DISPONIVEL: 2, PESO: 1200, STR: 20 },
  { PRODUTOR: 'TEST', LOTE: 'light', QTDE_ESTOQUE: 4, SALDO_DISPONIVEL: 2, PESO: 400, STR: 40 },
]
let wrapper
let calls
let rules

beforeEach(() => {
  localStorage.clear()
  calls = []
  rules = []
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    calls.push({ url, options })
    let data
    if (url === '/api/config/standards') data = { success: true, tolerancias: rules }
    else if (url === '/api/inventory/cotton-bales') data = stock
    else if (url === '/api/inventory/blendomat') {
      const body = JSON.parse(options.body)
      data = optimizeBlend(body.stock, body.rules, body.supervisionSettings, body.blendSize, body.algorithm)
    } else data = []
    return { ok: true, json: async () => data }
  }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

async function mountInventory() {
  wrapper = mount(InventarioView, {
    global: {
      plugins: [createPinia(), createI18n({ legacy: false, locale: 'es', messages: { es: {} }, missingWarn: false, fallbackWarn: false })],
      directives: { tippy: () => {} },
    },
  })
  await flushPromises()
  return wrapper.vm
}

describe('Inventario: ponderación e integridad de lotes', () => {
  it('escala el peso al stock disponible y mantiene el promedio al agrupar', async () => {
    const vm = await mountInventory()
    expect(vm.summaryRow.STR).toBe(25)
    expect(vm.summaryRow.PESO).toBe(800)
    expect(vm.summaryRow.QTDE_ESTOQUE).toBe(4)
    vm.filters.groupSmallLots = true
    await flushPromises()
    expect(vm.summaryRow.STR).toBe(25)
    expect(vm.summaryRow.PESO).toBe(800)
    expect(vm.selectedStockRowsForBlend).toHaveLength(2)
    expect(vm.selectedStockRowsForBlend.map(row => row.PESO).sort((a, b) => a - b)).toEqual([200, 600])
  })

  it('envía lotes individuales y excluye el rechazado del plan real', async () => {
    rules = [{ parametro: 'STR', limite_min_absoluto: 25 }]
    const vm = await mountInventory()
    vm.filters.groupSmallLots = true
    vm.filters.fardos = 2
    vm.supervisionSettings.STR.hardCap = true
    await flushPromises()
    await vm.handleMezclas()
    await flushPromises()
    const posted = JSON.parse(calls.find(call => call.url === '/api/inventory/blendomat').options.body)
    expect(posted.stock).toHaveLength(2)
    expect(posted.stock.map(row => row.LOTE).sort()).toEqual(['heavy', 'light'])
    expect(vm.blendPlan.plan.find(row => row.LOTE === 'heavy').Usados).toBe(0)
    expect(vm.blendPlan.plan.find(row => row.LOTE === 'light').Usados).toBe(2)
  })

  it('pondera las proyecciones y el cálculo inverso por kilogramos', async () => {
    const vm = await mountInventory()
    vm.purchaseProjection.source = 'remanente'
    await flushPromises()
    expect(vm.projectionSourceTableTotals.str).toBe(25)
    expect(vm.averageByQualityForVariable.STR.global).toBe(25)
    // 600 kg at STR 20 plus 200 kg at STR 40 produce STR 25.
    expect(vm.computeRequiredPurchaseValue({ targetValue: 25, existingQty: 600, existingAverage: 20, purchaseQty: 200 })).toBe(40)
    expect(vm.calculateFinalAverageAfterPurchase({ currentAverage: 20, availableQty: 600, buyQty: 200, buyValue: 40 })).toBe(25)
  })
})
