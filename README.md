# Azure Service Bus Push (Go)

CLI simples para publicar mensagens JSON em filas ou tópicos do Azure Service Bus, lendo a conexão de variáveis de ambiente (`.env`) e validando parâmetros, arquivo e JSON. Inclui suporte a Correlation ID e aliases para os principais comandos.

## Recursos

- Publica em fila ou tópico (um destino por vez)
- Lê `.env` (`SB_ENDPOINT` ou `SB_CONNECTION_STRING`)
- Valida caminho do arquivo e conteúdo JSON
- Define `contentType: application/json`
- Suporte a `--correlation-id` (gera UUID v4 se omitido)
- Aliases curtos: `-d`/`--destination`, `-y`/`--type`, `-q`/`--queue`, `-t`/`--topic`, `-p`/`--payload`, `-h`/`--help`, `--cid` para `--correlation-id`

## Requisitos

- Go 1.21+

## Instalação

```bash
go mod download
# ou usando Makefile
make install
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
./bin/push --destination <nome> --type queue --payload </caminho/para/payload.json>
./bin/push --destination <nome> --type topic --payload </caminho/para/payload.json>

# Aliases equivalentes
./bin/push -d <nome> -y queue -p </caminho/para/payload.json>
./bin/push -d <nome> -y topic -p </caminho/para/payload.json>

# Usando go run
go run main.go --destination <nome> --type queue --payload </caminho/para/payload.json>

# Usando Makefile
make run ARGS="--destination <nome> --type queue --payload </caminho/para/payload.json>"
```

Modo legado (também suportado):

```bash
./bin/push --queue <nome-da-fila> --payload </caminho/para/payload.json>
./bin/push --topic <nome-do-topico> --payload </caminho/para/payload.json>

# Aliases equivalentes
./bin/push -q <nome-da-fila> -p </caminho/para/payload.json>
./bin/push -t <nome-do-topico> -p </caminho/para/payload.json>
```

Correlation ID explícito (opcional):

```bash
./bin/push -q sq.pismo.onboarding.succeeded -p /Users/fabricio/onboarding.json --correlation-id 123e4567-e89b-12d3-a456-426614174000
```

Ajuda do CLI:

```bash
./bin/push --help
# ou
make run ARGS="--help"
```

## CLI (Opções)

- `--destination`, `-d`: nome do destino unificado (fila ou tópico)
- `--type`, `-y`: tipo do destino unificado: `queue` ou `topic`
- `--queue`, `-q`: nome da fila (modo legado; exclusivo com `--topic`)
- `--topic`, `-t`: nome do tópico (modo legado; exclusivo com `--queue`)
- `--payload`, `-p`: caminho do arquivo JSON a ser enviado (obrigatório)
- `--correlation-id`, `--cid`: Correlation ID; se omitido, gera-se um UUID v4
- `--help`, `-h`: exibe ajuda

Validações de uso:

- Use EITHER modo simplificado (obrigatório `--destination` E `--type`) OR modo legado (`--queue` XOR `--topic`)
- Não misture os modos simplificado e legado no mesmo comando
- `--payload` é obrigatório e deve apontar para um arquivo existente
- O conteúdo de `--payload` deve ser JSON válido
- Em erros de uso/validação, a ajuda é exibida e o processo encerra com código 1

## Exemplos

Fila (modo simplificado):

```bash
./bin/push --destination sq.pismo.onboarding.succeeded --type queue --payload /Users/fabricio/onboarding.json
```

Tópico (modo simplificado):

```bash
./bin/push --destination tp.pismo.onboarding.updates --type topic --payload /Users/fabricio/onboarding.json
```

Com Correlation ID explícito:

```bash
./bin/push -d sq.pismo.onboarding.succeeded -y queue -p /Users/fabricio/onboarding.json --correlation-id 123e4567-e89b-12d3-a456-426614174000
```

## Saída (logs)

Após enviar, o CLI registra:

```
Mensagem enviada com sucesso para <fila|tópico>: <nome> (correlationId=<id>)
```

## Scripts úteis

- `make build`: compila o binário Go
- `make run ARGS="..."`: executa o CLI com argumentos
- `make install`: instala dependências
- `make clean`: limpa artefatos de build
- `make test`: roda testes
- `make lint`: verifica problemas com linter (requer golangci-lint)
- `make fmt`: formata código com gofmt
- `make vet`: verifica problemas com go vet
- `make dev`: workflow de desenvolvimento (fmt + vet + build)

## Desenvolvimento

- Go 1.21+ com módulos Go
- Linting com golangci-lint (opcional)
- Formatação com gofmt
- Análise estática com go vet

## Estrutura

```
main.go         # CLI principal
go.mod          # Dependências Go
Makefile        # Scripts de build
.env.example    # Exemplo de conexão
```

## Dicas e Solução de Problemas

- Erro de ambiente: verifique se `SB_CONNECTION_STRING` ou `SB_ENDPOINT` está definido no `.env`.
- Permissões: a SAS policy precisa ter permissão de `Send` para a fila/tópico.
- JSON inválido: o CLI valida o conteúdo, corrija o arquivo informado em `--payload`.
- Conflito de destino: informe apenas um entre `--queue` e `--topic`.

---

Quer adicionar recursos como agendamento, `messageId`, ou propriedades personalizadas (`applicationProperties`)? Abra uma issue ou peça aqui e eu adiciono.
