**Azure Service Bus Push (Node + TypeScript)**

- **Requisito:** `pnpm`, Node 18+
- **Env:** defina `SB_ENDPOINT` no `.env` (ou `SB_CONNECTION_STRING`).

Exemplo `.env` (veja `.env.example`):

```
SB_ENDPOINT=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=<policy-name>;SharedAccessKey=<key>
```

Instalação:

```
pnpm install
```

Uso:

```
pnpm push --queue <nome-da-fila> --payload </caminho/para/payload.json> [--correlation-id <id>]

# Aliases:
# -H = --help, -Q = --queue, -P = --payload
# Exemplos equivalentes:
pnpm push -Q <nome-da-fila> -P </caminho/para/payload.json>
```

Exemplos:

```
pnpm push --queue sq.pismo.onboarding.succeeded --payload /Users/fabricio/onboarding.json

# Com correlationId explícito
pnpm push --queue sq.pismo.onboarding.succeeded --payload /Users/fabricio/onboarding.json --correlation-id 123e4567-e89b-12d3-a456-426614174000
```

Validações realizadas:

- Caminho do arquivo informado existe e é um arquivo
- Conteúdo do arquivo é um JSON válido
- Envia mensagem com `contentType` = `application/json`

Notas:

- `SB_ENDPOINT` e `SB_CONNECTION_STRING` são aceitos; se ambos existirem, `SB_CONNECTION_STRING` tem prioridade.
- O body é enviado como string JSON.
- `--correlation-id` é opcional; se omitido, um UUID v4 é gerado automaticamente e exibido no log após o envio.
