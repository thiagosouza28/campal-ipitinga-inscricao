import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Calendar, MapPin, Church, CheckCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDistricts, useChurches } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar"; // Certifique-se de ter um componente de calendário

const formSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  birth_date: z.string()
    .min(1, "Data de nascimento é obrigatória")
    .refine((date) => {
      if (!date) return false;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, "Data inválida"),
  district_id: z.string().min(1, "Distrito é obrigatório"),
  church_id: z.string().min(1, "Igreja é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

export function RegistrationForm() {
  // --- Hooks de dados ---
  const { districts, loading: districtsLoading, error: districtsError } = useDistricts();
  const { churches, loading: churchesLoading, error: churchesError } = useChurches();

  // --- Estados de UI ---
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registrationData, setRegistrationData] = useState<{ name: string; protocol: string } | null>(null);

  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      birth_date: "",
      district_id: "",
      church_id: "",
    },
  });

  const selectedDistrict = form.watch("district_id");
  const filteredChurches = churches.filter(ch => ch.district_id === selectedDistrict);

  // --- Funções utilitárias ---
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateString = (value: string) => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const parseDateToISO = (dateString: string) => {
    if (!dateString) return "";
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateString;
  };

  const generateQRCodeImage = async (token: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(token);
      return qrDataUrl;
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      return '';
    }
  };

  const generateReceipt = async (
    data: FormData,
    registrationId: string,
    age: number,
    checkin_token: string
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Cores
    const primary = [197, 71, 52];
    const accent = [52, 71, 197];

    // Cabeçalho estilizado
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("CAMPAL 2025 - IPITINGA", pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(13);
    doc.text("FORTES NA PALAVRA", pageWidth / 2, 22, { align: "center" });

    // Protocolo destacado
    doc.setFontSize(11);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont("helvetica", "bold");
    doc.text(
      `PROTOCOLO: ${registrationId.substring(0, 8).toUpperCase()}`,
      pageWidth / 2,
      36,
      { align: "center" }
    );

    // Linha divisória
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.7);
    doc.line(15, 40, pageWidth - 15, 40);

    // Dados do participante
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let y = 48;
    const district = districts.find((d) => d.id === data.district_id);
    const church = churches.find((c) => c.id === data.church_id);

    const details = [
      `Nome: ${data.full_name}`,
      `Nascimento: ${data.birth_date.split("-").reverse().join("/")}`,
      `Idade: ${age} anos`,
      `Distrito: ${district?.name || "N/A"}`,
      `Igreja: ${church?.name || "N/A"}`,
      `Valor: ${age <= 10 ? "GRATUITO (até 10 anos)" : "R$ 10,00"}`,
      `Inscrição: ${new Date().toLocaleDateString("pt-BR")}`,
    ];

    details.forEach((detail) => {
      doc.text(detail, 20, y);
      y += 8;
    });

    // QR Code centralizado
    const qrUrl = await generateQRCodeImage(checkin_token);
    if (qrUrl) {
      doc.addImage(qrUrl, "PNG", pageWidth / 2 - 20, y + 5, 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(accent[0], accent[1], accent[2]);
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

    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Informações do evento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text("INFORMAÇÕES DO EVENTO", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    [
      "Data: 26, 27 e 28 de Setembro de 2025",
      "Local: CATRE IPITINGA",
      "Tema: FORTES NA PALAVRA",
      "Pagamento até 15/09/2025",
      "Pix: (91) 99332-0376 - Thiago de Souza Teles",
      "Banco: PagSeguro",
      "Envie comprovante: (91) 98200-5371",
      "Crianças até 10 anos não pagam",
    ].forEach((info) => {
      doc.text(info, 20, y);
      y += 7;
    });

    // Observações importantes
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text("OBSERVAÇÕES IMPORTANTES", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    [
      "Mantenha este comprovante para apresentação no evento.",
      "Pagamento pode ser feito via PIX ou dinheiro.",
      "Em caso de dúvidas, entre em contato pelo WhatsApp (91) 98200-5371 - Thiago Teles.",
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

    const fileName = `campal-2025-inscricao-${data.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    doc.save(fileName);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const checkin_token = crypto.randomUUID();
      const isoBirthDate = parseDateToISO(data.birth_date);
      const age = calculateAge(isoBirthDate);

      const { data: result, error } = await supabase
        .from('registrations')
        .insert({
          full_name: data.full_name,
          birth_date: isoBirthDate,
          age,
          district_id: data.district_id,
          church_id: data.church_id,
          checkin_token
        })
        .select()
        .single();

      if (error) throw error;
      if (result) {
        await generateReceipt({ ...data, birth_date: isoBirthDate }, result.id, age, checkin_token);
        setRegistrationData({ name: data.full_name, protocol: result.id.substring(0, 8).toUpperCase() });
        form.reset(); // Limpa todos os campos após inscrição
      }
      setShowConfirmation(true);
    } catch (err) {
      console.error("Erro ao registrar no Supabase: ", err);
      toast({
        title: "Erro ao realizar inscrição",
        description: "Tente novamente ou entre em contato com o organizador.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Loading / Error UI ---
  if (districtsLoading || churchesLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-event-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (districtsError || churchesError) {
    return (
      <div className="w-full p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <div className="text-red-600 font-medium">Erro ao carregar dados</div>
          <p className="text-red-500 text-sm">{districtsError?.message || churchesError?.message || "Não foi possível carregar os dados necessários."}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  // --- Renderização principal ---
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-event-primary">CAMPAL 2025 - IPITINGA</h1>
        <div className="text-lg sm:text-xl font-semibold text-event-accent">FORTES NA PALAVRA</div>
        <div className="text-base sm:text-lg">26 a 28 de Setembro de 2025 - CATRE IPITINGA</div>
        <div className="text-sm text-muted-foreground">Inscrições até 15 de setembro</div>
        <div className="text-sm font-medium bg-white/50 py-1 px-3 rounded-full inline-block">Valor: R$ 10,00 (Até 10 anos não paga)</div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome */}
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Nome Completo</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Digite seu nome completo" className="h-12 bg-white/70 border-0 focus:bg-white" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Data de Nascimento */}
          <FormField control={form.control} name="birth_date" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-base font-medium">
                <Calendar className="h-4 w-4" /> Data de Nascimento
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="DD/MM/AAAA"
                  className="h-12 bg-white/70 border-0 focus:bg-white"
                  value={field.value
                    ? (() => {
                        if (field.value.includes('-')) {
                          const [year, month, day] = field.value.split('-');
                          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
                        }
                        return formatDateString(field.value);
                      })()
                    : ''}
                  onChange={(e) => {
                    const formatted = formatDateString(e.target.value);
                    field.onChange(formatted.length === 10 ? parseDateToISO(formatted) : formatted);
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="\d{2}/\d{2}/\d{4}"
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Distrito e Igreja */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Distrito */}
            <FormField control={form.control} name="district_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-medium"><MapPin className="h-4 w-4" /> Distrito</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 bg-white/70 border-0 focus:bg-white">
                      <SelectValue placeholder="Selecione o distrito" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Igreja */}
            <FormField control={form.control} name="church_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-medium"><Church className="h-4 w-4" /> Igreja</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedDistrict} // Só habilita se distrito selecionado
                >
                  <FormControl>
                    <SelectTrigger className="h-12 bg-white/70 border-0 focus:bg-white">
                      <SelectValue placeholder={selectedDistrict ? "Selecione a igreja" : "Selecione o distrito primeiro"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredChurches.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Botão enviar */}
          <Button type="submit" className="w-full h-12 bg-event-primary hover:bg-event-primary-dark text-white font-semibold" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Realizar Inscrição'}
          </Button>
        </form>
      </Form>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inscrição Concluída</DialogTitle>
            <DialogDescription>
              A inscrição de <strong>{registrationData?.name}</strong> foi realizada com sucesso!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowConfirmation(false)} className="mr-2">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

