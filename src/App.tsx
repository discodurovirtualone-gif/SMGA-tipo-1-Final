import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GanaderiaProvider } from "@/context/GanaderiaContext";
import { AjustesProvider } from "@/context/AjustesContext";
import AccessibilityControls from "@/components/AccessibilityControls";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RegistrosBasicos from "./pages/RegistrosBasicos.tsx";
import RegistrosReproductivos from "./pages/RegistrosReproductivos.tsx";
import RegistrosProductivos from "./pages/RegistrosProductivos.tsx";
import RegistrosOtros from "./pages/RegistrosOtros.tsx";
import ReporteVacas from "./pages/ReporteVacas.tsx";
import ReporteToros from "./pages/ReporteToros.tsx";
import TableroFinal from "./pages/TableroFinal.tsx";
import ProduccionWood from "./pages/ProduccionWood.tsx";
import IndicadoresReproductivos from "./pages/IndicadoresReproductivos.tsx";
import ValorCria from "./pages/ValorCria.tsx";
import Ajustes from "./pages/Ajustes.tsx";
import ComparacionNacional from "./pages/ComparacionNacional.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GanaderiaProvider>
        <AjustesProvider>
          <Toaster />
          <Sonner />
          <AccessibilityControls />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/basicos" element={<RegistrosBasicos />} />
              <Route path="/reproductivos" element={<RegistrosReproductivos />} />
              <Route path="/productivos" element={<RegistrosProductivos />} />
              <Route path="/otros" element={<RegistrosOtros />} />
              <Route path="/produccion-wood" element={<ProduccionWood />} />
              <Route path="/reporte-vacas" element={<ReporteVacas />} />
              <Route path="/reporte-toros" element={<ReporteToros />} />
              <Route path="/indicadores-reproductivos" element={<IndicadoresReproductivos />} />
              <Route path="/valor-cria" element={<ValorCria />} />
              <Route path="/tablero-final" element={<TableroFinal />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="/comparacion-nacional" element={<ComparacionNacional />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AjustesProvider>
      </GanaderiaProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
