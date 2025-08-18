import { useState } from "react";
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
import { Check, ChevronsUpDown, Calendar, MapPin, Church } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDistricts, useChurches } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, Download } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    name: string;
    protocol: string;
  } | null>(null);
  const { districts } = useDistricts();
  const { churches } = useChurches();
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
  const filteredChurches = churches.filter(church => church.district_id === selectedDistrict);

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

  const generateReceipt = (registrationData: FormData, registrationId: string, age: number) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header with event branding
    doc.setFillColor(197, 71, 52); // event-primary color
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
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    
    // Registration details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA INSCRIÇÃO', 20, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    const district = districts.find(d => d.id === registrationData.district_id);
    const church = churches.find(c => c.id === registrationData.church_id);
    
    const details = [
      `Nome: ${registrationData.full_name}`,
      `Data de Nascimento: ${registrationData.birth_date.split('-').reverse().join('/')}`,
      `Idade: ${age} anos`,
      `Distrito: ${district?.name || 'N/A'}`,
      `Igreja: ${church?.name || 'N/A'}`,
      `Valor: ${age <= 10 ? 'GRATUITO (até 10 anos)' : 'R$ 10,00'}`,
      `Data de Inscrição: ${new Date().toLocaleDateString('pt-BR')}`,
      `Protocolo: ${registrationId.substring(0, 8).toUpperCase()}`
    ];
    
    let yPosition = 75;
    details.forEach(detail => {
      doc.text(detail, 20, yPosition);
      yPosition += 8;
    });
    
    // Event information
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO EVENTO', 20, yPosition + 15);
    
    doc.setFont('helvetica', 'normal');
    yPosition += 25;
    
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
    
    // Important notes
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES IMPORTANTES', 20, yPosition + 15);
    
    doc.setFont('helvetica', 'normal');
    yPosition += 25;
    
    const notes = [
      '• Mantenha este comprovante para apresentação no evento',
      '• Crianças até 10 anos não pagam inscrição',
      '• Pagamento pode ser feito via PIX ou dinheiro',
      '• Mais informações serão enviadas aos inscritos'
    ];
    
    notes.forEach(note => {
      doc.text(note, 20, yPosition);
      yPosition += 8;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Comprovante gerado em ${new Date().toLocaleString('pt-BR')}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    
    // Save the PDF
    const fileName = `campal-2025-inscricao-${registrationData.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(fileName);
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    
    try {
      const age = calculateAge(data.birth_date);
      
      const { data: result, error } = await supabase
        .from('registrations')
        .insert({
          full_name: data.full_name,
          birth_date: data.birth_date,
          age: age,
          district_id: data.district_id,
          church_id: data.church_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate receipt PDF
      if (result) {
        generateReceipt(data, result.id, age);
      }

      toast({
        title: "Inscrição realizada com sucesso!",
        description: "Comprovante de inscrição foi baixado automaticamente.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Erro ao realizar inscrição",
        description: "Tente novamente ou entre em contato com o organizador.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update the existing helper functions
  const formatDateString = (value: string) => {
    if (!value) return "";
    
    // Remove non-digits
    let numbers = value.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const parseDate = (dateString: string) => {
    if (!dateString) return "";
    
    // Handle DD/MM/YYYY format
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      
      // Validate date
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (isNaN(date.getTime())) return "";
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateString;
  };

  return (
    
      <div className="w-full max-w-md mx-auto px-4 py-8 sm:py-12">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-event-primary">
            CAMPAL 2025 - IPITINGA
          </h1>
          <div className="text-lg sm:text-xl font-semibold text-event-accent">
            FORTES NA PALAVRA
          </div>
          <div className="text-base sm:text-lg">
            26 a 28 de Setembro de 2025 - CATRE IPITINGA
          </div>
          <div className="text-sm text-muted-foreground">
            Inscrições até 15 de setembro
          </div>
          <div className="text-sm font-medium bg-white/50 py-1 px-3 rounded-full inline-block">
            Valor: R$ 10,00 (Até 10 anos não paga)
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Nome Completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu nome completo" 
                      className="h-12 bg-white/70 border-0 focus:bg-white"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-base font-medium">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="DD/MM/AAAA"
                        className="h-12 bg-white/70 border-0 focus:bg-white pr-12"
                        value={field.value ? 
                          format(new Date(field.value), 'dd/MM/yyyy', { locale: ptBR }) :
                          ''
                        }
                        onChange={(e) => {
                          const formatted = formatDateString(e.target.value);
                          e.target.value = formatted;
                          
                          if (formatted.length === 10) {
                            const isoDate = parseDate(formatted);
                            if (isoDate) {
                              field.onChange(isoDate);
                            }
                          } else {
                            // Allow partial input without triggering validation
                            field.onChange("");
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.length > 0 && e.target.value.length < 10) {
                            // Clear invalid partial dates on blur
                            e.target.value = '';
                            field.onChange("");
                          }
                          field.onBlur();
                        }}
                        maxLength={10}
                        inputMode="numeric"
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                        <Input
                          type="date"
                          className="absolute opacity-0 w-10 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.value) {
                              const date = new Date(e.target.value);
                              field.onChange(format(date, 'yyyy-MM-dd'));
                            }
                          }}
                          value={field.value || ''}
                          max={format(new Date(), 'yyyy-MM-dd')}
                        />
                        <Calendar className="h-5 w-5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="district_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base font-medium">
                      <MapPin className="h-4 w-4" />
                      Distrito
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white/70 border-0 focus:bg-white">
                          <SelectValue placeholder="Selecione o distrito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="church_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base font-medium">
                      <Church className="h-4 w-4" />
                      Igreja
                    </FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="h-12 w-full justify-between bg-white/70 border-0 focus:bg-white"
                            disabled={!selectedDistrict}
                          >
                            {field.value
                              ? churches.find(church => church.id === field.value)?.name
                              : "Selecione a igreja"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Pesquisar igreja..." className="h-12" />
                          <CommandList>
                            <CommandEmpty>Nenhuma igreja encontrada.</CommandEmpty>
                            <CommandGroup>
                              {filteredChurches.map((church) => (
                                <CommandItem
                                  value={church.name}
                                  key={church.id}
                                  onSelect={() => {
                                    form.setValue("church_id", church.id);
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      church.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {church.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 mt-8 text-base font-medium bg-event-primary hover:bg-event-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                "Realizar Inscrição"
              )}
            </Button>
          </form>
        </Form>

        {/* Confirmation Dialog */}
<Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-event-primary">
        <CheckCircle className="h-6 w-6" />
        Inscrição Realizada com Sucesso!
      </DialogTitle>
      <DialogDescription className="pt-4 space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="font-medium">
            {registrationData?.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Protocolo: {registrationData?.protocol}
          </p>
        </div>
        <div className="border rounded-lg p-4 flex items-center gap-3">
          <div className="bg-event-primary/10 p-2 rounded-full">
            <Download className="h-5 w-5 text-event-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              Comprovante de Inscrição
            </p>
            <p className="text-sm text-muted-foreground">
              O download do PDF foi iniciado automaticamente
            </p>
          </div>
        </div>
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="sm:justify-start">
      <Button 
        onClick={() => setShowConfirmation(false)}
        className="w-full bg-event-primary hover:bg-event-primary/90"
      >
        Entendi
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Loading Overlay */}
{submitting && (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-event-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="font-medium text-lg">Processando Inscrição</p>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto preparamos seu comprovante...
          </p>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
  );
}
