import docgo, {
  Processo,
  StatusProcesso,
  Parte,
  Movimentacao,
} from "docgo-sdk";

interface PDPJProcessoResumo {
  numero?: string;
  classe?: string;
  assunto?: string;
  distribuicao?: string;
  instancia?: string;
}

interface PDPJParteRaw {
  tipo?: string;
  nome?: string;
  documento?: string;
  advogados?: any[];
}

interface PDPJMovRaw {
  data?: string;
  descricao?: string;
  tipo?: string;
  documentos?: any[];
}

async function httpGet(url: string, token: string): Promise<any> {
  const baseHeaders: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language":
      process.env.PDPJ_ACCEPT_LANGUAGE || "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent":
      process.env.PDPJ_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.97 Safari/537.36",
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer:
      process.env.PDPJ_REFERER ||
      "https://portaldeservicos.pdpj.jus.br/consulta",
    Origin: process.env.PDPJ_ORIGIN || "https://portaldeservicos.pdpj.jus.br",
    skiperrorinterceptor: "true",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
  };

  // Cookie (prioriza PDPJ_COOKIE completa, senão monta com JSESSIONID)
  const cookie =
    process.env.PDPJ_COOKIE ||
    (process.env.PDPJ_JSESSIONID
      ? `JSESSIONID=${process.env.PDPJ_JSESSIONID}`
      : undefined);
  if (cookie) baseHeaders["Cookie"] = cookie;

  // Headers extras via JSON (ex: {"X-Custom":"1"})
  if (process.env.PDPJ_EXTRA_HEADERS) {
    try {
      const extra = JSON.parse(process.env.PDPJ_EXTRA_HEADERS);
      Object.assign(baseHeaders, extra);
    } catch (e) {
      if (process.env.DOCGO_DEBUG === "1")
        console.warn("[debug] PDPJ_EXTRA_HEADERS inválido", e);
    }
  }

  const resp = await fetch(url, { headers: baseHeaders });
  if (!resp.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = await resp.text();
      bodySnippet = bodySnippet.slice(0, 500);
    } catch (_) {}
    if (process.env.DOCGO_DEBUG === "1") {
      console.error("[debug] HTTP fail", {
        status: resp.status,
        url,
        bodySnippet,
      });
    }
    throw new Error(`Falha HTTP ${resp.status}`);
  }
  return resp.json();
}

async function buscarProcesso(): Promise<void> {
  try {
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    // Normaliza número: remove caracteres não numéricos para a query, preserva original para logging
    const numeroBruto = (
      (docgo.getParam("numeroProcesso") as string) || ""
    ).trim();
    const numeroProcesso = numeroBruto.replace(/\D+/g, "");
    if (!numeroProcesso) {
      console.log(docgo.result(false, null, "numeroProcesso vazio"));
      return;
    }

    // Token pode vir de PDPJ_TOKEN ou TRIBUNAL_API_KEY
    const token = (
      docgo.getEnv("PDPJ_TOKEN") ||
      docgo.getEnv("TRIBUNAL_API_KEY") ||
      ""
    ).trim();
    if (!token) {
      console.log(
        docgo.result(false, null, "Token não configurado (PDPJ_TOKEN)")
      );
      return;
    }
    if (process.env.DOCGO_DEBUG === "1") {
      console.log("[debug] Token prefix:", token.slice(0, 20) + "...");
    }

    const baseUrl = (
      docgo.getEnv("PDPJ_BASE_URL") ||
      "https://portaldeservicos.pdpj.jus.br/api/v2"
    ).replace(/\/$/, "");

    docgo.info("Consultando PDPJ", { numeroProcesso, baseUrl });

    // 1. Busca resumida
    const listUrl = `${baseUrl}/processos?numeroProcesso=${encodeURIComponent(
      numeroProcesso
    )}`;
    let listData: any;
    try {
      listData = await httpGet(listUrl, token);
    } catch (e: any) {
      docgo.error("Erro na busca resumida", { erro: e.message });
      throw e;
    }

    // Extrai primeiro número retornado (se a API retorna lista/array)
    let numeroDetalhe = numeroProcesso;
    if (Array.isArray(listData) && listData.length > 0) {
      const first: PDPJProcessoResumo = listData[0];
      if (first.numero) numeroDetalhe = first.numero;
    } else if (listData && listData.items && listData.items.length > 0) {
      const first: PDPJProcessoResumo = listData.items[0];
      if (first.numero) numeroDetalhe = first.numero;
    } else if (listData && listData.numero) {
      numeroDetalhe = listData.numero;
    }

    // 2. Detalhe
    const detailUrl = `${baseUrl}/processos/${encodeURIComponent(
      numeroDetalhe
    )}`;
    let detail: any;
    try {
      detail = await httpGet(detailUrl, token);
    } catch (e: any) {
      docgo.error("Erro ao obter detalhe", { erro: e.message });
      throw e;
    }

    // Montagem do objeto Processo (tolerante a campos ausentes)
    const partesRaw: PDPJParteRaw[] =
      detail.partes || detail.partesProcesso || [];
    const movRaw: PDPJMovRaw[] = detail.movimentacoes || detail.movs || [];

    const processo: Processo = {
      numero: detail.numero || numeroDetalhe,
      tribunal: detail.tribunal || "PDPJ",
      vara: detail.vara || detail.orgaoJulgador || "(desconhecida)",
      classe: detail.classe || detail.classeProcessual || "(sem classe)",
      assunto: detail.assunto || detail.assuntoPrincipal || "(sem assunto)",
      dataDistribuicao: new Date(
        detail.dataDistribuicao || detail.distribuicao || Date.now()
      ),
      valorCausa: detail.valorCausa || detail.valorDaCausa || 0,
      status: (detail.status || detail.situacao || "ATIVO") as StatusProcesso,
      partes: mapearPartes(partesRaw),
      movimentacoes: mapearMovimentacoes(movRaw),
    };

    docgo.info("Processo obtido", { numero: processo.numero });
    console.log(
      docgo.result(true, {
        processo,
        brutoResumo: listData,
        brutoDetalhe: detail,
      })
    );
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
