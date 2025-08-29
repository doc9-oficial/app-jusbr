import docgo from "docgo-sdk";

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

async function consultarIntimacoes(): Promise<void> {
  try {
    const validation = docgo.validateParams();
    if (!validation.valid) {
      console.log(docgo.result(false, null, validation.error));
      return;
    }

    const token = docgo.getEnv("PDPJ_TOKEN");
    if (!token) {
      console.log(docgo.result(false, null, "Token não configurado"));
      return;
    }

    const numeroOab = docgo.getParam("numeroOab") as string;
    if (!numeroOab) {
      console.log(docgo.result(false, null, "numeroOab é obrigatório"));
      return;
    }

    const baseUrl = (
      docgo.getEnv("PDPJ_BASE_URL") || "https://portaldeservicos.pdpj.jus.br"
    ).replace(/\/$/, "");

    const params = new URLSearchParams({
      numeroProcesso: (docgo.getParam("numeroProcesso") as string) || "",
      ufOab: (docgo.getParam("ufOab") as string) || "RS",
      numeroOab,
      dataDisponibilizacaoInicio:
        (docgo.getParam("dataDisponibilizacaoInicio") as string) || "",
      dataDisponibilizacaoFim:
        (docgo.getParam("dataDisponibilizacaoFim") as string) || "",
    });

    const url = `${baseUrl}/api/v1/comunicacao?${params.toString()}`;
    const data = await httpGet(url, token);

    const intimacoes = Array.isArray(data)
      ? data.map((item: any) => ({
          id: item.id,
          numeroProcesso: item.numeroProcesso,
          dataDisponibilizacao: item.dataDisponibilizacao,
          tipo: item.tipo,
          assunto: item.assunto,
          conteudo: item.conteudo,
          lida: item.lida || false,
        }))
      : [];

    console.log(docgo.result(true, { intimacoes, total: intimacoes.length }));
  } catch (error: any) {
    console.log(docgo.result(false, null, error.message));
  }
}

consultarIntimacoes();
