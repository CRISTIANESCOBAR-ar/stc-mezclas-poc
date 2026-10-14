// Compare spindle identity AND order; never merge titles by array position alone.
export function restoreSavedUster(localRows, savedRows) {
  if (!localRows.length || localRows.length !== savedRows.length ||
      localRows.some((row, i) => Number(row.NO) !== Number(savedRows[i].NO_))) {
    throw new Error('Los husos del TBL no coinciden con el ensayo guardado. No se permite guardar hasta revisar los archivos.');
  }
  const fields = {
    'U%_%': 'U_PERCENT', 'CVM_%': 'CVM_PERCENT', 'INDICE_%': 'INDICE_PERCENT',
    'CVM_1M_%': 'CVM_1M_PERCENT', 'CVM_3M_%': 'CVM_3M_PERCENT', 'CVM_10M_%': 'CVM_10M_PERCENT',
    TITULO: 'TITULO', 'TITULO_REL_±_%': 'TITULO_REL_PERC',
    H: 'H', SH: 'SH', SH_1M: 'SH_1M', SH_3M: 'SH_3M', SH_10M: 'SH_10M',
    'DELG_-30%_KM': 'DELG_MINUS30_KM', 'DELG_-40%_KM': 'DELG_MINUS40_KM',
    'DELG_-50%_KM': 'DELG_MINUS50_KM', 'DELG_-60%_KM': 'DELG_MINUS60_KM',
    'GRUE_35%_KM': 'GRUE_35_KM', 'GRUE_50%_KM': 'GRUE_50_KM',
    'GRUE_70%_KM': 'GRUE_70_KM', 'GRUE_100%_KM': 'GRUE_100_KM',
    'NEPS_140%_KM': 'NEPS_140_KM', 'NEPS_200%_KM': 'NEPS_200_KM',
    'NEPS_280%_KM': 'NEPS_280_KM', 'NEPS_400%_KM': 'NEPS_400_KM',
  };
  return localRows.map((row, i) => {
    const restored = { ...row };
    for (const [local, remote] of Object.entries(fields)) restored[local] = savedRows[i][remote] ?? '';
    return restored;
  });
}
