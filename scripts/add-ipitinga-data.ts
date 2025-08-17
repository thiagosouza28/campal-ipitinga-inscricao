import { supabase } from "../src/integrations/supabase/client";

async function addIpitingaData() {
  try {
    console.log("Iniciando inserção dos dados do distrito IPITINGA...");

    // 1. Primeiro, adicionar o distrito IPITINGA
    const { data: districtData, error: districtError } = await supabase
      .from('districts')
      .insert({
        name: 'IPITINGA'
      })
      .select()
      .single();

    if (districtError) {
      // Se o distrito já existe, vamos buscar ele
      if (districtError.code === '23505') { // unique_violation
        console.log("Distrito IPITINGA já existe, buscando...");
        const { data: existingDistrict, error: fetchError } = await supabase
          .from('districts')
          .select('*')
          .eq('name', 'IPITINGA')
          .single();
        
        if (fetchError) {
          console.error("Erro ao buscar distrito existente:", fetchError);
          return;
        }
        
        console.log("Distrito IPITINGA encontrado:", existingDistrict);
        await addChurches(existingDistrict.id);
      } else {
        console.error("Erro ao inserir distrito:", districtError);
        return;
      }
    } else {
      console.log("Distrito IPITINGA criado:", districtData);
      await addChurches(districtData.id);
    }

  } catch (error) {
    console.error("Erro geral:", error);
  }
}

async function addChurches(districtId: string) {
  console.log("Adicionando igrejas para o distrito IPITINGA...");

  const churches = [
    "ATEUA-GRANDE - IPITINGA – ANPA",
    "ATEUAZINHO - IPITINGA - ANPA", 
    "ATLETICO - IPITINGA - ANPA",
    "BOM FUTURO - IPITINGA – ANPA",
    "BOM JESUS - IPITINGA – ANPA",
    "CAMPINA - IPITINGA – ANPA",
    "CURUPERÉ - IPITINGA - ANPA",
    "IPITINGA DO MOJU - IPITINGA – ANPA",
    "JAMBUAÇÚ - IPITINGA – ANPA",
    "LUSO BRASILEIRO - IPITINGA – ANPA",
    "MONTE SINAI - KM 34 - IPITINGA – ANPA",
    "MONTE SINAI II - KM 30 - IPITINGA – ANPA",
    "NOVA VIDA-IPITINGA - SEDE – ANPA",
    "PRIMAVERA - IPITINGA – ANPA",
    "TRACUATEUA - ACARÁ – ANPA",
    "TREVO - IPITINGA - ANPA"
  ];

  // Inserir todas as igrejas
  const churchInserts = churches.map(churchName => ({
    name: churchName,
    district_id: districtId
  }));

  const { data: churchData, error: churchError } = await supabase
    .from('churches')
    .insert(churchInserts)
    .select();

  if (churchError) {
    console.error("Erro ao inserir igrejas:", churchError);
    
    // Se houver erro de duplicação, vamos inserir uma por uma
    if (churchError.code === '23505') {
      console.log("Algumas igrejas já existem, inserindo individualmente...");
      
      for (const churchName of churches) {
        const { error: individualError } = await supabase
          .from('churches')
          .insert({
            name: churchName,
            district_id: districtId
          });
        
        if (individualError && individualError.code !== '23505') {
          console.error(`Erro ao inserir igreja ${churchName}:`, individualError);
        } else if (!individualError) {
          console.log(`Igreja ${churchName} inserida com sucesso!`);
        } else {
          console.log(`Igreja ${churchName} já existe.`);
        }
      }
    }
  } else {
    console.log(`${churchData?.length || 0} igrejas inseridas com sucesso!`);
    churchData?.forEach(church => {
      console.log(`- ${church.name}`);
    });
  }

  console.log("Processo concluído!");
}

// Executar o script
addIpitingaData();