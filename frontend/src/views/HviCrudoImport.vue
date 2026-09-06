<template>
  <div class="p-4 md:p-6 w-full h-full flex flex-col bg-slate-50">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-800 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Carga HVI Crudo
      </h1>
      
      <div class="flex gap-2">
        <button
          @click="$refs.folderInput.click()"
          class="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h3l2 3h9a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Seleccionar Carpeta
        </button>
        <button
          v-if="pendingCount > 0"
          @click="uploadAll"
          :disabled="isUploading"
          class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <span v-if="isUploading">Subiendo...</span>
          <span v-else>Importar Pendientes ({{ pendingCount }})</span>
        </button>
        <input ref="folderInput" type="file" webkitdirectory directory multiple class="hidden" @change="onFolderSelect" />
      </div>
    </div>

    <div class="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div class="overflow-auto flex-1 p-0">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="px-4 py-3 font-semibold">Archivo</th>
              <th class="px-4 py-3 font-semibold text-center">Fardos</th>
              <th class="px-4 py-3 font-semibold text-center">Productor</th>
              <th class="px-4 py-3 font-semibold text-center">Fecha</th>
              <th class="px-4 py-3 font-semibold">Estado / Asociación NFE</th>
              <th class="px-4 py-3 font-semibold text-center">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="file in filesList" :key="file.name" class="hover:bg-slate-50 transition" :class="{'bg-green-50': file.status === 'UPLOADED'}">
              <td class="px-4 py-3 font-medium text-slate-800">{{ file.name }}</td>
              <td class="px-4 py-3 text-center">{{ file.rows.length }}</td>
              <td class="px-4 py-3 text-center">{{ file.inferredProducer || '-' }}</td>
              <td class="px-4 py-3 text-center">{{ file.inferredDate || '-' }}</td>
              <td class="px-4 py-3">
                <div v-if="file.status === 'UPLOADED'" class="text-green-600 font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Importado
                </div>
                <div v-else-if="file.matchType === 'AUTO'" class="text-blue-600 font-medium">
                  Auto-Asociado: NFE #{{ file.selectedNfeId }}
                </div>
                <div v-else class="flex flex-col gap-1">
                  <span class="text-amber-600 font-medium text-xs">Sin match auto. Seleccione NFE:</span>
                  <select v-model="file.selectedNfeId" class="border border-slate-300 rounded px-2 py-1 text-xs w-full max-w-xs focus:ring-1 focus:ring-blue-500">
                    <option :value="null">-- Omitir Asociación (Huérfano) --</option>
                    <option v-for="nfe in nfeList" :key="nfe.ID" :value="nfe.ID">
                      ID:{{ nfe.ID }} | {{ nfe.PRODUTOR }} | {{ nfe.DATA_MOVIMENTO }} | Q:{{ nfe.QTDE }}
                    </option>
                  </select>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  v-if="file.status !== 'UPLOADED'"
                  @click="uploadSingle(file)"
                  class="px-3 py-1 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Subir
                </button>
              </td>
            </tr>
            <tr v-if="filesList.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">
                No hay archivos cargados. Haz clic en "Seleccionar Carpeta".
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { parseHviText } from '../utils/hviParser.js'

const filesList = ref([])
const nfeList = ref([])
const validProducers = ref([])
const isUploading = ref(false)

const pendingCount = computed(() => filesList.value.filter(f => f.status !== 'UPLOADED').length)

onMounted(async () => {
  await fetchNfes()
})

async function fetchNfes() {
  try {
    const res = await fetch('/api/hvi-crudo/nfe-disponibles')
    const json = await res.json()
    if (json.rows) {
      nfeList.value = json.rows
      // Extract unique valid producers for fuzzy matching
      const prods = new Set(json.rows.map(r => String(r.PRODUTOR).trim()))
      validProducers.value = Array.from(prods)
    }
  } catch (err) {
    console.error('Error fetching NFE', err)
  }
}

async function onFolderSelect(e) {
  const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.txt'))
  if (!files.length) return

  const parsedFiles = []
  
  for (const file of files) {
    const text = await file.text()
    const rows = parseHviText(text, validProducers.value, file.name)
    if (rows.length > 0) {
      // Infer common properties for the file from the first row
      const inferredProducer = rows[0].Proveedor
      const inferredDate = rows[0].Fecha
      
      parsedFiles.push({
        name: file.name,
        rows,
        inferredProducer,
        inferredDate,
        status: 'PENDING',
        selectedNfeId: null,
        matchType: 'NONE'
      })
    }
  }

  // Check which are already uploaded
  try {
    const res = await fetch('/api/hvi-crudo/status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ filenames: parsedFiles.map(f => f.name) })
    })
    const json = await res.json()
    const existing = new Set(json.existing || [])
    
    for (const f of parsedFiles) {
      if (existing.has(f.name)) {
        f.status = 'UPLOADED'
      } else {
        // Attempt Auto-Match
        const match = nfeList.value.find(nfe => 
          nfe.PRODUTOR === f.inferredProducer &&
          nfe.DATA_MOVIMENTO === f.inferredDate &&
          Number(nfe.QTDE) === f.rows.length
        )
        if (match) {
          f.selectedNfeId = match.ID
          f.matchType = 'AUTO'
        }
      }
    }
    
    filesList.value = parsedFiles
  } catch (err) {
    console.error('Status check failed', err)
  }
}

async function uploadSingle(file) {
  try {
    const res = await fetch('/api/hvi-crudo/upload', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        filename: file.name,
        data: file.rows,
        calidad_fibra_id: file.selectedNfeId
      })
    })
    if (res.ok) {
      file.status = 'UPLOADED'
    } else {
      const err = await res.json()
      alert('Error: ' + err.error)
    }
  } catch (err) {
    alert('Error subiendo: ' + err.message)
  }
}

async function uploadAll() {
  const pendings = filesList.value.filter(f => f.status !== 'UPLOADED')
  if (!pendings.length) return
  
  isUploading.value = true
  for (const file of pendings) {
    await uploadSingle(file)
  }
  isUploading.value = false
}
</script>
