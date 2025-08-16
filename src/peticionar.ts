import docgo, { Peticao, ResultadoPeticao } from "docgo-sdk";

async function peticionar(): Promise<void> {
  try {
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const numeroProcesso = docgo.getParam("numeroProcesso") as string;
    const tipoPeticao = docgo.getParam("tipoPeticao") as string;
    const conteudo = docgo.getParam("conteudo") as string;

    docgo.info("Protocolando petição", {
      processo: numeroProcesso,
      tipo: tipoPeticao,
    });

    // Configuração da API
    const baseUrl = docgo.getEnv("TRIBUNAL_BASE_URL");
    const apiKey = docgo.getEnv("TRIBUNAL_API_KEY");

    // Prepara a petição
    const peticaoData = {
      numeroProcesso,
      tipo: tipoPeticao,
      conteudo,
      dataEnvio: new Date().toISOString(),
    };

    // Envia para o tribunal
    const response = await fetch(
      `${baseUrl}/processos/${numeroProcesso}/peticoes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(peticaoData),
      }
    );

    if (!response.ok) {
      throw new Error(`Falha ao protocolar: ${response.status}`);
    }

    const result = (await response.json()) as any;

    const resultado: ResultadoPeticao = {
      sucesso: true,
      protocolo: result.protocolo || `PROT-${Date.now()}`,
      dataProtocolo: new Date(result.dataProtocolo || new Date()),
    };

    docgo.info("Petição protocolada com sucesso", resultado);
    console.log(docgo.result(true, resultado));
  } catch (error: any) {
    docgo.error("Erro ao protocolar petição", { error: error.message });
    console.log(docgo.result(false, null, error.message));
  }
}

peticionar();
