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

const formSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  district_id: z.string().min(1, "Distrito é obrigatório"),
  church_id: z.string().min(1, "Igreja é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
                    <Input 
                      type="date" 
                      className="h-12 bg-white/70 border-0 focus:bg-white"
                      {...field} 
                    />
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

    </div>
  );
}
