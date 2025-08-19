import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { useRegistrations, useDistricts, useChurches } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Registration } from "@/types/database";
import { PasswordDialog } from "@/components/PasswordDialog";
import { ReportSelector, ReportType } from "@/components/ReportSelector";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RegistrationsHook {
  registrations: Registration[];
  loading: boolean;
  mutate: () => Promise<void>;
}

export function RegistrationManagement() {
  const { registrations = [], loading, mutate } =
    (useRegistrations() as RegistrationsHook) || { registrations: [], loading: false, mutate: async () => {} };
  const { districts = [] } = useDistricts() || {};
  const { churches = [] } = useChurches() || {};

  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [churchFilter, setChurchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    action: () => void;
    title: string;
    description: string;
  }>({
    open: false,
    action: () => {},
    title: "",
    description: "",
  });

  // Filtros corrigidos
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = reg.full_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesDistrict =
      !districtFilter ||
      districtFilter === "all" ||
      reg.district_id === districtFilter;
    const matchesChurch =
      !churchFilter ||
      churchFilter === "all" ||
      reg.church_id === churchFilter;
    const matchesStatus =
      !statusFilter ||
      statusFilter === "all" ||
      reg.payment_status === statusFilter;

    return matchesSearch && matchesDistrict && matchesChurch && matchesStatus;
  });

  // Atualizar pagamento
  const updatePaymentStatus = async (
    id: string,
    status: "pending" | "paid",
    method?: "pix" | "cash"
  ) => {
    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          payment_status: status,
          payment_method: status === "paid" ? method : null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Pagamento ${
          status === "paid" ? "confirmado" : "marcado como pendente"
        }.`,
      });
      mutate();
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Confirmar/desfazer pagamento
  const handlePaymentAction = (
    id: string,
    status: "pending" | "paid",
    method?: "pix" | "cash"
  ) => {
    const action = () => updatePaymentStatus(id, status, method);
    const title =
      status === "paid" ? "Confirmar Pagamento" : "Desfazer Pagamento";
    const description =
      status === "paid"
        ? `Tem certeza que deseja confirmar o pagamento via ${method?.toUpperCase()}?`
        : "Tem certeza que deseja desfazer este pagamento?";
    setPasswordDialog({
      open: true,
      action,
      title,
      description,
    });
  };

  // Gerar relatório PDF
  const generateReport = (type: ReportType, selectedId?: string) => {
    let reportData = filteredRegistrations;
    let reportTitle = "CAMPAL 2025 - IPITINGA";
    let reportSubtitle = "Relatório Geral de Inscrições";

    if (type === "district" && selectedId) {
      reportData = filteredRegistrations.filter(
        (r) => r.district_id === selectedId
      );
      const districtName = districts.find((d) => d.id === selectedId)?.name || "";
      reportSubtitle = `Relatório do Distrito: ${districtName}`;
    } else if (type === "church" && selectedId) {
      reportData = filteredRegistrations.filter(
        (r) => r.church_id === selectedId
      );
      const church = churches.find((c) => c.id === selectedId);
      const districtName =
        districts.find((d) => d.id === church?.district_id)?.name || "";
      reportSubtitle = `Relatório da Igreja: ${church?.name || ""} (${districtName})`;
    }

    const total = reportData.length;
    const paid = reportData.filter((r) => r.payment_status === "paid").length;
    const pending = total - paid;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const primary: [number, number, number] = [197, 71, 52];
    const accent: [number, number, number] = [52, 71, 197];

    // Cabeçalho estilizado
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(reportTitle, pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(13);
    doc.text(reportSubtitle, pageWidth / 2, 27, { align: "center" });

    // Linha divisória
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.7);
    doc.line(15, 38, pageWidth - 15, 38);

    // Resumo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text("RESUMO", 20, 48);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de Inscrições: ${total}`, 20, 56);
    doc.text(`Pagamentos Confirmados: ${paid}`, 20, 63);
    doc.text(`Pagamentos Pendentes: ${pending}`, 20, 70);
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString("pt-BR")}`, 20, 77);

    // Tabela estilizada
    if (reportData.length > 0) {
      const tableData = reportData.map((reg) => [
        reg.full_name,
        reg.age.toString(),
        reg.district?.name || "",
        reg.church?.name || "",
        reg.payment_status === "paid" ? "Pago" : "Pendente",
        reg.payment_method ? reg.payment_method.toUpperCase() : "",
        new Date(reg.registration_date).toLocaleDateString("pt-BR"),
      ]);
      autoTable(doc, {
        head: [["Nome", "Idade", "Distrito", "Igreja", "Status", "Método", "Data"]],
        body: tableData,
        startY: 85,
        styles: { fontSize: 10, cellPadding: 3, font: "helvetica" },
        headStyles: {
          fillColor: primary,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 15, right: 15 },
      });

      // Estatísticas por distrito (opcional)
      if (type === "general") {
        const districtStats = districts
          .map((district) => {
            const districtRegs = reportData.filter((r) => r.district_id === district.id);
            return [
              district.name,
              districtRegs.length.toString(),
              districtRegs.filter((r) => r.payment_status === "paid").length.toString(),
              districtRegs.filter((r) => r.payment_status === "pending").length.toString(),
            ];
          })
          .filter(([, total]) => parseInt(total) > 0);

        if (districtStats.length > 0) {
          autoTable(doc, {
            head: [["Distrito", "Total", "Pagos", "Pendentes"]],
            body: districtStats,
            startY: (doc as any).lastAutoTable.finalY + 15,
            styles: { fontSize: 10, cellPadding: 4, font: "helvetica" },
            headStyles: {
              fillColor: accent,
              textColor: [255, 255, 255],
              fontStyle: "bold",
            },
            margin: { left: 15, right: 15 },
          });
        }
      }
    } else {
      doc.setFontSize(14);
      doc.text(
        "Nenhuma inscrição encontrada para os filtros selecionados.",
        pageWidth / 2,
        120,
        { align: "center" }
      );
    }

    // Rodapé estilizado
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8).setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString("pt-BR")}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    const dateString = new Date().toISOString().split("T")[0];
    const fileName =
      type === "general"
        ? `campal-2025-relatorio-geral-${dateString}.pdf`
        : type === "district"
        ? `campal-2025-distrito-${
            districts.find((d) => d.id === selectedId)?.name
              ?.replace(/\s+/g, "-")
              ?.toLowerCase() || "distrito"
          }-${dateString}.pdf`
        : `campal-2025-igreja-${
            churches.find((c) => c.id === selectedId)?.name
              ?.replace(/\s+/g, "-")
              ?.toLowerCase() || "igreja"
          }-${dateString}.pdf`;

    doc.save(fileName);
    toast({
      title: "Relatório PDF gerado",
      description: `Relatório ${
        type === "general"
          ? "geral"
          : type === "district"
          ? "por distrito"
          : "por igreja"
      } com ${total} inscrições baixado com sucesso.`,
    });
  };

  // Estatísticas
  const stats = {
    total: filteredRegistrations.length,
    paid: filteredRegistrations.filter((r) => r.payment_status === "paid").length,
    pending: filteredRegistrations.filter((r) => r.payment_status === "pending").length,
    free: filteredRegistrations.filter((r) => r.age <= 10).length,
    payable: filteredRegistrations.filter((r) => r.age > 10).length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-event-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-blue-300 border-t-transparent animate-spin-slow"></div>
        </div>
        <span className="text-lg font-semibold text-event-primary">Carregando inscrições...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Gerenciamento de Inscrições
            <ReportSelector
              onGenerateReport={generateReport}
              districts={districts}
              churches={churches}
            />
          </CardTitle>
          <CardDescription>
            Gerencie as inscrições do CAMPAL 2025 e confirme pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center text-green-600">
                <div className="text-2xl font-bold">{stats.paid}</div>
                <p className="text-xs text-muted-foreground">Pagos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center text-yellow-600">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center text-blue-600">
                <div className="text-2xl font-bold">{stats.free}</div>
                <p className="text-xs text-muted-foreground">Gratuitos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center text-purple-600">
                <div className="text-2xl font-bold">{stats.payable}</div>
                <p className="text-xs text-muted-foreground">Pagantes</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>

            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48">
                <SelectValue placeholder="Distrito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os distritos</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={churchFilter} onValueChange={setChurchFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48">
                <SelectValue placeholder="Igreja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as igrejas</SelectItem>
                {churches.map((church) => (
                  <SelectItem key={church.id} value={church.id}>
                    {church.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-event-primary">
            <Table className="text-sm font-sans">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead>Igreja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">{registration.full_name}</TableCell>
                    <TableCell>{registration.age}</TableCell>
                    <TableCell>
                      <Badge variant={registration.age <= 10 ? "secondary" : "default"}>
                        {registration.age <= 10 ? "Gratuito" : "R$ 10,00"}
                      </Badge>
                    </TableCell>
                    <TableCell>{registration.district?.name}</TableCell>
                    <TableCell>{registration.church?.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={registration.payment_status === "paid" ? "default" : "secondary"}
                        className="rounded-full px-2 py-1 text-xs"
                      >
                        {registration.payment_status === "paid" ? "Pago" : "Pendente"}
                        {registration.payment_method
                          ? ` (${registration.payment_method.toUpperCase()})`
                          : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(registration.registration_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {registration.age <= 10 ? (
                          <Badge variant="outline" className="text-xs">
                            Gratuito
                          </Badge>
                        ) : registration.payment_status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-full px-3 py-1 text-xs shadow"
                              onClick={() => handlePaymentAction(registration.id, "paid", "pix")}
                            >
                              PIX
                            </Button>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full px-3 py-1 text-xs shadow"
                              onClick={() => handlePaymentAction(registration.id, "paid", "cash")}
                            >
                              Dinheiro
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePaymentAction(registration.id, "pending")}
                            className="text-xs"
                          >
                            <X className="h-3 w-3" />
                            <span className="ml-1">Desfazer</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PasswordDialog
        open={passwordDialog.open}
        onOpenChange={(open) =>
          setPasswordDialog((prev) => ({ ...prev, open }))
        }
        onConfirm={passwordDialog.action}
        title={passwordDialog.title}
        description={passwordDialog.description}
      />
    </div>
  );
}
