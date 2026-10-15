import Swal from 'sweetalert2';

let pending;
export async function confirmDiscard(message) {
  if (!pending) {
    pending = Swal.fire({
      icon: 'warning',
      title: 'Cambios sin guardar',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Descartar cambios',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
      allowEnterKey: false,
    }).then(result => result.isConfirmed === true).finally(() => { pending = undefined; });
  }
  return pending;
}
