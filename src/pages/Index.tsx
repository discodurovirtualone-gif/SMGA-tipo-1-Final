import { Link } from "react-router-dom";
import {
  Milk, ClipboardList, NotebookPen, FileBarChart, BarChart3,
  LayoutDashboard, BookOpen, Calculator, Heart, Dna, Settings,
  Upload, FileDown
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import BulkUpload from "@/components/BulkUpload";
import PdfDownload from "@/components/PdfDownload";

const inputItems = [
  {
    title: "Datos de Animales",
    subtitle: "Nombre, raza, fecha de nacimiento y potencial",
    description: "Aquí se registra la información básica de cada vaca del rodeo.",
    icon: BookOpen,
    path: "/basicos",
    bg: "bg-[hsl(var(--cat-basico-bg))]",
    border: "border-[hsl(var(--cat-basico-border))]",
    text: "text-[hsl(var(--cat-basico-text))]",
    iconColor: "text-[hsl(var(--cat-basico-icon))]",
    iconBg: "bg-[hsl(var(--cat-basico-border))]/20",
  },
  {
    title: "Datos Reproductivos",
    subtitle: "Partos, servicios, concepción y toro utilizado",
    description: "Registre las fechas de parto, servicios y resultados reproductivos de cada animal.",
    icon: NotebookPen,
    path: "/reproductivos",
    bg: "bg-[hsl(var(--cat-reproductivo-bg))]",
    border: "border-[hsl(var(--cat-reproductivo-border))]",
    text: "text-[hsl(var(--cat-reproductivo-text))]",
    iconColor: "text-[hsl(var(--cat-reproductivo-icon))]",
    iconBg: "bg-[hsl(var(--cat-reproductivo-border))]/20",
  },
  {
    title: "Datos Productivos",
    subtitle: "Producción de leche, porcentaje de grasa y proteína",
    description: "Ingrese los controles de producción de leche registrados durante la lactancia.",
    icon: Milk,
    path: "/productivos",
    bg: "bg-[hsl(var(--cat-productivo-bg))]",
    border: "border-[hsl(var(--cat-productivo-border))]",
    text: "text-[hsl(var(--cat-productivo-text))]",
    iconColor: "text-[hsl(var(--cat-productivo-icon))]",
    iconBg: "bg-[hsl(var(--cat-productivo-border))]/20",
  },
  {
    title: "Datos de Salud y Condición",
    subtitle: "Renguera, mastitis, longevidad y fortaleza de patas",
    description: "Registre puntajes de salud y condición corporal de los animales.",
    icon: ClipboardList,
    path: "/otros",
    bg: "bg-[hsl(var(--cat-otros-bg))]",
    border: "border-[hsl(var(--cat-otros-border))]",
    text: "text-[hsl(var(--cat-otros-text))]",
    iconColor: "text-[hsl(var(--cat-otros-icon))]",
    iconBg: "bg-[hsl(var(--cat-otros-border))]/20",
  },
];

const resultItems = [
  {
    title: "Producción Estimada (Wood 305)",
    subtitle: "Cálculo de producción a 305 días por animal",
    description: "Vea la producción esperada de cada vaca usando la fórmula de Wood.",
    icon: Calculator,
    path: "/produccion-wood",
  },
  {
    title: "Indicadores Reproductivos",
    subtitle: "IIP, IPC, número de servicios y ranking",
    description: "Compare el desempeño reproductivo de sus animales.",
    icon: Heart,
    path: "/indicadores-reproductivos",
  },
  {
    title: "Valor de Cría Genético",
    subtitle: "Valor genético y estimación del valor de las hijas",
    description: "Calcule el valor genético de sus animales y su progenie esperada.",
    icon: Dna,
    path: "/valor-cria",
  },
];

const reporteItems = [
  {
    title: "Reporte de Vacas",
    subtitle: "Resumen e indicadores del rodeo completo",
    description: "Genere un reporte detallado con todos los indicadores de sus vacas.",
    icon: FileBarChart,
    path: "/reporte-vacas",
  },
  {
    title: "Reporte de Toros",
    subtitle: "Índices genéticos y retorno económico por toro",
    description: "Compare toros y calcule el retorno económico esperado de cada uno.",
    icon: BarChart3,
    path: "/reporte-toros",
  },
  {
    title: "Tablero General",
    subtitle: "Vista completa del sistema en un solo lugar",
    description: "Resumen ejecutivo con los principales indicadores del sistema.",
    icon: LayoutDashboard,
    path: "/tablero-final",
  },
];

const SectionLabel = ({ icon, label, color }: { icon: string; label: string; color: string }) => (
  <div className={`flex items-center gap-2 mb-5`}>
    <span className="text-2xl">{icon}</span>
    <span className={`text-base font-bold uppercase tracking-wide ${color}`}>{label}</span>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center p-5 md:p-8 bg-background">

      {/* Encabezado */}
      <div className="text-center mb-10 max-w-2xl w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3 leading-tight">
          🐄 Sistema de Mejora Genética
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          Seleccione una opción para comenzar
        </p>
      </div>

      {/* Carga masiva y PDF */}
      <div className="flex flex-col md:flex-row gap-4 max-w-4xl w-full mb-10">
        <div className="flex-1 flex flex-col gap-2">
          <BulkUpload />
          <p className="text-sm text-muted-foreground px-1">
            Suba un archivo Excel o CSV con todos los datos de sus animales de una sola vez.
          </p>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <PdfDownload />
          <p className="text-sm text-muted-foreground px-1">
            Descargue una planilla en PDF para completar a mano o de forma digital.
          </p>
        </div>
      </div>

      <Separator className="max-w-4xl w-full mb-10 bg-border" />

      {/* Ingreso de información */}
      <div className="max-w-4xl w-full mb-10">
        <SectionLabel icon="📥" label="Ingreso de Información" color="text-foreground" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {inputItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-start gap-5 rounded-2xl border-2 ${item.border} ${item.bg} p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-black/20`}
            >
              <div className={`shrink-0 rounded-xl ${item.iconBg} p-4 mt-1`}>
                <item.icon className={`h-9 w-9 ${item.iconColor}`} />
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-xl font-bold ${item.text}`}>{item.title}</span>
                <span className={`text-base font-semibold ${item.text} opacity-80`}>{item.subtitle}</span>
                <span className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Separator className="max-w-4xl w-full mb-10 bg-border" />

      {/* Resultados */}
      <div className="max-w-4xl w-full mb-10">
        <SectionLabel icon="📊" label="Cálculos y Resultados" color="text-[hsl(var(--cat-resultado-text))]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {resultItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col gap-3 rounded-2xl border-2 border-[hsl(var(--cat-resultado-border))] bg-[hsl(var(--cat-resultado-bg))] p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-[hsl(var(--cat-resultado-border))]/20 p-3">
                  <item.icon className="h-7 w-7 text-[hsl(var(--cat-resultado-icon))]" />
                </div>
                <span className="text-lg font-bold text-[hsl(var(--cat-resultado-text))]">{item.title}</span>
              </div>
              <span className="text-sm font-semibold text-[hsl(var(--cat-resultado-text))] opacity-80">{item.subtitle}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>

      <Separator className="max-w-4xl w-full mb-10 bg-border" />

      {/* Reportes */}
      <div className="max-w-4xl w-full mb-8">
        <SectionLabel icon="📈" label="Reportes y Tablero" color="text-[hsl(var(--cat-reporte-text))]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reporteItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col gap-3 rounded-2xl border-2 border-[hsl(var(--cat-reporte-border))] bg-[hsl(var(--cat-reporte-bg))] p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-black/20"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-[hsl(var(--cat-reporte-border))]/20 p-3">
                  <item.icon className="h-7 w-7 text-[hsl(var(--cat-reporte-icon))]" />
                </div>
                <span className="text-lg font-bold text-[hsl(var(--cat-reporte-text))]">{item.title}</span>
              </div>
              <span className="text-sm font-semibold text-[hsl(var(--cat-reporte-text))] opacity-80">{item.subtitle}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">{item.description}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Ajustes */}
      <div className="max-w-4xl w-full flex justify-end">
        <Link
          to="/ajustes"
          className="inline-flex items-center gap-3 rounded-xl border-2 border-border bg-muted/50 px-5 py-3 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-black/20"
        >
          <div className="rounded-lg bg-muted p-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-foreground">Ajustes del Sistema</p>
            <p className="text-sm text-muted-foreground">Potenciales, heredabilidad y factores de corrección</p>
          </div>
        </Link>
      </div>

    </div>
  );
};

export default Index;
