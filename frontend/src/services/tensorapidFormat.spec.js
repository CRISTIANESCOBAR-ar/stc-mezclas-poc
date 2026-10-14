import { expect,it } from 'vitest';
import { formatStoredSpindle } from './tensorapidFormat.js';
it.each([[2,'02/5','2/5'],[42,'42/5','42/5'],[42,5,'42/5'],[42,'5','42/5'],[42,null,'42/']])('admite datos históricos y nuevos sin duplicar el huso (%s, %s)',(huso,count,expected)=>{
  expect(formatStoredSpindle(huso,count)).toBe(expected);
});
