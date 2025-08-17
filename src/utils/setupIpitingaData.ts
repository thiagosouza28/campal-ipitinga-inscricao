import { supabase } from "@/integrations/supabase/client";

export async function setupIpitingaData() {
  try {
    console.log("Iniciando configuração dos dados do distrito IPITINGA...");

    // 1. Verificar se o distrito IPITINGA já existe
    let { data: districtData, error: districtFetchError } = await supabase
      .from('districts')
      .select('*')
      .eq('name', 'IPITINGA')
      .single();

    let districtId: string;

    if (districtFetchError && districtFetchError.code === 'PGRST116') {
      // Distrito não existe, vamos criar
      const { data: newDistrict, error: districtInsertError } = await supabase
        .from('districts')
        .insert({
          name: 'IPITINGA'
        })
        .select()
        .single();

      if (districtInsertError) {
        console.error("Erro ao criar distrito:", districtInsertError);
        return { success: false, error: districtInsertError };
      }

      console.log("Distrito IPITINGA criado:", newDistrict);
      districtId = newDistrict.id;
    } else if (districtFetchError) {
      console.error("Erro ao buscar distrito:", districtFetchError);
      return { success: false, error: districtFetchError };
    } else {
      console.log("Distrito IPITINGA já existe:", districtData);
      districtId = districtData.id;
    }

    // 2. Lista de igrejas para adicionar
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

    // 3. Verificar quais igrejas já existem
    const { data: existingChurches, error: churchFetchError } = await supabase
      .from('churches')
      .select('name')
      .eq('district_id', districtId);

    if (churchFetchError) {
      console.error("Erro ao buscar igrejas existentes:", churchFetchError);
      return { success: false, error: churchFetchError };
    }

    const existingChurchNames = existingChurches?.map(c => c.name) || [];
    const newChurches = churches.filter(churchName => !existingChurchNames.includes(churchName));

    console.log(`${existingChurches?.length || 0} igrejas já existem`);
    console.log(`${newChurches.length} novas igrejas para adicionar`);

    // 4. Inserir apenas as igrejas que não existem
    if (newChurches.length > 0) {
      const churchInserts = newChurches.map(churchName => ({
        name: churchName,
        district_id: districtId
      }));

      const { data: insertedChurches, error: churchInsertError } = await supabase
        .from('churches')
        .insert(churchInserts)
        .select();

      if (churchInsertError) {
        console.error("Erro ao inserir igrejas:", churchInsertError);
        return { success: false, error: churchInsertError };
      }

      console.log(`${insertedChurches?.length || 0} novas igrejas inseridas com sucesso!`);
      insertedChurches?.forEach(church => {
        console.log(`✓ ${church.name}`);
      });
    } else {
      console.log("Todas as igrejas já estão cadastradas!");
    }

    console.log("✅ Configuração do distrito IPITINGA concluída!");
    return { success: true, districtId, totalChurches: churches.length };

  } catch (error) {
    console.error("Erro geral:", error);
    return { success: false, error };
  }
}

// Função para executar via console do navegador
(window as any).setupIpitingaData = setupIpitingaData;