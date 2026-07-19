import { useState } from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TABLE_ORDER = [
  { key: "basicos",       label: "registros_basicos" },
  { key: "productivos",   label: "registros_productivos" },
  { key: "reproductivos", label: "registros_reproductivos" },
  { key: "otros",         label: "registros_otros" },
  { key: "toros",         label: "toros" },
] as const;

const ExportExcel = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/export");
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();

      const wb = XLSX.utils.book_new();

      for (const { key, label } of TABLE_ORDER) {
        const rows: Record<string, unknown>[] = data[key] ?? [];
        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
        XLSX.utils.book_append_sheet(wb, ws, label);
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `SMGA_export_${timestamp}.xlsx`);
      toast.success("Exportación completada");
    } catch (err) {
      console.error(err);
      toast.error("Error al exportar los datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 w-full justify-start"
      data-testid="button-export-excel"
    >
      <Download className="h-4 w-4 shrink-0" />
      <span>{loading ? "Exportando…" : "Exportar base de datos a Excel"}</span>
    </Button>
  );
};

export default ExportExcel;
