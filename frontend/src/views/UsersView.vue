<template>
  <section class="mx-auto max-w-4xl p-6">
    <h1 class="mb-2 text-2xl font-semibold">Usuarios y permisos</h1>
    <p class="mb-6 text-sm text-slate-500">Consulta: lectura y cálculos. Operador: también importar ensayos. Administrador: configurar estándares, borrar registros y gestionar usuarios.</p>
    <p v-if="error" role="alert" class="mb-4 text-red-700">{{ error }}</p>
    <form class="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow" @submit.prevent="create">
      <label class="text-sm">Usuario<input v-model="username" required pattern="[a-zA-Z0-9_.-]{3,64}" autocomplete="off" class="mt-1 block rounded border p-2" /></label>
      <label class="text-sm">Contraseña inicial<input v-model="password" required minlength="12" maxlength="1024" type="password" autocomplete="new-password" class="mt-1 block rounded border p-2" /></label>
      <label class="text-sm">Rol<select v-model="role" class="mt-1 block rounded border p-2"><option v-for="value in roles" :key="value">{{ value }}</option></select></label>
      <button :disabled="busy" class="rounded bg-indigo-700 p-2 text-white disabled:opacity-50">Crear usuario</button>
    </form>
    <table class="w-full rounded bg-white text-left text-sm shadow">
      <thead><tr class="border-b"><th class="p-3">Usuario</th><th class="p-3">Rol</th><th class="p-3">Estado</th><th class="p-3">Acciones</th></tr></thead>
      <tbody><tr v-for="user in users" :key="user.id" class="border-b">
        <td class="p-3">{{ user.username }}</td>
        <td class="p-3"><select :value="user.role" :disabled="busy" @change="update(user, { role: $event.target.value })" class="rounded border p-1"><option v-for="value in roles" :key="value">{{ value }}</option></select></td>
        <td class="p-3">{{ user.enabled ? 'Habilitado' : 'Deshabilitado' }}</td>
        <td class="p-3"><button :disabled="busy" @click="update(user, { enabled: !user.enabled })" class="text-indigo-700">{{ user.enabled ? 'Deshabilitar' : 'Habilitar' }}</button></td>
      </tr></tbody>
    </table>
    <form class="mt-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow" @submit.prevent="resetPassword">
      <label class="text-sm">Usuario<select v-model="resetId" required class="mt-1 block rounded border p-2"><option disabled value="">Seleccionar</option><option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }}</option></select></label>
      <label class="text-sm">Nueva contraseña<input v-model="newPassword" type="password" required minlength="12" maxlength="1024" autocomplete="new-password" class="mt-1 block rounded border p-2" /></label>
      <button :disabled="busy" class="rounded bg-slate-700 p-2 text-white disabled:opacity-50">Restablecer contraseña</button>
    </form>
    <p class="mt-3 text-sm text-slate-500">Cambiar un rol, contraseña o estado cierra las sesiones de ese usuario.</p>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch, authState, clearAuth } from '../services/authSession.js';
import { useRouter } from 'vue-router';
const users = ref([]), error = ref(''), busy = ref(false), username = ref(''), password = ref(''), role = ref('consulta'), resetId = ref(''), newPassword = ref('');
const roles = ['consulta', 'operador', 'administrador'];
const router = useRouter();
async function load() {
  const response = await apiFetch('/api/auth/users');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  users.value = data.users;
}
async function change(url, method, payload) {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const response = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (method === 'PATCH' && String(data.user.id) === String(authState.user?.id)) { clearAuth(); await router.replace('/ingresar'); }
    else await load();
  } catch (err) { error.value = err.message; await load().catch(() => {}); }
  finally { password.value = ''; newPassword.value = ''; busy.value = false; }
}
function create() { return change('/api/auth/users', 'POST', { username: username.value, password: password.value, role: role.value }); }
function update(user, changes) { return change(`/api/auth/users/${user.id}`, 'PATCH', changes); }
function resetPassword() { return change(`/api/auth/users/${resetId.value}`, 'PATCH', { password: newPassword.value }); }
onMounted(() => load().catch(err => { error.value = err.message; }));
</script>
