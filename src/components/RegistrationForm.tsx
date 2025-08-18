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
    if (!value) return "";
    let numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
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

  const generateReceipt = async (data: FormData, registrationId: string, age: number, checkin_token: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Cabeçalho
    doc.setFillColor(197, 71, 52);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CAMPAL 2025 - IPITINGA', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('FORTES NA PALAVRA', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.text('COMPROVANTE DE INSCRIÇÃO', pageWidth / 2, 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Dados da inscrição
    const district = districts.find(d => d.id === data.district_id);
    const church = churches.find(c => c.id === data.church_id);
    const details = [
      `Nome: ${data.full_name}`,
      `Data de Nascimento: ${data.birth_date.split('-').reverse().join('/')}`,
      `Idade: ${age} anos`,
      `Distrito: ${district?.name || 'N/A'}`,
      `Igreja: ${church?.name || 'N/A'}`,
      `Valor: ${age <= 10 ? 'GRATUITO (até 10 anos)' : 'R$ 10,00'}`,
      `Data de Inscrição: ${new Date().toLocaleDateString('pt-BR')}`,
      `Protocolo: ${registrationId.substring(0, 8).toUpperCase()}`,
    ];

    let yPosition = 60;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA INSCRIÇÃO', 20, yPosition - 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    details.forEach(detail => {
      doc.text(detail, 20, yPosition);
      yPosition += 8;
    });

    // Informações do evento
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO EVENTO', 20, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    const eventDetails = [
      'Data: 26, 27 e 28 de Setembro de 2025',
      'Local: CATRE IPITINGA',
      'Tema: FORTES NA PALAVRA',
      'Prazo para pagamento: até 15 de setembro de 2025'
    ];
    eventDetails.forEach(detail => {
      doc.text(detail, 20, yPosition);
      yPosition += 8;
    });

    // Observações importantes
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES IMPORTANTES', 20, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    const notes = [
      '🌟 Convite para o CAMPAL IPITINGA 2025! 🌟',
      '📍 Local: CATRE IPITINGA',
      '📅 Datas: 26, 27 e 28 de setembro',
      '💵 Valor da inscrição: R$ 10,00 (para participantes acima de 10 anos)',
      '⏰ Prazo para pagamento: até 15 de setembro',
      '🔗 Link de inscrição: https://campal-ipitinga.vercel.app/inscricao',
      '💰 Pagamento via Pix:',
      '   - Chave: (91) 99332-0376',
      '   - Nome: Thiago de Souza Teles',
      '   - Banco: PagSeguro',
      '📲 Envie o comprovante pelo WhatsApp: https://wa.me/5591982005371?text=Olá%2C%20estou%20enviando%20o%20comprovante%20da%20minha%20inscrição%20para%20o%20CAMPAL%20IPITINGA%202025',
      '✨ Garanta já sua inscrição e venha viver momentos incríveis conosco!',
      '• Mantenha este comprovante para apresentação no evento',
      '• Crianças até 10 anos não pagam inscrição',
      '• Pagamento pode ser feito via PIX ou dinheiro',
      '• Em caso de dúvidas, entre em contato pelo WhatsApp',
      '  (91) 98200-5371 - Thiago Teles'
    ];
    notes.forEach(note => {
      doc.text(note, 20, yPosition);
      yPosition += 8;
    });

    // QR Code
    const qrUrl = await generateQRCodeImage(checkin_token);
    if (qrUrl) {
      doc.addImage(qrUrl, 'PNG', pageWidth - 60, yPosition + 10, 40, 40);
      doc.setFontSize(10);
      doc.text('Use este QR Code para fazer check-in no evento', pageWidth - 40, yPosition + 55, { align: 'center' });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Comprovante gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

    const fileName = `campal-2025-inscricao-${data.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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
                <div className="relative">
                  <Input
                    placeholder="DD/MM/AAAA"
                    className="h-12 bg-white/70 border-0 focus:bg-white pr-12"
                    value={field.value ? format(new Date(field.value), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                    onChange={(e) => {
                      const formatted = formatDateString(e.target.value);
                      e.target.value = formatted;
                      if (formatted.length === 10) field.onChange(parseDateToISO(formatted));
                      else field.onChange("");
                    }}
                    onBlur={field.onBlur}
                    maxLength={10}
                    inputMode="numeric"
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                    <Input
                      type="date"
                      className="absolute opacity-0 w-10 cursor-pointer"
                      value={field.value || ''}
                      onChange={(e) => { if (e.target.value) field.onChange(e.target.value); }}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <Calendar className="h-5 w-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 bg-white/70 border-0 focus:bg-white">
                      <SelectValue placeholder="Selecione a igreja" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredChurches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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

