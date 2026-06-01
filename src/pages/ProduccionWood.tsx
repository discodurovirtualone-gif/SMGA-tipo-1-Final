import { useMemo } from "react";
import FormLayout from "@/components/FormLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGanaderia, calcWood, ControlPunto } from "@/context/GanaderiaContext";
import { useAjustes } from "@/context/AjustesContext";
import PdfReportButton from "@/components/PdfReportButton";

const DIAS_FIJOS = [30, 120, 210, 270] as const;

// Integral numérica de la curva de Wood (día 1 a maxDay)
const calcWoodAccum = (potencial: number, maxDay: number): number => {
  let total = 0;
  for (let d = 1; d <= maxDay; d++) {
    total += calcWood(potencial, d);
  }
  return total;
};

// Producción acumulada por integración trapezoidal sobre controles (día, produccion)
// Asume que en día 0 la producción es 0
const calcYaTrapecio = (controles: ControlPunto[]): number => {
  if (controles.length === 0) return 0;
  const sorted = [...controles].sort((a, b) => a.dia - b.dia);
  let ya = 0;
  let prevDia = 0;
  let prevProd = 0;
  for (const c of sorted) {
    if (c.produccion <= 0) continue;
    ya += ((prevProd + c.produccion) / 2) * (c.dia - prevDia);
    prevDia = c.dia;
    prevProd = c.produccion;
  }
  return ya;
};

// Parsea el JSON de controles_adicionales; devuelve array vacío si falla
const parseControles = (json?: string): ControlPunto[] => {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((c: any) => typeof c.dia === "number" && typeof c.produccion === "number" && c.produccion > 0)
      .sort((a: ControlPunto, b: ControlPunto) => a.dia - b.dia);
  } catch {
    return [];
  }
};

const ProduccionWood = () => {
  const { registrosBasicos, registrosProductivos, factores } = useGanaderia();
  const { ajustes } = useAjustes();
  const metodo = ajustes.metodoWood305;

  const POTENCIALES = useMemo(() => {
    const maxPot = Math.max(
      ...registrosBasicos.map(r => parseFloat(r.potencial_vaca) || 0),
      7000
    );
    const top = Math.ceil(maxPot / 1000) * 1000;
    const range: number[] = [];
    for (let v = 2000; v <= top; v += 1000) range.push(v);
    return range;
  }, [registrosBasicos]);

  const findFactor = (raza: string, edad: number, lactancia: number) => {
    const razaMap: Record<string, string> = { "1": "Holstein", "2": "Jersey" };
    const razaNombre = razaMap[raza] || raza;
    const match = factores.find(f => f.raza === razaNombre && f.edad === edad && f.lactancia === lactancia);
    return match ? { value: match.factor, found: true } : { value: 1, found: false };
  };

  const findClosestPotencial = (prodReal: number, dia: number): number => {
    let closest = POTENCIALES[0];
    let minDiff = Math.abs(calcWood(POTENCIALES[0], dia) - prodReal);
    for (const pot of POTENCIALES) {
      const diff = Math.abs(calcWood(pot, dia) - prodReal);
      if (diff < minDiff) { minDiff = diff; closest = pot; }
    }
    return closest;
  };

  // ---- MÉTODO ACTUAL (Wood estándar) ----
  const rowsActual = useMemo(() => registrosBasicos.map((vaca) => {
    const prod = registrosProductivos.find(p => p.id_vaca === vaca.id_vaca);
    const reales = prod
      ? [parseFloat(prod.reg_1_dia30) || 0, parseFloat(prod.reg_2_dia120) || 0, parseFloat(prod.reg_3_dia210) || 0, parseFloat(prod.reg_4_dia270) || 0]
      : [0, 0, 0, 0];
    const hasReales = prod && reales.some(v => v > 0);
    const potAsignados = hasReales
      ? DIAS_FIJOS.map((dia, i) => findClosestPotencial(reales[i], dia))
      : DIAS_FIJOS.map(() => parseFloat(vaca.potencial_vaca) || 0);
    const potPromedio = potAsignados.reduce((s, v) => s + v, 0) / potAsignados.length;
    const potencialVaca = parseFloat(vaca.potencial_vaca) || 0;
    const edad = parseInt(vaca.edad) || 0;
    const lactancia = parseInt(vaca.lactancia) || 0;
    const factorResult = findFactor(vaca.raza, edad, lactancia);
    const corregida = potPromedio > 0 ? potPromedio * factorResult.value : null;
    return { id_vaca: vaca.id_vaca, potencialVaca, reales, hasReales, potAsignados, potPromedio, factor: factorResult.value, factorFound: factorResult.found, corregida };
  }), [registrosBasicos, registrosProductivos, POTENCIALES, factores]);

  // ---- MÉTODO INTERPOLACIÓN Y PROYECCIÓN ----
  // Algoritmo correcto según planilla:
  //   FPR usa CURVA ESTÁNDAR: ya_std (Wood acum. → n), yn_std (Wood en día n), y305 (Wood acum. → 305)
  //   P305 usa DATOS REALES:  ya_real (trapezoidal de pesajes reales), yn_real (último pesaje real)
  const rowsInterp = useMemo(() => registrosBasicos.map((vaca) => {
    const prod = registrosProductivos.find(p => p.id_vaca === vaca.id_vaca);
    const potencialVaca = parseFloat(vaca.potencial_vaca) || 0;

    // Obtener controles: priorizar controles_adicionales (N pesajes), si no usar los 4 fijos
    let controles: ControlPunto[] = parseControles(prod?.controles_adicionales);
    if (controles.length === 0 && prod) {
      const fijos: ControlPunto[] = [
        { dia: 30, produccion: parseFloat(prod.reg_1_dia30) || 0 },
        { dia: 120, produccion: parseFloat(prod.reg_2_dia120) || 0 },
        { dia: 210, produccion: parseFloat(prod.reg_3_dia210) || 0 },
        { dia: 270, produccion: parseFloat(prod.reg_4_dia270) || 0 },
      ].filter(c => c.produccion > 0);
      controles = fijos;
    }

    const numControles = controles.length;

    if (numControles === 0 || potencialVaca <= 0) {
      const edad = parseInt(vaca.edad) || 0;
      const lactancia = parseInt(vaca.lactancia) || 0;
      const factorResult = findFactor(vaca.raza, edad, lactancia);
      return {
        id_vaca: vaca.id_vaca, potencialVaca, numControles: 0, controles: [],
        ya_std: 0, yn_std: 0, y305: 0, fpr: null,
        ya_real: 0, n: 0, yn_real: 0, p305: null,
        factor: factorResult.value, factorFound: factorResult.found, corregida: null,
      };
    }

    const sorted = [...controles].sort((a, b) => a.dia - b.dia);
    const n = sorted[sorted.length - 1].dia;
    const yn_real = sorted[sorted.length - 1].produccion;

    // Valores de la curva ESTÁNDAR para el FPR
    const ya_std = potencialVaca > 0 ? calcWoodAccum(potencialVaca, n) : 0;
    const yn_std = potencialVaca > 0 ? calcWood(potencialVaca, n) : 0;
    const y305 = potencialVaca > 0 ? calcWoodAccum(potencialVaca, 305) : 0;

    // FPR basado en curva estándar
    let fpr: number | null = null;
    if (yn_std > 0 && 305 - n > 0 && y305 > ya_std) {
      fpr = (y305 - ya_std) / (yn_std * (305 - n));
    }

    // Producción real acumulada para P305
    const ya_real = calcYaTrapecio(sorted);

    let p305: number | null = null;
    if (n >= 305) {
      p305 = ya_real;
    } else if (fpr !== null && yn_real > 0) {
      p305 = ya_real + fpr * yn_real * (305 - n);
    }

    const edad = parseInt(vaca.edad) || 0;
    const lactancia = parseInt(vaca.lactancia) || 0;
    const factorResult = findFactor(vaca.raza, edad, lactancia);
    const corregida = p305 !== null ? p305 * factorResult.value : null;

    return {
      id_vaca: vaca.id_vaca, potencialVaca, numControles, controles: sorted,
      ya_std, yn_std, y305, fpr,
      ya_real, n, yn_real, p305,
      factor: factorResult.value, factorFound: factorResult.found, corregida,
    };
  }), [registrosBasicos, registrosProductivos, factores]);

  const isInterp = metodo === "interpolacion";

  return (
    <FormLayout
      title="Producción Estimada a 305 Días"
      helpText="Calcula la producción de leche proyectada a 305 días de lactancia para cada vaca."
      variant="result"
    >
      <div className="flex items-center gap-3 mb-4">
        <Badge variant={isInterp ? "default" : "secondary"} className="text-sm px-3 py-1">
          {isInterp ? "Método: Interpolación y Proyección" : "Método: Wood Estándar"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Puede cambiar el método en{" "}
          <a href="/ajustes" className="underline text-primary font-medium">Ajustes del Sistema</a>.
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isInterp ? "Interpolación y Proyección de Lactancia" : "Fórmula de Wood"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInterp ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">Factor de Proyección (usa curva estándar Wood):</p>
              <code className="block bg-muted px-3 py-1.5 rounded">
                Ya_std = Σ Wood(potencial, d) para d=1…n &nbsp;|&nbsp; Yn_std = Wood(potencial, n)
              </code>
              <code className="block bg-muted px-3 py-1.5 rounded">
                FPR = (Y305 − Ya_std) / (Yn_std × (305 − n))
              </code>
              <p className="font-medium text-muted-foreground mt-2">Proyección P305 (usa producción real):</p>
              <code className="block bg-muted px-3 py-1.5 rounded">
                Ya_real = integración trapezoidal de pesajes reales hasta día n
              </code>
              <code className="block bg-muted px-3 py-1.5 rounded">
                P305 = Ya_real + FPR × Yn_real × (305 − n)
              </code>
              <p className="text-xs text-muted-foreground mt-1">
                Los pesajes se ingresan en <a href="/productivos" className="underline">Datos Productivos</a> — soporte para hasta 20 controles en días variables.
              </p>
            </div>
          ) : (
            <code className="text-sm bg-muted px-2 py-1 rounded">
              Prod. Potencial = (potencial_vaca × 0.00318) × (día ^ 0.1027) × e^(−0.003 × día)
            </code>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end mb-4">
        <PdfReportButton
          title={`Producción 305 días — ${isInterp ? "Interpolación" : "Wood"}`}
          headers={isInterp
            ? ["Id Vaca", "# Pesajes", "Ya_std (kg)", "Yn_std", "Y305 ref", "FPR", "Ya_real (kg)", "Día n", "Yn_real", "P305 (kg)", "Factor", "P305 Corr."]
            : ["Id Vaca", "Potencial", "Prom. Pot.", "Factor", "Wood305"]}
          rows={isInterp
            ? rowsInterp.map(r => [
                r.id_vaca,
                String(r.numControles),
                r.ya_std > 0 ? r.ya_std.toFixed(0) : "—",
                r.yn_std > 0 ? r.yn_std.toFixed(2) : "—",
                r.y305 > 0 ? r.y305.toFixed(0) : "—",
                r.fpr !== null ? r.fpr.toFixed(4) : "—",
                r.ya_real > 0 ? r.ya_real.toFixed(0) : "—",
                r.n > 0 ? String(r.n) : "—",
                r.yn_real > 0 ? r.yn_real.toFixed(1) : "—",
                r.p305 !== null ? r.p305.toFixed(0) : "—",
                r.factor.toFixed(3),
                r.corregida !== null ? r.corregida.toFixed(0) : "—",
              ])
            : rowsActual.map(r => [r.id_vaca, r.potencialVaca > 0 ? r.potencialVaca.toString() : "—", r.potPromedio > 0 ? r.potPromedio.toFixed(0) : "—", r.factor.toFixed(3), r.corregida !== null ? r.corregida.toFixed(2) : "—"])
          }
        />
      </div>

      {/* -------- TABLA MÉTODO ACTUAL -------- */}
      {!isInterp && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Id Vaca</TableHead>
                <TableHead>Potencial (lt)</TableHead>
                <TableHead>Real D30</TableHead>
                <TableHead>Real D120</TableHead>
                <TableHead>Real D210</TableHead>
                <TableHead>Real D270</TableHead>
                <TableHead>Pot.Asig D30</TableHead>
                <TableHead>Pot.Asig D120</TableHead>
                <TableHead>Pot.Asig D210</TableHead>
                <TableHead>Pot.Asig D270</TableHead>
                <TableHead>Prom. Pot.</TableHead>
                <TableHead>Factor</TableHead>
                <TableHead className="font-bold text-primary">Wood305</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsActual.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    No hay vacas registradas. Ingrese vacas en Datos de Animales primero.
                  </TableCell>
                </TableRow>
              ) : rowsActual.map((r) => (
                <TableRow key={r.id_vaca}>
                  <TableCell className="font-medium">{r.id_vaca}</TableCell>
                  <TableCell>{r.potencialVaca > 0 ? r.potencialVaca.toLocaleString() : "—"}</TableCell>
                  {r.reales.map((v, j) => (
                    <TableCell key={j}>{r.hasReales ? v.toFixed(1) : "—"}</TableCell>
                  ))}
                  {r.potAsignados.map((v, j) => (
                    <TableCell key={`pa${j}`} className="text-primary font-medium">
                      {v > 0 ? v.toLocaleString() : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="font-bold">{r.potPromedio > 0 ? r.potPromedio.toFixed(0) : "—"}</TableCell>
                  <TableCell className={r.factorFound ? "" : "text-destructive font-bold"}>
                    {r.factor.toFixed(3)}{!r.factorFound && <span className="text-xs ml-1">(def)</span>}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {r.corregida !== null ? r.corregida.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* -------- TABLA INTERPOLACIÓN -------- */}
      {isInterp && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Id Vaca</TableHead>
                <TableHead title="Cantidad de pesajes ingresados"># Pesajes</TableHead>
                <TableHead title="Acumulado curva estándar Wood hasta día n — usado en FPR">Ya_std (kg)</TableHead>
                <TableHead title="Curva estándar Wood en día n — usado en FPR">Yn_std (kg/d)</TableHead>
                <TableHead title="Curva estándar Wood acumulada a 305 días">Y305 ref (kg)</TableHead>
                <TableHead title="Factor de Proyección: (Y305 - Ya_std) / (Yn_std × (305-n))">FPR</TableHead>
                <TableHead title="Producción real acumulada por integración trapezoidal hasta día n">Ya_real (kg)</TableHead>
                <TableHead title="Día del último pesaje real">Día n</TableHead>
                <TableHead title="Producción real en el último día de pesaje">Yn_real (kg/d)</TableHead>
                <TableHead title="Ya_real + FPR × Yn_real × (305-n)">P305 (kg)</TableHead>
                <TableHead>Factor</TableHead>
                <TableHead className="font-bold text-primary">P305 Corr. (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsInterp.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    No hay vacas registradas. Ingrese vacas en Datos de Animales primero.
                  </TableCell>
                </TableRow>
              ) : rowsInterp.map((r) => (
                <TableRow key={r.id_vaca}>
                  <TableCell className="font-medium">{r.id_vaca}</TableCell>
                  <TableCell className="text-center">
                    <span className={r.numControles > 0 ? "font-medium text-blue-700" : "text-muted-foreground"}>
                      {r.numControles > 0 ? r.numControles : "—"}
                    </span>
                  </TableCell>
                  <TableCell>{r.ya_std > 0 ? r.ya_std.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</TableCell>
                  <TableCell>{r.yn_std > 0 ? r.yn_std.toFixed(2) : "—"}</TableCell>
                  <TableCell>{r.y305 > 0 ? r.y305.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</TableCell>
                  <TableCell className={r.fpr !== null ? "text-blue-700 font-medium" : ""}>
                    {r.fpr !== null ? r.fpr.toFixed(4) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.ya_real > 0 ? r.ya_real.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </TableCell>
                  <TableCell>{r.n > 0 ? r.n : "—"}</TableCell>
                  <TableCell>{r.yn_real > 0 ? r.yn_real.toFixed(1) : "—"}</TableCell>
                  <TableCell className="font-bold">
                    {r.p305 !== null ? r.p305.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </TableCell>
                  <TableCell className={r.factorFound ? "" : "text-destructive font-bold"}>
                    {r.factor.toFixed(3)}{!r.factorFound && <span className="text-xs ml-1">(def)</span>}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {r.corregida !== null ? r.corregida.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </FormLayout>
  );
};

export default ProduccionWood;
