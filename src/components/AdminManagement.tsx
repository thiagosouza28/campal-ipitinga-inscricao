import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDistricts, useChurches } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const districtSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const churchSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  district_id: z.string().min(1, "Distrito é obrigatório"),
});

type DistrictFormData = z.infer<typeof districtSchema>;
type ChurchFormData = z.infer<typeof churchSchema>;

interface District {
  id: string;
  name: string;
}

interface Church {
  id: string;
  name: string;
  district_id: string;
}

type DistrictsHook = {
  districts: District[];
  loading: boolean;
  mutate: () => Promise<void>;
};

type ChurchesHook = {
  churches: Church[];
  loading: boolean;
  mutate: () => Promise<void>;
};

export function AdminManagement() {
  const { districts, mutate: mutateDistricts } = useDistricts() as DistrictsHook;
  const { churches, mutate: mutateChurches } = useChurches() as ChurchesHook;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);

  const districtForm = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      name: "",
    },
  });

  const churchForm = useForm<ChurchFormData>({
    resolver: zodResolver(churchSchema),
    defaultValues: {
      name: "",
      district_id: "",
    },
  });

  const handleAuthError = (error: any) => {
    if (error.code === "401") {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar autenticado para realizar esta ação.",
        variant: "destructive",
      });
      // Redirect to login or handle auth error
    }
  };

  const onDistrictSubmit = async (data: DistrictFormData) => {
    setLoading(true);
    try {
      const { data: newDistrict, error } = await supabase
        .from('districts')
        .insert([{ name: data.name }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Distrito adicionado com sucesso!",
        description: `${data.name} foi adicionado à lista.`,
      });

      await mutateDistricts();
      districtForm.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar distrito",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onChurchSubmit = async (data: ChurchFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('churches')
        .insert({
          name: data.name,
          district_id: data.district_id,
        });

      if (error) {
        if (error.code === "401") {
          handleAuthError(error);
          return;
        }
        throw error;
      }

      toast({
        title: "Igreja adicionada com sucesso!",
      });

      churchForm.reset();
      mutateChurches();
    } catch (error) {
      toast({
        title: "Erro ao adicionar igreja",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDistrictEdit = async (data: DistrictFormData) => {
    if (!editingDistrict) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('districts')
        .update({ name: data.name })
        .eq('id', editingDistrict.id);

      if (error) throw error;

      toast({
        title: "Distrito atualizado com sucesso!",
      });

      await mutateDistricts();
      districtForm.reset();
      setEditingDistrict(null);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar distrito",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onDistrictDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('districts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Distrito excluído com sucesso!",
      });

      await mutateDistricts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir distrito",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onChurchEdit = async (data: ChurchFormData) => {
    if (!editingChurch) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('churches')
        .update({
          name: data.name,
          district_id: data.district_id,
        })
        .eq('id', editingChurch.id);

      if (error) throw error;

      toast({
        title: "Igreja atualizada com sucesso!",
      });

      await mutateChurches();
      churchForm.reset();
      setEditingChurch(null);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar igreja",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onChurchDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('churches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Igreja excluída com sucesso!",
      });

      await mutateChurches();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir igreja",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-event-primary">
          Gerenciamento Administrativo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="districts" className="space-y-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="districts">Distritos</TabsTrigger>
            <TabsTrigger value="churches">Igrejas</TabsTrigger>
          </TabsList>

          <TabsContent value="districts">
            <Form {...districtForm}>
              <form onSubmit={districtForm.handleSubmit(onDistrictSubmit)} className="space-y-4">
                <FormField
                  control={districtForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Distrito</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do distrito" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-4"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adicionando...
                    </div>
                  ) : (
                    'Adicionar Distrito'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Distritos Cadastrados:</h3>
              <div className="space-y-2">
                {districts.map((district) => (
                  <div key={district.id} className="p-2 bg-slate-100 rounded-md flex items-center justify-between">
                    <span>{district.name}</span>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingDistrict(district);
                              districtForm.setValue('name', district.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Distrito</DialogTitle>
                          </DialogHeader>
                          <Form {...districtForm}>
                            <form onSubmit={districtForm.handleSubmit(onDistrictEdit)} className="space-y-4">
                              <FormField
                                control={districtForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome do Distrito</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o distrito "{district.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDistrictDelete(district.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="churches">
            <Form {...churchForm}>
              <form onSubmit={churchForm.handleSubmit(onChurchSubmit)} className="space-y-4">
                <FormField
                  control={churchForm.control}
                  name="district_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distrito</FormLabel>
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
                  control={churchForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Igreja</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome da igreja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Adicionando..." : "Adicionar Igreja"}
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Igrejas Cadastradas:</h3>
              <div className="space-y-2">
                {churches.map((church) => (
                  <div key={church.id} className="p-2 bg-slate-100 rounded-md flex items-center justify-between">
                    <div>
                      <span>{church.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {districts.find(d => d.id === church.district_id)?.name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingChurch(church);
                              churchForm.setValue('name', church.name);
                              churchForm.setValue('district_id', church.district_id);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Igreja</DialogTitle>
                          </DialogHeader>
                          <Form {...churchForm}>
                            <form onSubmit={churchForm.handleSubmit(onChurchEdit)} className="space-y-4">
                              <FormField
                                control={churchForm.control}
                                name="district_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Distrito</FormLabel>
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
                                control={churchForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome da Igreja</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a igreja "{church.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onChurchDelete(church.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit District Dialog */}
      <Dialog open={!!editingDistrict} onOpenChange={(open) => { if (!open) setEditingDistrict(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Distrito</DialogTitle>
          </DialogHeader>
          <Form {...districtForm}>
            <form onSubmit={districtForm.handleSubmit(onDistrictEdit)} className="space-y-4">
              <FormField
                control={districtForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Distrito</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do distrito" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingDistrict(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Church Dialog */}
      <Dialog open={!!editingChurch} onOpenChange={(open) => { if (!open) setEditingChurch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Igreja</DialogTitle>
          </DialogHeader>
          <Form {...churchForm}>
            <form onSubmit={churchForm.handleSubmit(onChurchEdit)} className="space-y-4">
              <FormField
                control={churchForm.control}
                name="district_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distrito</FormLabel>
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
                control={churchForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Igreja</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome da igreja" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingChurch(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}