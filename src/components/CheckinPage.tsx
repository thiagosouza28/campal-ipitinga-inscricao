import { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ParticipantData {
  id: string;
  full_name: string;
  age: number;
  district: { name: string };
  church: { name: string };
  checkin_status: boolean;
  checkin_datetime: string | null;
}

export function CheckinPage() {
  const [scanning, setScanning] = useState(false);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const { toast } = useToast();

  const handleScan = async (token: string | null) => {
    if (!token) return;

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          full_name,
          age,
          checkin_status,
          checkin_datetime,
          districts (name),
          churches (name)
        `)
        .eq('checkin_token', token)
        .single();

      if (error) throw error;

      if (data.checkin_status) {
        toast({
          title: "Check-in já realizado",
          description: `Participante já realizou check-in em ${new Date(data.checkin_datetime!).toLocaleString()}`,
          variant: "destructive",
        });
        return;
      }

      setParticipant({
        id: data.id,
        full_name: data.full_name,
        age: data.age,
        checkin_status: data.checkin_status,
        checkin_datetime: data.checkin_datetime,
        district: Array.isArray(data.districts) ? data.districts[0] : data.districts,
        church: Array.isArray(data.churches) ? data.churches[0] : data.churches,
      });
      setScanning(false);
    } catch (error) {
      toast({
        title: "Erro ao ler QR Code",
        description: "QR Code inválido ou expirado",
        variant: "destructive",
      });
    }
  };

  const confirmCheckin = async () => {
    if (!participant) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('registrations')
        .update({
          checkin_status: true,
          checkin_datetime: new Date().toISOString(),
          checkin_by: userData?.user?.id
        })
        .eq('id', participant.id);

      if (error) throw error;

      toast({
        title: "Check-in realizado com sucesso!",
        description: "Participante pode entrar no evento",
      });

      setParticipant(null);
    } catch (error) {
      toast({
        title: "Erro ao confirmar check-in",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Check-in de Participantes</CardTitle>
      </CardHeader>
      <CardContent>
        {scanning ? (
          <div className="aspect-square overflow-hidden rounded-lg">
            <QrReader
              onResult={(result) => {
                if (result) {
                  handleScan(result.getText());
                }
              }}
              constraints={{ facingMode: 'environment' }}
            />
          </div>
        ) : participant ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-bold text-lg">{participant.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {participant.age} anos
              </p>
              <p className="text-sm">
                {participant.district.name} - {participant.church.name}
              </p>
            </div>
            
            <Button 
              onClick={confirmCheckin}
              className="w-full"
            >
              Confirmar Presença
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setParticipant(null);
                setScanning(true);
              }}
              className="w-full"
            >
              Escanear Outro
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => setScanning(true)}
            className="w-full"
          >
            Iniciar Scanner
          </Button>
        )}
      </CardContent>
    </Card>
  );
}