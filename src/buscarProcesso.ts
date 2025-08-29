import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

async function httpGet(url: string, token: string): Promise<any> {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Falha HTTP ${resp.status}`);
  return resp.json();
}

async function buscarProcesso(): Promise<void> {
  try {
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const numeroProcesso = ((docgo.getParam("numeroProcesso") as string) || "")
      .trim()
      .replace(/\D+/g, "");

    if (!numeroProcesso) {
      console.log(docgo.result(false, null, "numeroProcesso vazio"));
      return;
    }

    const token = docgo.getEnv("PDPJ_TOKEN");
    if (!token) {
      console.log(docgo.result(false, null, "Token não configurado"));
      return;
    }

    const baseUrl = (
      docgo.getEnv("PDPJ_BASE_URL") ||
      "https://portaldeservicos.pdpj.jus.br/api/v2"
    ).replace(/\/$/, "");

    // Busca processo
    const url = `${baseUrl}/processos/${encodeURIComponent(numeroProcesso)}`;
    const detail = await httpGet(url, token);

    const processo: Processo = {
      numero: detail.numero || numeroProcesso,
      tribunal: detail.tribunal || "PDPJ",
      vara: detail.vara || detail.orgaoJulgador || "Desconhecida",
      classe: detail.classe || detail.classeProcessual || "Sem classe",
      assunto: detail.assunto || detail.assuntoPrincipal || "Sem assunto",
      dataDistribuicao: new Date(
        detail.dataDistribuicao || detail.distribuicao || Date.now()
      ),
      valorCausa: detail.valorCausa || detail.valorDaCausa || 0,
      status: (detail.status || detail.situacao || "ATIVO") as StatusProcesso,
      partes: (detail.partes || detail.partesProcesso || []).map(
        (p: any): Parte => ({
          tipo: p.tipo,
          nome: p.nome,
          documento: p.documento,
          advogados: p.advogados || [],
        })
      ),
      movimentacoes: (detail.movimentacoes || detail.movs || []).map(
        (m: any): Movimentacao => ({
          data: new Date(m.data),
          descricao: m.descricao,
          tipo: m.tipo,
          documentos: m.documentos || [],
        })
      ),
    };

    console.log(docgo.result(true, { processo }));
  } catch (error: any) {
    console.log(docgo.result(false, null, error.message));
  }
}

buscarProcesso();
