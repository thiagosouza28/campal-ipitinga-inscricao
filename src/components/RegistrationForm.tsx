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
import { toast } from "@/hooks/use-toast";

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

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    
    try {
      const age = calculateAge(data.birth_date);
      
      const { error } = await supabase
        .from('registrations')
        .insert({
          full_name: data.full_name,
          birth_date: data.birth_date,
          age: age,
          district_id: data.district_id,
          church_id: data.church_id,
        });

      if (error) throw error;

      toast({
        title: "Inscrição realizada com sucesso!",
        description: "Sua inscrição foi registrada. Aguarde confirmação do pagamento.",
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
    <Card className="w-full max-w-2xl mx-auto m-4 sm:m-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl sm:text-3xl font-bold text-event-primary">
          CAMPAL 2025 - IPITINGA
        </CardTitle>
        <CardDescription className="text-lg">
          <span className="font-semibold text-event-accent">FORTES NA PALAVRA</span>
          <br />
          26 a 28 de Setembro de 2025 - CATRE IPITINGA
          <br />
          <span className="text-sm text-muted-foreground">
            Inscrições até 15 de setembro
          </span>
          <br />
          <span className="text-sm font-medium text-event-primary">
            Valor: R$ 10,00 (Até 10 anos não paga)
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome completo" {...field} />
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
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Nascimento
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="district_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Distrito
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-2">
                    <Church className="h-4 w-4" />
                    Igreja
                  </FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!selectedDistrict}
                        >
                          {field.value
                            ? churches.find(church => church.id === field.value)?.name
                            : "Selecione a igreja"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Pesquisar igreja..." />
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

            <Button 
              type="submit" 
              className="w-full bg-event-primary hover:bg-event-primary/90"
              disabled={submitting}
            >
              {submitting ? "Processando..." : "Realizar Inscrição"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}