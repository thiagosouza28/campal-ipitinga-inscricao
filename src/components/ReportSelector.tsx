import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileBarChart } from "lucide-react";

export type ReportType = "general" | "church" | "district";

interface ReportSelectorProps {
  onGenerateReport: (type: ReportType, selectedId?: string) => void;
  districts: Array<{ id: string; name: string }>;
  churches: Array<{ id: string; name: string; district_id: string }>;
}

export function ReportSelector({
  onGenerateReport,
  districts,
  churches,
}: ReportSelectorProps) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("general");
  const [selectedId, setSelectedId] = useState<string>("");

  const handleGenerate = () => {
    onGenerateReport(reportType, selectedId || undefined);
    setOpen(false);
    setReportType("general");
    setSelectedId("");
  };

  const getOptions = () => {
    if (reportType === "district") {
      return districts.map((d) => ({ value: d.id, label: d.name }));
    }
    if (reportType === "church") {
      return churches.map((c) => ({
        value: c.id,
        label: `${c.name} (${
          districts.find((d) => d.id === c.district_id)?.name || ""
        })`,
      }));
    }
    return [];
  };

  const needsSelection = reportType !== "general";
  const canGenerate = !needsSelection || selectedId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <FileBarChart className="h-4 w-4" />
          Gerar Relatório
        </Button>
      </DialogTrigger>

      {/* 🔥 Quase colado nas bordas no mobile */}
      <DialogContent className="w-[100%] max-w-[100%] sm:max-w-lg p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle>Gerar Relatório</DialogTitle>
          <DialogDescription>
            Escolha o tipo de relatório que deseja gerar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de relatório */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Relatório</label>
            <Select
              value={reportType}
              onValueChange={(value: ReportType) => {
                setReportType(value);
                setSelectedId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Relatório Geral</SelectItem>
                <SelectItem value="district">Por Distrito</SelectItem>
                <SelectItem value="church">Por Igreja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção dinâmica */}
          {needsSelection && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {reportType === "district"
                  ? "Selecionar Distrito"
                  : "Selecionar Igreja"}
              </label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={`Escolha ${
                      reportType === "district" ? "um distrito" : "uma igreja"
                    }`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {getOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botões mais colados */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
