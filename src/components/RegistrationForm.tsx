import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Church, CheckCircle, Sparkles, Users, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import heroImage from "@/assets/campal-hero-bg.jpg";

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

// Mock data para demonstração
const districts = [
  { id: "1", name: "Distrito Central" },
  { id: "2", name: "Distrito Norte" },
  { id: "3", name: "Distrito Sul" },
  { id: "4", name: "Distrito Leste" },
  { id: "5", name: "Distrito Oeste" },
];

const churches = [
  { id: "1", name: "Igreja Central", district_id: "1" },
  { id: "2", name: "Igreja do Bairro Novo", district_id: "1" },
  { id: "3", name: "Igreja Norte", district_id: "2" },
  { id: "4", name: "Igreja Esperança", district_id: "2" },
  { id: "5", name: "Igreja Sul", district_id: "3" },
  { id: "6", name: "Igreja Paz", district_id: "3" },
  { id: "7", name: "Igreja Leste", district_id: "4" },
  { id: "8", name: "Igreja Luz", district_id: "4" },
  { id: "9", name: "Igreja Oeste", district_id: "5" },
  { id: "10", name: "Igreja Vida", district_id: "5" },
];

export function RegistrationForm() {
  // --- Estados de UI ---
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

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Simula chamada para backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const protocol = Math.random().toString(36).substring(2, 10).toUpperCase();
      setRegistrationData({ 
        name: data.full_name, 
        protocol 
      });
      
      form.reset();
      setShowConfirmation(true);
      
      toast({
        title: "Inscrição realizada com sucesso!",
        description: `Protocolo: ${protocol}`,
      });
    } catch (err) {
      console.error("Erro ao registrar:", err);
      toast({
        title: "Erro ao realizar inscrição",
        description: "Tente novamente ou entre em contato com o organizador.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Renderização principal ---
  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      {/* Background com overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-event-primary/90 via-event-accent/80 to-event-primary/90 backdrop-blur-xs" />
      </div>

      {/* Elementos decorativos flutuantes */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-event-gold/20 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-32 right-16 w-32 h-32 bg-event-accent/20 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-lg animate-pulse-soft" />

      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-12">
        {/* Header do evento */}
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <Sparkles className="h-4 w-4 text-event-gold animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Evento Oficial</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-2xl">
              CAMPAL 2025
            </h1>
            <div className="text-xl sm:text-2xl font-semibold text-event-gold drop-shadow-lg">
              IPITINGA
            </div>
            <div className="bg-gradient-gold text-transparent bg-clip-text text-2xl sm:text-3xl font-bold drop-shadow-sm">
              FORTES NA PALAVRA
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <Clock className="h-5 w-5 text-event-gold mx-auto mb-2" />
              <div className="text-white text-sm font-medium">26-28 Set</div>
              <div className="text-white/80 text-xs">2025</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <MapPin className="h-5 w-5 text-event-gold mx-auto mb-2" />
              <div className="text-white text-sm font-medium">CATRE</div>
              <div className="text-white/80 text-xs">Ipitinga</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <DollarSign className="h-5 w-5 text-event-gold mx-auto mb-2" />
              <div className="text-white text-sm font-medium">R$ 10,00</div>
              <div className="text-white/80 text-xs">Até 10 anos grátis</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
              <Users className="h-5 w-5 text-event-gold mx-auto mb-2" />
              <div className="text-white text-sm font-medium">Inscrições</div>
              <div className="text-white/80 text-xs">Até 15/09</div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <Card className="shadow-glow border-white/20 bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">
              Realize sua Inscrição
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Preencha os dados abaixo para garantir sua vaga no evento
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Nome */}
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold text-gray-700">Nome Completo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Digite seu nome completo" 
                        className="h-14 bg-white/80 border-2 border-gray-200 focus:border-event-primary focus:bg-white transition-all duration-300 text-base placeholder:text-gray-400 hover:border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Data de Nascimento */}
                <FormField control={form.control} name="birth_date" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2 text-base font-semibold text-gray-700">
                      <Calendar className="h-5 w-5 text-event-accent" /> 
                      Data de Nascimento
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="DD/MM/AAAA"
                        className="h-14 bg-white/80 border-2 border-gray-200 focus:border-event-primary focus:bg-white transition-all duration-300 text-base placeholder:text-gray-400 hover:border-gray-300"
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
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Distrito */}
                  <FormField control={form.control} name="district_id" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-base font-semibold text-gray-700">
                        <MapPin className="h-5 w-5 text-event-accent" /> 
                        Distrito
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-white/80 border-2 border-gray-200 focus:border-event-primary transition-all duration-300 hover:border-gray-300">
                            <SelectValue placeholder="Selecione o distrito" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20">
                          {districts.map(d => (
                            <SelectItem key={d.id} value={d.id} className="text-base py-3 hover:bg-event-primary/10">
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Igreja */}
                  <FormField control={form.control} name="church_id" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-base font-semibold text-gray-700">
                        <Church className="h-5 w-5 text-event-accent" /> 
                        Igreja
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedDistrict}
                      >
                        <FormControl>
                          <SelectTrigger className="h-14 bg-white/80 border-2 border-gray-200 focus:border-event-primary transition-all duration-300 disabled:opacity-50 hover:border-gray-300">
                            <SelectValue placeholder={selectedDistrict ? "Selecione a igreja" : "Selecione o distrito primeiro"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/95 backdrop-blur-sm border-white/20">
                          {filteredChurches.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-base py-3 hover:bg-event-primary/10">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Botão enviar */}
                <Button 
                  type="submit" 
                  className="w-full h-16 bg-gradient-primary hover:shadow-glow text-white font-bold text-lg transition-all duration-500 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none hover:shadow-2xl" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registrando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5" />
                      Realizar Inscrição
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-lg bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-pulse-soft">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">
              🎉 Inscrição Concluída!
            </DialogTitle>
            <DialogDescription className="text-base">
              A inscrição de <strong className="text-event-primary">{registrationData?.name}</strong> foi realizada com sucesso!
              <br />
              <span className="text-sm text-gray-600 mt-2 block">
                Protocolo: <strong className="text-event-accent">{registrationData?.protocol}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              onClick={() => setShowConfirmation(false)} 
              className="bg-gradient-primary hover:shadow-glow text-white px-8 py-3 font-semibold transition-all duration-300 hover:scale-105"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
