import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrReader } from 'react-qr-reader';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

// Função para pegar a hora atual do Brasil (UTC-3) corrigida
function getBrazilDateTime() {
  // Garante que retorna um objeto Date válido
  const now = new Date();
  // Ajusta para o fuso horário de Brasília (UTC-3)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilOffset = -3; // Horário de Brasília UTC-3
  return new Date(utc + 3600000 * brazilOffset);
}

export function CheckinPage() {
  const [scanning, setScanning] = useState(false);
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [confirmPaymentDialog, setConfirmPaymentDialog] = useState(false);
  const lastTokenRef = useRef<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<{ deviceId: string; label: string; type: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Busca as câmeras disponíveis e separa entre frontais e traseiras
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map((device, idx) => {
            // Tenta identificar se é frontal ou traseira pelo label
            const label = device.label.toLowerCase();
            let type = "Desconhecida";
            if (label.includes("front")) type = "Frontal";
            else if (label.includes("back") || label.includes("traseira") || label.includes("rear")) type = "Traseira";
            else if (label.includes("environment")) type = "Traseira";
            else if (label.includes("user")) type = "Frontal";
            return {
              deviceId: device.deviceId,
              label: device.label || `Câmera ${idx + 1}`,
              type
            };
          });
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
      // Removido o bloqueio de autenticação/sessão
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
        performed_by: null, // Sem usuário autenticado
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
      const updateData: any = {
        checkin_status: true,
        checkin_datetime: getBrazilDateTime().toISOString(),
      };

      const { error } = await supabase
        .from('registrations')
        .update(updateData)
        .eq('id', participant!.id);

      if (error) throw error;

      await supabase.from("registration_history").insert({
        registration_id: participant!.id,
        action: "checkin",
        details: {},
        performed_by: null, // Sem usuário autenticado
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
      // O campo payment_method deve ser um valor permitido pelo banco: "pix" ou "dinheiro"
      // Verifique na sua tabela se o valor permitido é "dinheiro", "cash", "pix", etc.
      // Aqui vamos usar "pix" como exemplo, mas ajuste conforme o seu banco!
      const paymentMethod = "pix"; // ou "dinheiro" se for permitido

      const { error: payError } = await supabase
        .from('registrations')
        .update({ payment_status: "paid", payment_method: paymentMethod })
        .eq('id', participant.id);

      if (payError) throw payError;

      // Registra histórico do pagamento
      const { error: histError } = await supabase.from("registration_history").insert({
        registration_id: participant.id,
        action: "payment",
        details: { method: paymentMethod },
        performed_by: null, // Sem usuário autenticado
      });

      if (histError) throw histError;

      setParticipant(prev =>
        prev
          ? { ...prev, payment_status: "paid", checkin_status: false }
          : prev
      );

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
                      {cam.label} {cam.type !== "Desconhecida" ? `(${cam.type})` : ""}
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

            {participant.payment_status !== "paid" ? (
              <>
                <Button
                  onClick={() => setConfirmPaymentDialog(true)}
                  className="w-full"
                >
                  Confirmar Pagamento
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
                <Dialog open={confirmPaymentDialog} onOpenChange={setConfirmPaymentDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar Pagamento</DialogTitle>
                      <DialogDescription>
                        O pagamento deste participante ainda não foi confirmado.<br />
                        Deseja confirmar o pagamento agora?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1" onClick={confirmPaymentAndCheckin}>
                        Sim, confirmar pagamento e check-in
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => setConfirmPaymentDialog(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
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
              </>
            )}
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
