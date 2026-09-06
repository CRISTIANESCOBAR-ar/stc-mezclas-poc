import test from 'node:test';
import assert from 'node:assert';
import { 
  levenshteinDistance, 
  fuzzyMatchProducer, 
  parseDateFallback, 
  cleanLote, 
  cleanBaleId, 
  parseHviText 
} from '../../scripts/hvi/parser.mjs';

test('levenshteinDistance', (t) => {
  assert.strictEqual(levenshteinDistance('kitten', 'sitting'), 3);
  assert.strictEqual(levenshteinDistance('snider', 'snaider'), 1);
  assert.strictEqual(levenshteinDistance('caram', 'caramm'), 1);
  assert.strictEqual(levenshteinDistance('abc', 'abc'), 0);
});

test('fuzzyMatchProducer', (t) => {
  const valid = ['SNAIDER', 'CARAM', 'GOBBI', 'REICHERT', 'DON VICTOR'];
  
  assert.strictEqual(fuzzyMatchProducer('SNIDER', valid), 'SNAIDER');
  assert.strictEqual(fuzzyMatchProducer('snaider', valid), 'SNAIDER');
  assert.strictEqual(fuzzyMatchProducer(' CARAN ', valid), 'CARAM');
  assert.strictEqual(fuzzyMatchProducer('DON_VICTOR', valid), 'DON VICTOR');
  assert.strictEqual(fuzzyMatchProducer('UNKNOWN_GUY', valid), 'UNKNOWN_GUY'); // Fallback to raw if too far
});

test('parseDateFallback', (t) => {
  assert.strictEqual(parseDateFallback('23/09/2023'), '2023-09-23', 'Normal DD/MM/YYYY');
  assert.strictEqual(parseDateFallback('23-09-2023'), '2023-09-23', 'Dashes');
  assert.strictEqual(parseDateFallback('23092023'), '2023-09-23', 'No separators');
  assert.strictEqual(parseDateFallback('9/1/2023'), '2023-01-09', 'D/M/YYYY (assuming DD/MM/YYYY)');
  assert.strictEqual(parseDateFallback('invalid date'), null, 'Invalid');
});

test('cleanLote', (t) => {
  assert.strictEqual(cleanLote('lote 1234'), '1234');
  assert.strictEqual(cleanLote('entr. 5678'), '5678');
  assert.strictEqual(cleanLote('LOTE: 99'), '99');
  assert.strictEqual(cleanLote('9012'), '9012');
  assert.strictEqual(cleanLote('abc'), 'abc', 'Fallback to raw if no numbers');
});

test('cleanBaleId', (t) => {
  assert.strictEqual(cleanBaleId('.3708'), '3708');
  assert.strictEqual(cleanBaleId('110.'), '110');
  assert.strictEqual(cleanBaleId(' 456 '), '456');
});

test('parseHviText', (t) => {
  const rawText = `
Fecha	Proveedor	Lote	Bale ID	SCI	Mst	Mic	Mat	UHML	UI	SF	Str	Elg	Rd	+b	Grade	CGrd	TrCnt	TrAr	TrID	Amt
23/09/2023	SNIDER	lote 123	.3708	145	7.5	4.2	0.88	1.15	82.5	8.1	31.5	6.5	75.5	8.5	41-2	21-1	25	0.45	02	0.0
23/09/2023	SNIDER	lote 123	3709.	140	7.2	4.1	0.87	1.12	81.5	8.4	30.5	6.2	74.5	8.2	41-2	21-1	20	0.40	02	0.0
  `;
  
  const valid = ['SNAIDER'];
  const result = parseHviText(rawText, valid);
  
  assert.strictEqual(result.length, 2, 'Should parse 2 valid rows');
  
  const r1 = result[0];
  assert.strictEqual(r1.Fecha, '2023-09-23');
  assert.strictEqual(r1.Proveedor, 'SNAIDER');
  assert.strictEqual(r1.Lote, '123');
  assert.strictEqual(r1.Bale_ID, '3708');
  assert.strictEqual(r1.Tipo, 'MUESTRA', 'Should be MUESTRA because count is 2 (<=25)');
  assert.strictEqual(r1.Grade, undefined, 'Grade should be excluded');
  
  // Checking exact columns order not strictly necessary for JSON, but properties exist
  assert.strictEqual(r1.SCI, 145);
  assert.strictEqual(r1.Mst, 7.5);
  assert.strictEqual(r1.plus_b, 8.5);
});

test('parseHviText large block (ENTRADA)', (t) => {
  // Generate 26 lines to trigger 'ENTRADA'
  let rawText = "Fecha\tProveedor\tLote\tBale ID\tSCI\tMst\tMic\tMat\tUHML\tUI\tSF\tStr\tElg\tRd\t+b\tGrade\tCGrd\tTrCnt\tTrAr\tTrID\tAmt\n";
  for (let i = 0; i < 26; i++) {
    rawText += `23/09/2023\tCARAN\t999\t${i}\t145\t7.5\t4.2\t0.88\t1.15\t82.5\t8.1\t31.5\t6.5\t75.5\t8.5\t41-2\t21-1\t25\t0.45\t02\t0.0\n`;
  }
  
  const valid = ['CARAM'];
  const result = parseHviText(rawText, valid);
  
  assert.strictEqual(result.length, 26, 'Should parse 26 rows');
  assert.strictEqual(result[0].Tipo, 'ENTRADA', 'Should be ENTRADA because count > 25');
  assert.strictEqual(result[0].Proveedor, 'CARAM', 'Fuzzy matched CARAN to CARAM');
});
