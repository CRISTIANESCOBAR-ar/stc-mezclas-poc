import { expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { confirmDiscard } from './confirmDiscard.js';
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

it('solo descarta tras confirmación explícita y protege el ingreso por Enter', async () => {
  Swal.fire.mockResolvedValueOnce({ isDismissed: true });
  expect(await confirmDiscard('Hay cambios sin guardar. ¿Descartarlos?')).toBe(false);
  expect(Swal.fire.mock.calls[0][0]).toMatchObject({
    confirmButtonText: 'Descartar cambios', cancelButtonText: 'Seguir editando', focusCancel: true, allowEnterKey: false,
  });
  Swal.fire.mockResolvedValueOnce({ isConfirmed: true });
  expect(await confirmDiscard('Hay cambios sin guardar. ¿Descartarlos?')).toBe(true);
});
