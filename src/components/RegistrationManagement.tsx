import { useState, useEffect } from "react";
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
import { X, FileText, Pencil, Trash2, Ban, Clock, CheckCircle, Search } from "lucide-react";
import { useRegistrations, useDistricts, useChurches } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Registration } from "@/types/database";
import { PasswordDialog } from "@/components/PasswordDialog";
import { ReportSelector, ReportType } from "@/components/ReportSelector";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface RegistrationsHook {
  registrations: Registration[];
  loading: boolean;
  mutate: () => Promise<void>;
}

export function RegistrationManagement() {
  const { registrations = [], loading, mutate } =
    (useRegistrations() as RegistrationsHook) || { registrations: [], loading: false, mutate: async () => { } };
  const { districts = [] } = useDistricts() || {};
  const { churches = [] } = useChurches() || {};

  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [churchFilter, setChurchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState(""); // Novo filtro de método
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    action: () => void;
    title: string;
    description: string;
  }>({
    open: false,
    action: () => { },
    title: "",
    description: "",
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; registration?: Registration }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; registration?: Registration }>({ open: false });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; registration?: Registration }>({ open: false });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; registration?: Registration }>({ open: false });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (historyDialog.open && historyDialog.registration?.id) {
      supabase
        .from("registration_history")
        .select("*")
        .eq("registration_id", historyDialog.registration.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setHistory(data || []));
    }
  }, [historyDialog]);

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
    const matchesMethod =
      !methodFilter ||
      methodFilter === "all" ||
      reg.payment_method === methodFilter;

    return matchesSearch && matchesDistrict && matchesChurch && matchesStatus && matchesMethod;
  });

  // Atualizar pagamento
  const updatePaymentStatus = async (
    id: string,
    status: "pending" | "paid",
    method?: "pix" | "dinheiro"
  ) => {
    try {
      // Se for desfazer/cancelar pagamento, volta para pendente e limpa método
      const updateData =
        status === "paid"
          ? { payment_status: "paid", payment_method: method }
          : { payment_status: "pending", payment_method: null };

      const { error } = await supabase
        .from("registrations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Registrar histórico
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      await supabase.from("registration_history").insert({
        registration_id: id,
        action: status === "paid" ? "payment" : "cancel_payment",
        details: { method },
        performed_by: userId,
      });

      toast({
        title: "Status atualizado",
        description: `Pagamento ${status === "paid" ? "confirmado" : "cancelado, marcado como pendente"}.`,
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
    method?: "pix" | "dinheiro"
  ) => {
    const action = () => updatePaymentStatus(id, status, method);
    const title =
      status === "paid" ? "Confirmar Pagamento" : "Cancelar Pagamento";
    const description =
      status === "paid"
        ? `Tem certeza que deseja confirmar o pagamento via ${method?.toUpperCase()}?`
        : "Tem certeza que deseja cancelar este pagamento?";
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
    const pix = reportData.filter((r) => r.payment_method === "pix").length;
    const dinheiro = reportData.filter((r) => r.payment_method === "dinheiro").length;
    const pixValue = reportData.filter((r) => r.payment_method === "pix" && r.payment_status === "paid" && r.age > 10).length * 10;
    const dinheiroValue = reportData.filter((r) => r.payment_method === "dinheiro" && r.payment_status === "paid" && r.age > 10).length * 10;

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
    doc.text(`Pagamentos via PIX: ${pix} (R$ ${pixValue},00)`, 20, 77);
    doc.text(`Pagamentos em Dinheiro: ${dinheiro} (R$ ${dinheiroValue},00)`, 20, 84);
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString("pt-BR")}`, 20, 91);

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
          ? `campal-2025-distrito-${districts.find((d) => d.id === selectedId)?.name
            ?.replace(/\s+/g, "-")
            ?.toLowerCase() || "distrito"
          }-${dateString}.pdf`
          : `campal-2025-igreja-${churches.find((c) => c.id === selectedId)?.name
            ?.replace(/\s+/g, "-")
            ?.toLowerCase() || "igreja"
          }-${dateString}.pdf`;

    doc.save(fileName);
    toast({
      title: "Relatório PDF gerado",
      description: `Relatório ${type === "general"
          ? "geral"
          : type === "district"
            ? "por distrito"
            : "por igreja"
        } com ${total} inscrições baixado com sucesso.`,
    });
  };

  // Função para gerar comprovante estiloso
  const generateReceipt = async (registration: Registration, isPayment: boolean) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const primary: [number, number, number] = [197, 71, 52];
    const accent: [number, number, number] = [52, 71, 197];

    // Cabeçalho
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("CAMPAL 2025 - IPITINGA", pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(13);
    doc.text("FORTES NA PALAVRA", pageWidth / 2, 22, { align: "center" });

    // Título do comprovante
    doc.setFontSize(14);
    doc.setTextColor(...primary);
    doc.setFont("helvetica", "bold");
    doc.text(
      isPayment ? "COMPROVANTE DE PAGAMENTO" : "COMPROVANTE DE INSCRIÇÃO",
      pageWidth / 2,
      38,
      { align: "center" }
    );

    // Linha divisória
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.7);
    doc.line(15, 42, pageWidth - 15, 42);

    // Dados do participante
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.text(`Nome: ${registration.full_name}`, 20, y);
    y += 8;
    doc.text(`Nascimento: ${registration.birth_date.split("-").reverse().join("/")}`, 20, y);
    y += 8;
    doc.text(`Idade: ${registration.age} anos`, 20, y);
    y += 8;
    doc.text(`Distrito: ${registration.district?.name || ""}`, 20, y);
    y += 8;
    doc.text(`Igreja: ${registration.church?.name || ""}`, 20, y);
    y += 8;
    doc.text(
      `Valor: ${registration.age <= 10 ? "GRATUITO (até 10 anos)" : "R$ 10,00"}`,
      20,
      y
    );
    y += 8;
    doc.text(
      `Data de Inscrição: ${new Date(registration.registration_date).toLocaleDateString("pt-BR")}`,
      20,
      y
    );
    y += 8;
    doc.text(
      `Protocolo: ${registration.id.substring(0, 8).toUpperCase()}`,
      20,
      y
    );
    y += 10;

    // Se for comprovante de pagamento
    if (isPayment) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...accent);
      doc.text("Pagamento Confirmado", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      y += 8;
      doc.text(
        `Método: ${registration.payment_method === "pix"
          ? "PIX"
          : registration.payment_method === "dinheiro"
            ? "Dinheiro"
            : ""
        }`,
        20,
        y
      );
      y += 8;
      doc.text(
        `Data de Confirmação: ${new Date().toLocaleString("pt-BR")}`,
        20,
        y
      );
      y += 10;
    }

    // QR Code do check-in
    if (registration.checkin_token) {
      const qrUrl = await generateQRCodeImage(registration.checkin_token);
      if (qrUrl) {
        doc.addImage(qrUrl, "PNG", pageWidth / 2 - 20, y + 5, 40, 40);
        doc.setFontSize(10);
        doc.setTextColor(...accent);
        doc.text(
          "Apresente este QR Code para check-in",
          pageWidth / 2,
          y + 48,
          { align: "center" }
        );
        y += 55;
      } else {
        y += 10;
      }
    }

    // Observações
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text("OBSERVAÇÕES IMPORTANTES", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    [
      "Mantenha este comprovante para apresentação no evento.",
      "Pagamento pode ser feito via PIX ou dinheiro.",
      "Em caso de dúvidas, entre em contato pelo WhatsApp.",
      "PIX: (91) 99332-0376 - Thiago de Souza Teles",
      "WhatsApp: (91) 98200-5371",
    ].forEach((note) => {
      doc.text(note, 20, y);
      y += 6;
    });

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Comprovante gerado em ${new Date().toLocaleString("pt-BR")}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );

    const fileName = isPayment
      ? `campal-2025-pagamento-${registration.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf`
      : `campal-2025-inscricao-${registration.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    doc.save(fileName);

    toast({
      title: isPayment ? "Comprovante de pagamento gerado" : "Comprovante de inscrição gerado",
      description: `PDF baixado com sucesso.`,
    });
  };

  // Estatísticas
  const stats = {
    total: filteredRegistrations.length,
    paid: filteredRegistrations.filter((r) => r.payment_status === "paid").length,
    pending: filteredRegistrations.filter((r) => r.payment_status === "pending").length,
    free: filteredRegistrations.filter((r) => r.age <= 10).length,
    payable: filteredRegistrations.filter((r) => r.age > 10).length,
    pix: filteredRegistrations.filter((r) => r.payment_method === "pix").length,
    dinheiro: filteredRegistrations.filter((r) => r.payment_method === "dinheiro").length,
    pixValue: filteredRegistrations.filter((r) => r.payment_method === "pix" && r.payment_status === "paid" && r.age > 10).length * 10,
    dinheiroValue: filteredRegistrations.filter((r) => r.payment_method === "dinheiro" && r.payment_status === "paid" && r.age > 10).length * 10,
  };

  // Excluir inscrição
  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta inscrição?")) {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (!error) {
        toast({ title: "Inscrição excluída", description: "A inscrição foi removida." });
        mutate();
      } else {
        toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      }
    }
  };

  // Cancelar inscrição (status)
  const handleCancel = async (id: string) => {
    if (confirm("Deseja cancelar esta inscrição?")) {
      const { error } = await supabase
        .from("registrations")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (!error) {
        // Registrar histórico
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        await supabase.from("registration_history").insert({
          registration_id: id,
          action: "cancelled", // ou "edited", "deleted", "checkin", "payment"
          details: { /* dados relevantes */ },
          performed_by: userId,
        });

        toast({ title: "Inscrição cancelada", description: "Status alterado para cancelado." });
        mutate();
      } else {
        toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
      }
    }
  };

  // Editar inscrição (abra um modal/formulário)
  const openEditDialog = (registration: Registration) => {
    // Implemente um modal para editar os dados e salvar no banco
  };

  // Abrir histórico (abra um modal com o histórico de alterações)
  const openHistoryDialog = (registrationId: string) => {
    // Implemente um modal para mostrar o histórico de alterações da inscrição
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
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Gerenciamento de Inscrições</span>
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
            <Card>
              <CardContent className="pt-6 text-center text-green-600">
                <div className="text-xl font-bold">PIX</div>
                <div className="text-lg">{stats.pix} pagantes</div>
                <div className="text-xs text-muted-foreground">R$ {stats.pixValue},00</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center text-blue-600">
                <div className="text-xl font-bold">Dinheiro</div>
                <div className="text-lg">{stats.dinheiro} pagantes</div>
                <div className="text-xs text-muted-foreground">R$ {stats.dinheiroValue},00</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4 mb-6">
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

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40 lg:w-48">
                <SelectValue placeholder="Método de Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-event-primary">
            <Table className="text-sm font-sans min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden sm:table-cell">Distrito</TableHead>
                  <TableHead className="hidden sm:table-cell">Igreja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
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
                    <TableCell className="hidden sm:table-cell">{registration.district?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{registration.church?.name}</TableCell>
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
                    <TableCell className="hidden sm:table-cell">
                      {new Date(registration.registration_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap justify-center">
                        {/* Confirmar pagamento PIX/Dinheiro */}
                        {registration.payment_status === "pending" ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handlePaymentAction(registration.id, "paid", "pix")}
                              title="Confirmar pagamento PIX"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handlePaymentAction(registration.id, "paid", "dinheiro")}
                              title="Confirmar pagamento Dinheiro"
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            </Button>
                          </>
                        ) : registration.payment_status === "paid" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePaymentAction(registration.id, "pending")}
                            title="Cancelar Pagamento"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {/* Comprovante */}
                        {registration.payment_status === "paid" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => await generateReceipt(registration, false)}
                              title="Comprovante de Inscrição"
                            >
                              <FileText className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => await generateReceipt(registration, true)}
                              title="Comprovante de Pagamento"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          </>
                        )}

                        {/* Editar */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditDialog({ open: true, registration })}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        {/* Excluir */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteDialog({ open: true, registration })}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>

                        {/* Cancelar */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setCancelDialog({ open: true, registration })}
                          title="Cancelar"
                        >
                          <Ban className="w-4 h-4 text-yellow-500" />
                        </Button>

                        {/* Histórico */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setHistoryDialog({ open: true, registration })}
                          title="Histórico"
                        >
                          <Clock className="w-4 h-4 text-blue-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Editar */}
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, registration: editDialog.registration })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Inscrição</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as typeof e.target & {
                nome: { value: string };
                nascimento: { value: string };
                distrito: { value: string };
                igreja: { value: string };
              };
              const dados = {
                full_name: form.nome.value,
                birth_date: form.nascimento.value,
                district_id: form.distrito.value,
                church_id: form.igreja.value,
              };
              const id = editDialog.registration?.id;
              const { data: { user } } = await supabase.auth.getUser();
              const userId = user?.id;
              await supabase
                .from("registrations")
                .update({ ...dados }).eq("id", id);
              await supabase.from("registration_history").insert({
                registration_id: id,
                action: "edited",
                details: { ...dados },
                performed_by: userId,
              });
              setEditDialog({ open: false });
              mutate();
            }}
          >
            <div className="space-y-3">
              <Input
                name="nome"
                defaultValue={editDialog.registration?.full_name}
                placeholder="Nome completo"
                required
              />
              <Input
                name="nascimento"
                type="date"
                defaultValue={editDialog.registration?.birth_date}
                placeholder="Data de nascimento"
                required
              />
              <Select
                name="distrito"
                defaultValue={editDialog.registration?.district_id}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Distrito" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                name="igreja"
                defaultValue={editDialog.registration?.church_id}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Igreja" />
                </SelectTrigger>
                <SelectContent>
                  {churches
                    .filter(c => c.district_id === (editDialog.registration?.district_id || districts[0]?.id))
                    .map((church) => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open, registration: deleteDialog.registration })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Inscrição</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta inscrição?</DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            onClick={async () => {
              await supabase.from("registrations").delete().eq("id", deleteDialog.registration?.id);
              const { data: { user } } = await supabase.auth.getUser();
              const userId = user?.id;
              await supabase.from("registration_history").insert({
                registration_id: deleteDialog.registration?.id,
                action: "deleted",
                details: {},
                performed_by: userId,
              });
              setDeleteDialog({ open: false });
              mutate();
            }}
          >
            Confirmar Exclusão
          </Button>
        </DialogContent>
      </Dialog>

      {/* Cancelar */}
      <Dialog open={cancelDialog.open} onOpenChange={open => setCancelDialog({ open, registration: cancelDialog.registration })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Inscrição</DialogTitle>
            <DialogDescription>Tem certeza que deseja cancelar esta inscrição?</DialogDescription>
          </DialogHeader>
          <Button
            variant="secondary"
            onClick={async () => {
              await handleCancel(cancelDialog.registration?.id);
              setCancelDialog({ open: false });
            }}
          >
            Confirmar Cancelamento
          </Button>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={historyDialog.open} onOpenChange={open => setHistoryDialog({ open, registration: historyDialog.registration })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico da Inscrição</DialogTitle>
          </DialogHeader>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <strong>{h.action}</strong> - {new Date(h.created_at).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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

async function generateQRCodeImage(token: string): Promise<string> {
  try {
    return await QRCode.toDataURL(token);
  } catch {
    return "";
  }
}
