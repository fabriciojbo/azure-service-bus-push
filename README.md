# Azure Service Bus Push (Node + TypeScript)

CLI simples para publicar mensagens JSON em filas ou tópicos do Azure Service Bus, lendo a conexão de variáveis de ambiente (`.env`) e validando parâmetros, arquivo e JSON. Inclui suporte a Correlation ID e aliases para os principais comandos.

## Recursos

- Publica em fila ou tópico (um destino por vez)
- Lê `.env` (`SB_ENDPOINT` ou `SB_CONNECTION_STRING`)
- Valida caminho do arquivo e conteúdo JSON
- Define `contentType: application/json`
- Suporte a `--correlation-id` (gera UUID v4 se omitido)
- Aliases curtos: `-D`/`--destination`, `-Y`/`--type`, `-Q`/`--queue`, `-T`/`--topic`, `-P`/`--payload`, `-H`/`--help`, `--cid` para `--correlation-id`

## Requisitos

- Node.js 18+
- pnpm 8+

## Instalação

```bash
pnpm install
```

## Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto (veja `.env.example`). Aceitamos:

- `SB_CONNECTION_STRING`: conexão completa
- `SB_ENDPOINT`: alias aceito com o mesmo valor

Formato esperado (exemplo):

```env
SB_ENDPOINT=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=<policy-name>;SharedAccessKey=<key>
```

Observações:

- Utilize uma política SAS com permissões de envio no namespace/entidade desejada.
- Nunca versione sua `.env` (o projeto já ignora via `.gitignore`).

## Uso Rápido

Modo simplificado (recomendado):

```bash
pnpm push --destination <nome> --type queue --payload </caminho/para/payload.json>
pnpm push --destination <nome> --type topic --payload </caminho/para/payload.json>

# Aliases equivalentes
pnpm push -D <nome> -Y queue -P </caminho/para/payload.json>
pnpm push -D <nome> -Y topic -P </caminho/para/payload.json>
```

Modo legado (também suportado):

```bash
pnpm push --queue <nome-da-fila> --payload </caminho/para/payload.json>
pnpm push --topic <nome-do-topico> --payload </caminho/para/payload.json>

# Aliases equivalentes
pnpm push -Q <nome-da-fila> -P </caminho/para/payload.json>
pnpm push -T <nome-do-topico> -P </caminho/para/payload.json>
```

Correlation ID explícito (opcional):

```bash
pnpm push -Q sq.pismo.onboarding.succeeded -P /Users/fabricio/onboarding.json --correlation-id 123e4567-e89b-12d3-a456-426614174000
```

Ajuda do CLI:

```bash
pnpm push --help
# ou
pnpm push -H
```

## CLI (Opções)

- `--destination`, `-d`, `-D`: nome do destino unificado (fila ou tópico)
- `--type`, `-y`, `-Y`: tipo do destino unificado: `queue` ou `topic`
- `--queue`, `-q`, `-Q`: nome da fila (modo legado; exclusivo com `--topic`)
- `--topic`, `-t`, `-T`: nome do tópico (modo legado; exclusivo com `--queue`)
- `--payload`, `-p`, `-P`: caminho do arquivo JSON a ser enviado (obrigatório)
- `--correlation-id`, `--cid`: Correlation ID; se omitido, gera-se um UUID v4
- `--help`, `-h`, `-H`: exibe ajuda
- `--version`: exibe a versão do CLI

Validações de uso:

- Use EITHER modo simplificado (obrigatório `--destination` E `--type`) OR modo legado (`--queue` XOR `--topic`)
- Não misture os modos simplificado e legado no mesmo comando
- `--payload` é obrigatório e deve apontar para um arquivo existente
- O conteúdo de `--payload` deve ser JSON válido
- Em erros de uso/validação, a ajuda é exibida e o processo encerra com código 1

## Exemplos

Fila (modo simplificado):

```bash
pnpm push --destination sq.pismo.onboarding.succeeded --type queue --payload /Users/fabricio/onboarding.json
```

Tópico (modo simplificado):

```bash
pnpm push --destination tp.pismo.onboarding.updates --type topic --payload /Users/fabricio/onboarding.json
```

Com Correlation ID explícito:

```bash
pnpm push -D sq.pismo.onboarding.succeeded -Y queue -P /Users/fabricio/onboarding.json --correlation-id 123e4567-e89b-12d3-a456-426614174000
```

## Saída (logs)

Após enviar, o CLI registra:

```
Mensagem enviada com sucesso para <fila|tópico>: <nome> (correlationId=<id>)
```

## Scripts úteis

- `pnpm push`: executa o CLI de envio
- `pnpm dev`: roda o CLI em modo watch (para desenvolvimento)
- `pnpm build`: compila TypeScript
- `pnpm lint`: verifica problemas com ESLint
- `pnpm lint:fix`: corrige problemas autofixáveis
- `pnpm format`: formata com Prettier
- `pnpm format:check`: checa formatação

## Desenvolvimento

- TypeScript com `strict` e `ESNext`
- ESLint 9 (flat config) + `typescript-eslint` + `eslint-config-prettier`
- Prettier 3 com convenções (aspas simples, trailing comma, largura 100)

## Estrutura

```
src/
  push.ts        # CLI principal
.env.example     # Exemplo de conexão
eslint.config.mjs
.prettierrc.json
tsconfig.json
```

## Dicas e Solução de Problemas

- Erro de ambiente: verifique se `SB_CONNECTION_STRING` ou `SB_ENDPOINT` está definido no `.env`.
- Permissões: a SAS policy precisa ter permissão de `Send` para a fila/tópico.
- JSON inválido: o CLI valida o conteúdo, corrija o arquivo informado em `--payload`.
- Conflito de destino: informe apenas um entre `--queue` e `--topic`.

---

Quer adicionar recursos como agendamento, `messageId`, ou propriedades personalizadas (`applicationProperties`)? Abra uma issue ou peça aqui e eu adiciono.
