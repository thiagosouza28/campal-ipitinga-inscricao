import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CheckinStats {
  total: number;
  present: number;
  absent: number;
}

interface Participant {
  full_name: string;
  age: number;
  district_name: string;
  church_name: string;
  checkin_status: boolean;
  checkin_datetime: string | null;
}

export function CheckinReport() {
  const [stats, setStats] = useState<CheckinStats>({ total: 0, present: 0, absent: 0 });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          full_name,
          age,
          checkin_status,
          checkin_datetime,
          districts (name),
          churches (name)
        `);

      if (error) throw error;

      const formattedData = data.map(p => ({
        full_name: p.full_name,
        age: p.age,
        district_name: Array.isArray(p.districts) && p.districts.length > 0 ? p.districts[0].name : '',
        church_name: Array.isArray(p.churches) && p.churches.length > 0 ? p.churches[0].name : '',
        checkin_status: p.checkin_status,
        checkin_datetime: p.checkin_datetime,
      }));

      setParticipants(formattedData);
      setStats({
        total: data.length,
        present: data.filter(p => p.checkin_status).length,
        absent: data.filter(p => !p.checkin_status).length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(participants);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Check-ins");
    XLSX.writeFile(wb, "checkin-report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Relatório de Check-in - CAMPAL 2025', 14, 22);

    // Add stats
    doc.setFontSize(12);
    doc.text(`Total de Inscritos: ${stats.total}`, 14, 32);
    doc.text(`Presentes: ${stats.present}`, 14, 38);
    doc.text(`Ausentes: ${stats.absent}`, 14, 44);

    // Add table
    (doc as any).autoTable({
      startY: 50,
      head: [['Nome', 'Idade', 'Distrito', 'Igreja', 'Status', 'Data Check-in']],
      body: participants.map(p => [
        p.full_name,
        p.age,
        p.district_name,
        p.church_name,
        p.checkin_status ? 'Presente' : 'Ausente',
        p.checkin_datetime ? new Date(p.checkin_datetime).toLocaleString() : '-'
      ]),
    });

    doc.save('checkin-report.pdf');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Check-in</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="p-4 bg-green-100 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.present}</div>
            <div className="text-sm text-green-600">Presentes</div>
          </div>
          <div className="p-4 bg-red-100 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
            <div className="text-sm text-red-600">Ausentes</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Nome</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Check-in</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{p.full_name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      p.checkin_status 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {p.checkin_status ? 'Presente' : 'Ausente'}
                    </span>
                  </td>
                  <td className="py-2 text-sm text-muted-foreground">
                    {p.checkin_datetime 
                      ? new Date(p.checkin_datetime).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}