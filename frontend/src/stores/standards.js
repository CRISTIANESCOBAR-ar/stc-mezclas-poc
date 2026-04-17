import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useStandardsStore = defineStore('standards', () => {
  const versionActual = ref('—');
  const tolerancias   = ref([]);
  const loaded        = ref(false);
  const loading       = ref(false);

  /**
   * Carga las reglas desde la API.
   * Si ya están cargadas no vuelve a hacer fetch (salvo que force=true).
   */
  async function fetch(force = false) {
    if (loaded.value && !force) return;
    loading.value = true;
    try {
      const res  = await globalThis.fetch('/api/config/standards');
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      versionActual.value = data.version_actual || '—';
      tolerancias.value   = data.tolerancias.map(r => ({ ...r }));
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Persiste los cambios en la DB y recarga el estado local.
   */
  async function save() {
    const res  = await globalThis.fetch('/api/config/standards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tolerancias: tolerancias.value })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    // Forzar recarga para que el estado quede sincronizado con DB
    await fetch(true);
    return data.message;
  }

  return { versionActual, tolerancias, loaded, loading, fetch, save };
});
