import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrReader } from 'react-qr-reader';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantData {
  id: string;
  full_name: string;
  age: number;
  district: { name: string };
  church: { name: string };
  checkin_status: boolean;
  checkin_datetime: string | null;
  payment_status: "paid" | "pending";
}

// Função para pegar a hora atual do Brasil (UTC-3)
function getBrazilDateTime() {
  return new Date(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
}

export function CheckinPage() {
  const [scanning, setScanning] = useState(false);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
  const lastTokenRef = useRef<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Busca as câmeras disponíveis
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map((device, idx) => ({
            deviceId: device.deviceId,
            label: device.label || `Câmera ${idx + 1}`
          }));
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedCamera) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      });
  }, []);

  const handleScan = async (result: any | null) => {
    if (!result) return;

    const token = typeof result.getText === 'function' ? result.getText() : result;
    if (!token || token === lastTokenRef.current) return;
    lastTokenRef.current = token;

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          full_name,
          age,
          checkin_status,
          checkin_datetime,
          payment_status,
          districts (name),
          churches (name)
        `)
        .eq('checkin_token', token)
        .single();

      if (error) throw error;

      if (data.checkin_status) {
        toast({
          title: "Check-in já realizado",
          description: `Participante já realizou check-in em ${new Date(data.checkin_datetime!).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
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
        payment_status: data.payment_status,
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
      // Corrige erro de sessão ausente: sempre recupera sessão antes de qualquer chamada
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({
          title: "Erro de autenticação",
          description: "Sessão não encontrada. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Usuário não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      // Só permite check-in se pagamento estiver confirmado
      if (participant.payment_status !== "paid") {
        toast({
          title: "Pagamento não confirmado",
          description: "Só é possível confirmar presença após o pagamento.",
          variant: "destructive",
        });
        return;
      }

      const updateData: any = {
        checkin_status: true,
        checkin_datetime: getBrazilDateTime().toISOString(),
        checkin_by: userData.user.id,
      };

      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', participant.id);

      if (error) throw error;

      await supabase.from("registration_history").insert({
        registration_id: participant.id,
        action: "checkin",
        details: {},
        performed_by: userData.user.id,
      });

      toast({
        title: "Check-in realizado com sucesso!",
        description: "Participante pode entrar no evento",
      });

      setParticipant(null);
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar check-in",
        description: error?.message || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const doCheckin = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const updateData: any = {
        checkin_status: true,
        checkin_datetime: getBrazilDateTime().toISOString(),
      };
      if ("checkin_by" in participant) {
        updateData.checkin_by = userData?.user?.id;
      }

      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', participant!.id);

      if (error) throw error;

      await supabase.from("registration_history").insert({
        registration_id: participant!.id,
        action: "checkin",
        details: {},
        performed_by: userData?.user?.id,
      });

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

  const confirmPaymentAndCheckin = async () => {
    if (!participant) return;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Atualiza pagamento para "paid"
      const { error: payError } = await supabase
        .from('registrations')
        .update({ payment_status: "paid", payment_method: "dinheiro" })
        .eq('id', participant.id);

      if (payError) throw payError;

      // Registra histórico do pagamento
      const { error: histError } = await supabase.from("registration_history").insert({
        registration_id: participant.id,
        action: "payment",
        details: { method: "dinheiro" },
        performed_by: userData?.user?.id,
      });

      if (histError) throw histError;

      // Atualiza o status local do participante para garantir que o check-in será permitido
      setParticipant(prev =>
        prev
          ? { ...prev, payment_status: "paid", checkin_status: false }
          : prev
      );

      // Faz o check-in
      await doCheckin();
      setConfirmPaymentDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: error?.message || "Tente novamente",
        variant: "destructive",
      });
      setConfirmPaymentDialog(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Check-in de Participantes</CardTitle>
      </CardHeader>
      <CardContent>
        {scanning ? (
          <>
            {cameraDevices.length > 0 && (
              <div className="mb-2">
                <label className="block text-sm font-medium mb-1">Escolha a câmera:</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                >
                  {cameraDevices.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || cam.deviceId}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="aspect-square overflow-hidden rounded-lg">
              <QrReader
                onResult={(result) => {
                  if (result) {
                    handleScan(result);
                  }
                }}
                constraints={{
                  deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
                }}
                containerStyle={{ width: '100%' }}
                videoStyle={{ width: '100%' }}
              />
            </div>
          </>
        ) : participant ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-bold text-lg">{participant.full_name}</h3>
              <p className="text-sm text-muted-foreground">{participant.age} anos</p>
              <p className="text-sm">{participant.district.name} - {participant.church.name}</p>
              <p className={`text-sm font-semibold ${participant.payment_status === "paid" ? "text-green-600" : "text-red-600"}`}>
                Pagamento: {participant.payment_status === "paid" ? "Confirmado" : "Pendente"}
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
          <Button onClick={() => setScanning(true)} className="w-full">
            Iniciar Scanner
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
