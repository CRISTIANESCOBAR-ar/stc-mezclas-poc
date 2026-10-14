import { requestJson } from './apiClient.js';
/**
 * Data Service - API calls to PostgreSQL backend
 * Base URL: /api (authenticated same-origin transport)
 */

// Data source (always PostgreSQL in this project)
let currentSource = 'postgresql'

export function getDataSource() {
  return currentSource
}

export function setDataSource(source) {
  currentSource = source
  console.log(`Data source: ${currentSource}`)
}

async function fetchJson(endpoint) {
  const data = await requestJson(endpoint)
  return data.rows || data
}

async function postJson(endpoint, body) {
  return requestJson(endpoint, { method: 'POST', body })
}

async function deleteRequest(endpoint) {
  return requestJson(endpoint, { method: 'DELETE' })
}

// =====================
// USTER FUNCTIONS
// =====================

export async function fetchUsterPar() {
  return fetchJson('/uster/par')
}

export async function fetchUsterTbl(testnr = null) {
  return fetchJson(testnr ? `/uster/tbl?testnr=${testnr}` : '/uster/tbl')
}

export async function checkUsterStatus(testnrs) {
  return postJson('/uster/status', { testnrs })
}

export async function uploadUster(par, tbl) {
  return postJson('/uster/upload', { par, tbl })
}

export async function deleteUster(testnr) {
  return deleteRequest(`/uster/delete/${testnr}`)
}

export async function getUsterHusos(testnr) {
  return postJson('/uster/husos', { testnr })
}

// =====================
// TENSORAPID FUNCTIONS
// =====================

export async function fetchTensorapidPar() {
  return fetchJson('/tensorapid/par')
}

export async function fetchTensorapidTbl(testnr = null) {
  return fetchJson(testnr ? `/tensorapid/tbl?testnr=${testnr}` : '/tensorapid/tbl')
}

export async function checkTensorapidStatus(testnrs) {
  return postJson('/tensorapid/status', { testnrs })
}

export async function uploadTensorapid(par, tbl) {
  return postJson('/tensorapid/upload', { par, tbl })
}

export async function deleteTensorapid(testnr) {
  return deleteRequest(`/tensorapid/delete/${testnr}`)
}

// =====================
// CALIDAD FIBRA FUNCTIONS
// =====================

export async function fetchCalidadFibra() {
  return fetchJson('/calidad-fibra')
}

// =====================
// COMBINED FUNCTIONS
// =====================

export async function fetchAllStatsData() {
  const [usterPar, usterTbl, tensorapidPar, tensorapidTbl, calidadFibra] = await Promise.all([
    fetchUsterPar(),
    fetchUsterTbl(),
    fetchTensorapidPar(),
    fetchTensorapidTbl(),
    fetchCalidadFibra()
  ])
  return { usterPar, usterTbl, tensorapidPar, tensorapidTbl, calidadFibra, source: currentSource }
}

export default {
  getDataSource,
  setDataSource,
  fetchUsterPar,
  fetchUsterTbl,
  fetchTensorapidPar,
  fetchTensorapidTbl,
  checkUsterStatus,
  checkTensorapidStatus,
  uploadUster,
  uploadTensorapid,
  deleteUster,
  deleteTensorapid,
  getUsterHusos,
  fetchCalidadFibra,
  fetchAllStatsData
}
