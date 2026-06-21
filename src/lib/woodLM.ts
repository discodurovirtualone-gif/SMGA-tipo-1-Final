import { levenbergMarquardt } from 'ml-levenberg-marquardt';

export interface WoodFitResult {
  a: number;
  b: number;
  c: number;
  lc305: number;
  r2: number;
  diaPico: number;
  confianza: 'Alta' | 'Media' | 'Estimación aproximada';
  nPuntos: number;
  parametrosLibres: number;
}

/**
 * Integración trapezoidal de la curva Wood Y(d) = a·d^b·e^(-c·d)
 * de día 1 a día 305.
 */
export function integrarWood(a: number, b: number, c: number): number {
  let acum = 0;
  for (let d = 1; d < 305; d++) {
    const y1 = a * Math.pow(d,     b) * Math.exp(-c * d);
    const y2 = a * Math.pow(d + 1, b) * Math.exp(-c * (d + 1));
    acum += (y1 + y2) / 2;
  }
  return acum;
}

/**
 * Calcula R² del ajuste entre produccionReal y la curva (a,b,c).
 */
function calcR2(dias: number[], produccionReal: number[], a: number, b: number, c: number): number {
  if (dias.length < 2) return 0;
  const media = produccionReal.reduce((s, v) => s + v, 0) / produccionReal.length;
  let ssTot = 0, ssRes = 0;
  dias.forEach((d, i) => {
    const yEst = a * Math.pow(d, b) * Math.exp(-c * d);
    ssTot += Math.pow(produccionReal[i] - media, 2);
    ssRes += Math.pow(produccionReal[i] - yEst, 2);
  });
  if (ssTot === 0) return 1;
  return Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}

/**
 * Ajusta la curva de Wood Y(d) = a·d^b·e^(-c·d) a los puntos medidos
 * usando Levenberg-Marquardt. Restringe parámetros según cantidad de puntos.
 *
 * @param dias       Días de lactancia con pesaje real
 * @param produccion Producción real en kg/día para cada día
 * @param raza       'Holstein' | 'Jersey' | otro (afecta estimación inicial)
 */
export function ajustarWoodLM(
  dias: number[],
  produccion: number[],
  raza = 'Holstein'
): WoodFitResult | null {
  if (dias.length === 0 || dias.length !== produccion.length) return null;
  if (produccion.some(v => v <= 0 || isNaN(v))) return null;
  if (dias.some(v => v <= 0 || isNaN(v))) return null;

  const n = dias.length;

  // Parámetros estándar de la curva Wood (base para valores fijos y estimación inicial)
  const b0 = raza === 'Jersey' ? 0.095 : 0.1027;
  const c0 = 0.003;

  // Estimación inicial de 'a' a partir del pesaje más cercano al día 120.
  // Despejamos directamente de Y(dRef) = a · dRef^b · e^(-c·dRef) con b=b0, c=c0.
  let refIdx = 0;
  let minDistRef = Math.abs(dias[0] - 120);
  for (let i = 1; i < n; i++) {
    const d = Math.abs(dias[i] - 120);
    if (d < minDistRef) { minDistRef = d; refIdx = i; }
  }
  const diaRef = dias[refIdx];
  const a0 = produccion[refIdx] / (Math.pow(diaRef, b0) * Math.exp(-c0 * diaRef));

  // Restricciones según cantidad de puntos
  let minValues: number[], maxValues: number[];
  let parametrosLibres: number;

  if (n === 1) {
    // Solo 'a' libre; b y c fijos en valores estándar
    minValues = [0.001, b0, c0];
    maxValues = [100,   b0, c0];
    parametrosLibres = 1;
  } else if (n === 2) {
    // 'a' y 'c' libres; b fijo (forma del pico)
    minValues = [0.001, b0,   0.0001];
    maxValues = [100,   b0,   0.02];
    parametrosLibres = 2;
  } else {
    // 3 o más puntos: los 3 parámetros libres
    minValues = [0.001, 0.01,  0.0001];
    maxValues = [100,   0.5,   0.02];
    parametrosLibres = 3;
  }

  let a = a0, b = b0, c = c0;

  try {
    const options = {
      damping: 1.5,
      maxIterations: 300,
      errorTolerance: 1e-8,
      minValues,
      maxValues,
      initialValues: [a0, b0, c0],
    };

    const resultado = levenbergMarquardt(
      { x: dias, y: produccion },
      ([pa, pb, pc]: number[]) => (d: number) => pa * Math.pow(d, pb) * Math.exp(-pc * d),
      options
    );

    [a, b, c] = resultado.parameterValues;
  } catch {
    // Si L-M falla, usar estimación inicial (curva estándar escalada)
    a = a0; b = b0; c = c0;
  }

  // Clampar al rango válido por seguridad
  a = Math.max(minValues[0], Math.min(maxValues[0], a));
  b = Math.max(minValues[1], Math.min(maxValues[1], b));
  c = Math.max(minValues[2], Math.min(maxValues[2], c));

  // Validación biológica: día del pico = b/c debe estar entre 15 y 120
  const diaPico = b / c;
  if (diaPico < 15 || diaPico > 150) {
    // Curva biológicamente inválida → forzar curva estándar escalada
    b = b0; c = c0;
  }

  const lc305 = integrarWood(a, b, c);
  const r2 = n >= 2 ? calcR2(dias, produccion, a, b, c) : 0;

  let confianza: WoodFitResult['confianza'];
  if (n >= 3 && r2 >= 0.90) confianza = 'Alta';
  else if (n >= 2 && r2 >= 0.70) confianza = 'Media';
  else confianza = 'Estimación aproximada';

  return { a, b, c, lc305, r2, diaPico: b / c, confianza, nPuntos: n, parametrosLibres };
}
