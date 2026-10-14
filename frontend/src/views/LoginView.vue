<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 p-6">
    <form class="w-full max-w-sm rounded-xl bg-white p-8 shadow" @submit.prevent="submit">
      <h1 class="text-2xl font-semibold text-slate-800">Ingresar a STC</h1>
      <p class="mt-2 mb-6 text-sm text-slate-500">Use su usuario para acceder al inventario, ensayos y reportes.</p>
      <label class="block text-sm font-medium text-slate-700" for="username">Usuario</label>
      <input id="username" v-model="username" autocomplete="username" required maxlength="64" class="mt-1 mb-4 w-full rounded border border-slate-300 p-2" />
      <label class="block text-sm font-medium text-slate-700" for="password">Contraseña</label>
      <input id="password" v-model="password" type="password" autocomplete="current-password" required maxlength="1024" class="mt-1 mb-4 w-full rounded border border-slate-300 p-2" />
      <p v-if="error" role="alert" class="mb-4 text-sm text-red-700">{{ error }}</p>
      <button :disabled="busy" class="w-full rounded bg-indigo-700 p-2 font-medium text-white disabled:opacity-50">{{ busy ? 'Ingresando…' : 'Ingresar' }}</button>
    </form>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../services/authSession.js';
const router = useRouter(), route = useRoute();
const username = ref(''), password = ref(''), error = ref(route.query.unavailable ? 'El servicio no está disponible. Intente nuevamente más tarde.' : ''), busy = ref(false);
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    await login(username.value, password.value);
    const destination = typeof route.query.next === 'string' && route.query.next.startsWith('/') && !route.query.next.startsWith('//') && !route.query.next.includes('\\') ? route.query.next : '/inventario';
    await router.replace(destination);
  } catch (err) { error.value = err.message; }
  finally { password.value = ''; busy.value = false; }
}
</script>
