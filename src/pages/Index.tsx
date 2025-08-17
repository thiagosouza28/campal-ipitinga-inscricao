import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { setupIpitingaData } from "@/utils/setupIpitingaData";

const Index = () => {
  // Configurar dados do distrito IPITINGA na primeira visita
  useEffect(() => {
    const hasSetupData = localStorage.getItem('ipitinga_data_setup');
    if (!hasSetupData) {
      setupIpitingaData().then((result) => {
        if (result.success) {
          localStorage.setItem('ipitinga_data_setup', 'true');
          console.log('Dados do distrito IPITINGA configurados automaticamente!');
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-event-primary/10 via-background to-event-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-event-primary">
            CAMPAL 2025
          </h1>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2 text-event-accent">
            IPITINGA
          </h2>
          <h3 className="text-xl sm:text-2xl font-medium mb-6 text-event-secondary">
            FORTES NA PALAVRA
          </h3>
          <div className="flex items-center justify-center gap-2 text-lg sm:text-xl text-muted-foreground mb-8">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>26 a 28 de Setembro de 2025</span>
          </div>
          <div className="mb-6">
            <p className="text-base sm:text-lg text-destructive font-semibold mb-2">
              Inscrições até 15 de setembro
            </p>
            <p className="text-base sm:text-lg text-event-primary font-semibold">
              Valor: R$ 10,00 (Até 10 anos não paga)
            </p>
          </div>
        </div>

        {/* Folder do Evento */}
        <div className="flex justify-center mb-12">
          <div className="max-w-md sm:max-w-lg lg:max-w-xl">
            <img 
              src="/lovable-uploads/50d3c65d-d09c-4cab-a792-8c6d8fa890fe.png" 
              alt="Folder CAMPAL 2025 - Fortes na Palavra"
              className="w-full h-auto rounded-lg shadow-lg border-2 border-event-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto mb-12">
          <Card className="border-2 border-event-primary/20 hover:border-event-primary/40 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-event-primary flex items-center justify-center gap-2">
                <Users className="h-6 w-6" />
                Fazer Inscrição
              </CardTitle>
              <CardDescription className="text-lg">
                Registre-se para participar do CAMPAL 2025
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-muted-foreground">
                Preencha seus dados e selecione sua igreja para se inscrever no evento.
              </p>
              <Link to="/inscricao">
                <Button size="lg" className="w-full bg-event-primary hover:bg-event-primary/90">
                  Realizar Inscrição
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-event-accent/20 hover:border-event-accent/40 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-event-accent flex items-center justify-center gap-2">
                <FileText className="h-6 w-6" />
                Gerenciar Inscrições
              </CardTitle>
              <CardDescription className="text-lg">
                Área administrativa para organização
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-muted-foreground">
                Visualize inscrições, confirme pagamentos e gere relatórios.
              </p>
              <Link to="/gerenciar">
                <Button size="lg" variant="outline" className="w-full border-event-accent text-event-accent hover:bg-event-accent hover:text-white">
                  Acessar Gerenciamento
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-2xl mx-auto bg-muted/30">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Informações do Evento</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <MapPin className="h-5 w-5 text-event-primary" />
              <span>CATRE IPITINGA</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5 text-event-primary" />
              <span>26, 27 e 28 de Setembro de 2025</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Valor da inscrição: R$ 10,00
            </p>
            <p className="text-sm text-muted-foreground">
              Crianças até 10 anos não pagam. Mais informações serão divulgadas aos inscritos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
