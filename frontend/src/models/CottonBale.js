import { optionalNumber, baleWeight } from '../../../shared/numbers.js';

export class CottonBale {
  /**
   * @param {Object} data - Datos iniciales basados en tb_est_mp
   */
  constructor(data = {}) {
    // Helper para parsear números locales (ej: "1.234,56" -> 1234.56)
    const parseLocalNum = optionalNumber;

    // Mapeo flexible de propiedades (DB keys pueden variar en formato)
    const getVal = (keys) => {
      // Intentamos obtener el valor por cada key posible
      for (const k of keys) {
        if (data[k] !== undefined) return data[k];
      }
      return undefined;
    };

    this.PRODUTOR = getVal(['PRODUTOR', 'productor']) || '';
    this.DESTINO = getVal(['DESTINO', 'destino']) || '';
    this.LOTE = getVal(['LOTE', 'lote']) || '';
    this.TAM = getVal(['TAM', 'tam']) || '';
    this.TP = getVal(['TP', 'tp']) || '';
    this.CLASSIF = getVal(['CLASSIF', 'classif']) || '';
    this.COR = getVal(['COR', 'cor']) || '';
    
    // Mapeo especifico para claves con espacios o variantes
    this.QTDE_ESTOQUE = parseLocalNum(getVal(['QTDE ESTOQUE', 'QTDE_ESTOQUE', 'qtde_estoque']));
    // Saldo de fardos disponibles de la última mezcla optimizada (columna "SALDO DISPONIVEL" en tb_est_mp)
    this.SALDO_DISPONIVEL = parseLocalNum(getVal(['SALDO DISPONIVEL', 'SALDO_DISPONIVEL', 'saldo_disponivel']));
    
    // Propiedades numéricas de calidad
    this.SCI = parseLocalNum(getVal(['SCI', 'sci']));
    this.MST = parseLocalNum(getVal(['MST', 'mst']));
    this.MIC = parseLocalNum(getVal(['MIC', 'mic']));
    this.MAT = parseLocalNum(getVal(['MAT', 'mat']));
    this.UHML = parseLocalNum(getVal(['UHML', 'uhml']));
    this.UI = parseLocalNum(getVal(['UI', 'ui']));
    this.SF = parseLocalNum(getVal(['SF', 'sf']));
    this.STR = parseLocalNum(getVal(['STR', 'str']));
    this.ELG = parseLocalNum(getVal(['ELG', 'elg']));
    this.RD = parseLocalNum(getVal(['RD', 'rd']));
    this.PLUS_B = parseLocalNum(getVal(['+b', 'PLUS_B', 'plus_b'])); 

    this.TIPO = getVal(['TIPO', 'tipo']) || '';
    this.TrCNT = parseLocalNum(getVal(['TrCNT', 'trcnt']));
    this.TrAR = parseLocalNum(getVal(['TrAR', 'trar']));
    this.TRID = parseLocalNum(getVal(['TRID', 'trid']));
    this.PESO = parseLocalNum(getVal(['PESO', 'peso']));
    this.PESO_MEDIO = parseLocalNum(getVal(['PESO_MEDIO', 'PESO MEDIO', 'peso_medio']));
    this.PESO_MEDIO = baleWeight(this);
    this.CORTEZA = parseLocalNum(getVal(['CORTEZA', 'corteza']));
  }

  // Método opcional para validación o formateo extra si fuera necesario
}
