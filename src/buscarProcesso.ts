import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

async function buscarProcesso(): Promise<void> {
  try {
    // Valida parâmetros
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const numeroProcesso = docgo.getParam("numeroProcesso") as string;
    const tribunal = (docgo.getParam("tribunal") as string) || "TJSP";

    docgo.info("Buscando processo", { numeroProcesso, tribunal });

    // Configuração da API
    const baseUrl = docgo.getEnv("TRIBUNAL_BASE_URL");
    const apiKey = docgo.getEnv("TRIBUNAL_API_KEY");

    // Busca o processo na API real
    const response = await fetch(`${baseUrl}/processos/${numeroProcesso}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Tribunal": tribunal,
      },
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = (await response.json()) as any;

    // Mapeia para a interface Processo
    const processo: Processo = {
      numero: data.numero || numeroProcesso,
      tribunal: tribunal,
      vara: data.vara || "1ª Vara Cível",
      classe: data.classe || "Procedimento Comum",
      assunto: data.assunto || "Indenização por Danos Morais",
      dataDistribuicao: new Date(data.dataDistribuicao || "2024-01-15"),
      valorCausa: data.valorCausa || 50000.0,
      status: data.status || StatusProcesso.ATIVO,
      partes: mapearPartes(data.partes || []),
      movimentacoes: mapearMovimentacoes(data.movimentacoes || []),
    };

    docgo.info("Processo encontrado", { numero: processo.numero });
    console.log(docgo.result(true, processo));
  } catch (error: any) {
    docgo.error("Erro ao buscar processo", { error: error.message });
    console.log(docgo.result(false, null, error.message));
  }
}

function mapearPartes(partesData: any[]): Parte[] {
  return partesData.map((p) => ({
    tipo: p.tipo as "autor" | "reu" | "terceiro",
    nome: p.nome,
    documento: p.documento,
    advogados: p.advogados || [],
  }));
}

function mapearMovimentacoes(movData: any[]): Movimentacao[] {
  return movData.map((m) => ({
    data: new Date(m.data),
    descricao: m.descricao,
    tipo: m.tipo,
    documentos: m.documentos || [],
  }));
}

buscarProcesso();
