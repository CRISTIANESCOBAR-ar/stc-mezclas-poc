// Bound concurrency avoids serial disk waits without opening the whole folder at once.
export async function scanUsterFiles(entries, { getTestnr, readHeader, onProgress = () => {} }, concurrency = 8) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.kind && entry.kind !== 'file') continue;
    const name = entry.name || '';
    const extension = name.toLowerCase().match(/\.(par|tbl)$/)?.[1];
    const testnr = extension && getTestnr(name);
    if (!testnr) continue;
    if (!groups.has(testnr)) groups.set(testnr, { testnr, imp: null, hasPar: false, hasTbl: false });
    const item = groups.get(testnr);
    item[extension === 'par' ? 'parHandle' : 'tblHandle'] = entry;
    if (extension === 'tbl') item.hasTbl = true;
  }
  const items = [...groups.values()];
  const total = items.filter(item => item.parHandle).length;
  let completed = 0;
  onProgress({ completed, total });
  let cursor = 0;
  const output = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      if (!item.parHandle) continue;
      const file = typeof item.parHandle.getFile === 'function' ? await item.parHandle.getFile() : item.parHandle;
      const header = readHeader(await file.text(), item.parHandle.name);
      onProgress({ completed: ++completed, total });
      if (!header) continue;
      output.push({ ...item, ...header, hasPar: true });
    }
  }));
  return output.sort((a, b) => a.testnr.localeCompare(b.testnr));
}
