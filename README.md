# App jusbr

Aplicação DocGo para operações jurídicas (PDPJ):

- `buscarProcesso`: Consulta resumo e detalhe de um processo no portal PDPJ.
- `peticionar`: (placeholder) Protocolar petição.
- `extrairAdvogado`: (placeholder) Extrair dados de advogado.

## Estrutura

```
app-jusbr/
  manifest.json
  src/
    buscarProcesso.ts
    peticionar.ts
    extrairAdvogado.ts
  dist/ (build gerado por tsc)
  package.json
  tsconfig.json
  .env (opcional)
```

## Variáveis de Ambiente (.env)

| Chave                | Descrição                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `PDPJ_TOKEN`         | JWT válido para chamadas autenticadas                               |
| `PDPJ_JSESSIONID`    | (Opcional) Sessão quando necessário                                 |
| `PDPJ_COOKIE`        | Cookie completo sobrescreve JSESSIONID                              |
| `PDPJ_BASE_URL`      | Base da API (default `https://portaldeservicos.pdpj.jus.br/api/v2`) |
| `PDPJ_EXTRA_HEADERS` | JSON de headers adicionais                                          |
| `DOCGO_DEBUG`        | `1` para logs de debug                                              |

Exemplo `.env`:

```
PDPJ_TOKEN=eyJhbGciOi...
PDPJ_JSESSIONID=ABCDEF1234567890
DOCGO_DEBUG=1
```

## Execução (via DocGo)

```
./docgo jusbr buscarProcesso 00000000000000000000
```

## Execução Direta (dev)

```
node dist/buscarProcesso.js 00000000000000000000
```

(O SDK infere função e manifest.)

## Build

```
npm install
npm run build
```

## Fluxo `buscarProcesso`

1. Normaliza número (remove não dígitos).
2. GET `/processos?numeroProcesso=...` (resumo).
3. Extrai número final.
4. GET `/processos/{numero}` (detalhe).
5. Monta objeto `Processo` (campos tolerantes a ausência).
6. Retorna JSON padronizado via `docgo.result`.

## Erros 401

Verifique:

- Token expirado (campo `exp`).
- Necessidade de cookie de sessão.
- Headers obrigatórios (User-Agent, Accept-Language, Referer, Origin).

## Próximos Passos

- Implementar `peticionar` real.
- Implementar `extrairAdvogado` real.
- Cache local simples para respostas recentes.
- Tests automatizados (mock fetch).

## Licença

MIT.
