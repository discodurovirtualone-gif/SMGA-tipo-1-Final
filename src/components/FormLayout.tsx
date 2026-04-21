import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

interface FormLayoutProps {
  title: string;
  helpText?: string;
  children: React.ReactNode;
  variant?: "input" | "result";
}

const FormLayout = ({ title, helpText, children, variant = "input" }: FormLayoutProps) => {
  const isResult = variant === "result";

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isResult ? "bg-[hsl(var(--result-bg))]" : "bg-background"}`}>

      {/* Botón volver — fijo, grande, con texto */}
      <Link
        to="/"
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-3 shadow-xl hover:bg-primary/90 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/40"
        style={{ minHeight: '52px' }}
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-base font-bold">Volver al Inicio</span>
      </Link>

      <div className={`mx-auto ${isResult ? "max-w-2xl" : "max-w-5xl"}`}>

        {/* Encabezado de la sección */}
        <div className="mb-8 pb-5 border-b-2 border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">{title}</h1>
          {helpText && (
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">{helpText}</p>
          )}
        </div>

        {children}

      </div>

      {/* Espacio inferior para el botón fijo */}
      <div className="h-20" />
    </div>
  );
};

export default FormLayout;
