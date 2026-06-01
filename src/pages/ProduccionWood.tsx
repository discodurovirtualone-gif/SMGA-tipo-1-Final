import { useMemo } from "react";
import FormLayout from "@/components/FormLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGanaderia, calcWood } from "@/context/GanaderiaContext";
import { useAjustes } from "@/context/AjustesContext";
import PdfReportButton from "@/components/PdfReportButton";

const DIAS = [30, 120, 210, 270] as const;

// --- Cálculo auxiliar: integral numérica de la curva de Wood (día 1 a maxDay)
const calcWoodAccum = (potencial: number, maxDay: number): number => {
  let total = 0;
  for (let d = 1; d <= maxDay; d++) {
    total += calcWood(potencial, d);
  }
  return total;
};

// --- Cálculo: producción acumulada Ya y último día n y producción diaria Yn
const calcYaFromControls = (
  reales: number[],
  dias: readonly number[]
): { ya: number; n: number; yn: number; lastIdx: number } => {
  let lastIdx = -1;
  for (let i = reales.length - 1; i >= 0; i--) {
    if (reales[i] > 0) { lastIdx = i; break; }
  }
  if (lastIdx < 0) return { ya: 0, n: 0, yn: 0, lastIdx: -1 };

  // Integración trapezoidal: (0,0) → (d30,P30) → (d120,P120) → ...
  let ya = 0;
  let prevDay = 0;
  let prevProd = 0;
  for (let i = 0; i <= lastIdx; i++) {
    if (reales[i] <= 0) continue;
    ya += ((prevProd + reales[i]) / 2) * (dias[i] - prevDay);
    prevDay = dias[i];
    prevProd = reales[i];
  }
  return { ya, n: dias[lastIdx], yn: reales[lastIdx], lastIdx };
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
      ? DIAS.map((dia, i) => findClosestPotencial(reales[i], dia))
      : DIAS.map(() => parseFloat(vaca.potencial_vaca) || 0);
    const potPromedio = potAsignados.reduce((s, v) => s + v, 0) / potAsignados.length;
    const potencialVaca = parseFloat(vaca.potencial_vaca) || 0;
    const edad = parseInt(vaca.edad) || 0;
    const lactancia = parseInt(vaca.lactancia) || 0;
    const factorResult = findFactor(vaca.raza, edad, lactancia);
    const corregida = potPromedio > 0 ? potPromedio * factorResult.value : null;
    return { id_vaca: vaca.id_vaca, potencialVaca, reales, hasReales, potAsignados, potPromedio, factor: factorResult.value, factorFound: factorResult.found, corregida };
  }), [registrosBasicos, registrosProductivos, POTENCIALES, factores]);

  // ---- MÉTODO INTERPOLACIÓN ----
  const rowsInterp = useMemo(() => registrosBasicos.map((vaca) => {
    const prod = registrosProductivos.find(p => p.id_vaca === vaca.id_vaca);
    const reales = prod
      ? [parseFloat(prod.reg_1_dia30) || 0, parseFloat(prod.reg_2_dia120) || 0, parseFloat(prod.reg_3_dia210) || 0, parseFloat(prod.reg_4_dia270) || 0]
      : [0, 0, 0, 0];

    const potencialVaca = parseFloat(vaca.potencial_vaca) || 0;
    const { ya, n, yn, lastIdx } = calcYaFromControls(reales, DIAS);
    const y305 = potencialVaca > 0 ? calcWoodAccum(potencialVaca, 305) : 0;

    let fpr: number | null = null;
    let p305: number | null = null;

    if (lastIdx >= 0 && yn > 0 && 305 - n > 0 && y305 > ya) {
      fpr = (y305 - ya) / (yn * (305 - n));
      p305 = ya + fpr * yn * (305 - n);
    } else if (n >= 305) {
      // lactancia ya completó 305 días — usar Ya directamente
      p305 = ya;
      fpr = 0;
    }

    const edad = parseInt(vaca.edad) || 0;
    const lactancia = parseInt(vaca.lactancia) || 0;
    const factorResult = findFactor(vaca.raza, edad, lactancia);
    const corregida = p305 !== null ? p305 * factorResult.value : null;

    return { id_vaca: vaca.id_vaca, potencialVaca, reales, ya, n, yn, y305, fpr, p305, factor: factorResult.value, factorFound: factorResult.found, corregida };
  }), [registrosBasicos, registrosProductivos, factores]);

  const isInterp = metodo === "interpolacion";

  return (
    <FormLayout
      title="Producción Estimada a 305 Días"
      helpText="Calcula la producción de leche proyectada a 305 días de lactancia para cada vaca."
      variant="result"
    >
      {/* Badge del método activo */}
      <div className="flex items-center gap-3 mb-4">
        <Badge variant={isInterp ? "default" : "secondary"} className="text-sm px-3 py-1">
          {isInterp ? "Método: Interpolación y Proyección" : "Método: Wood Estándar"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Puede cambiar el método en{" "}
          <a href="/ajustes" className="underline text-primary font-medium">Ajustes del Sistema</a>.
        </span>
      </div>

      {/* Fórmula del método activo */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isInterp ? "Interpolación y Proyección de Lactancia" : "Fórmula de Wood"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInterp ? (
            <div className="space-y-1 text-sm">
              <p><code className="bg-muted px-2 py-0.5 rounded">Ya</code> = Producción acumulada hasta el día n (integración trapezoidal de controles reales)</p>
              <p><code className="bg-muted px-2 py-0.5 rounded">Y305</code> = Producción Wood acumulada hasta día 305 (referencia)</p>
              <p><code className="bg-muted px-2 py-0.5 rounded">FPR = (Y305 − Ya) / (Yn × (305 − n))</code></p>
              <p><code className="bg-muted px-2 py-0.5 rounded">P305 = Ya + FPR × Yn × (305 − n)</code></p>
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
            ? ["Id Vaca", "Ya (kg)", "Día n", "Yn (kg/d)", "Y305 ref", "FPR", "P305", "Factor", "P305 Corr."]
            : ["Id Vaca", "Potencial", "Prom. Pot.", "Factor", "Wood305"]}
          rows={isInterp
            ? rowsInterp.map(r => [
                r.id_vaca,
                r.ya > 0 ? r.ya.toFixed(0) : "—",
                r.n > 0 ? String(r.n) : "—",
                r.yn > 0 ? r.yn.toFixed(1) : "—",
                r.y305 > 0 ? r.y305.toFixed(0) : "—",
                r.fpr !== null ? r.fpr.toFixed(3) : "—",
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
                <TableHead title="Producción diaria al día n">Real D30</TableHead>
                <TableHead>Real D120</TableHead>
                <TableHead>Real D210</TableHead>
                <TableHead>Real D270</TableHead>
                <TableHead title="Producción acumulada hasta el día n (integración trapezoidal)">Ya (kg acum.)</TableHead>
                <TableHead title="Último día con control real">Día n</TableHead>
                <TableHead title="Producción diaria al día n">Yn (kg/día)</TableHead>
                <TableHead title="Producción Wood acumulada a 305 días (referencia)">Y305 ref (kg)</TableHead>
                <TableHead title="Factor de proyección">FPR</TableHead>
                <TableHead title="Producción estimada a 305 días sin corrección">P305 (kg)</TableHead>
                <TableHead>Factor</TableHead>
                <TableHead className="font-bold text-primary">P305 Corr. (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsInterp.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    No hay vacas registradas. Ingrese vacas en Datos de Animales primero.
                  </TableCell>
                </TableRow>
              ) : rowsInterp.map((r) => (
                <TableRow key={r.id_vaca}>
                  <TableCell className="font-medium">{r.id_vaca}</TableCell>
                  {r.reales.map((v, j) => (
                    <TableCell key={j}>{v > 0 ? v.toFixed(1) : "—"}</TableCell>
                  ))}
                  <TableCell className="font-medium">
                    {r.ya > 0 ? r.ya.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </TableCell>
                  <TableCell>{r.n > 0 ? r.n : "—"}</TableCell>
                  <TableCell>{r.yn > 0 ? r.yn.toFixed(1) : "—"}</TableCell>
                  <TableCell>{r.y305 > 0 ? r.y305.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</TableCell>
                  <TableCell className={r.fpr !== null ? "text-blue-700 font-medium" : ""}>
                    {r.fpr !== null ? r.fpr.toFixed(3) : "—"}
                  </TableCell>
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
