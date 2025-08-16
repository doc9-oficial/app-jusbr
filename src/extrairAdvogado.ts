import docgo, { Advogado } from "docgo-sdk";

async function extrairAdvogado(): Promise<void> {
  try {
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const numeroProcesso = docgo.getParam("numeroProcesso") as string;
    const parte = docgo.getParam("parte") as string;

    docgo.info("Extraindo advogado", { numeroProcesso, parte });

    // Configuração da API
    const baseUrl = docgo.getEnv("TRIBUNAL_BASE_URL");
    const apiKey = docgo.getEnv("TRIBUNAL_API_KEY");

    // Busca o processo
    const response = await fetch(
      `${baseUrl}/processos/${numeroProcesso}/partes/${parte}/advogados`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = (await response.json()) as { advogados: any[] };

    // Mapeia para a interface Advogado
    const advogados: Advogado[] = data.advogados.map((adv: any) => ({
      id: adv.id,
      nome: adv.nome,
      oab: adv.oab,
      estado: adv.estado,
      email: adv.email,
      telefone: adv.telefone,
      especialidades: adv.especialidades || [],
    }));

    if (advogados.length > 0) {
      docgo.info("Advogados encontrados", { quantidade: advogados.length });
      console.log(docgo.result(true, advogados));
    } else {
      console.log(
        docgo.result(
          false,
          null,
          "Nenhum advogado encontrado para a parte especificada"
        )
      );
    }
  } catch (error: any) {
    docgo.error("Erro ao extrair advogado", { error: error.message });
    console.log(docgo.result(false, null, error.message));
  }
}

extrairAdvogado();
