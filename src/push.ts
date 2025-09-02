#!/usr/bin/env node
import 'dotenv/config';
import { ServiceBusClient } from '@azure/service-bus';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { randomUUID } from 'node:crypto';

type Args = {
  queue?: string;
  topic?: string;
  destination?: string;
  type?: string;
  payload: string;
  correlationId?: string;
};

function getConnectionString(): string {
  const conn = process.env.SB_CONNECTION_STRING || process.env.SB_ENDPOINT;
  if (!conn || conn.trim().length === 0) {
    throw new Error(
      'Variável de ambiente SB_ENDPOINT (ou SB_CONNECTION_STRING) não encontrada. Configure no .env.',
    );
  }
  return conn.trim();
}

async function readAndValidateJson(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error(`Arquivo não encontrado: ${resolved}`);
  }
  if (!stat.isFile()) {
    throw new Error(`Caminho não é um arquivo: ${resolved}`);
  }

  let content: string;
  try {
    content = await fs.readFile(resolved, 'utf8');
  } catch {
    throw new Error(`Falha ao ler o arquivo: ${resolved}`);
  }

  try {
    // Validar JSON; se válido, retornamos stringificada com formatação compacta
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch {
    throw new Error(`Conteúdo não é um JSON válido: ${resolved}`);
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('push')
    .usage(
      'Uso: pnpm push [--destination <nome> --type queue|topic | --queue <nome> | --topic <nome>] --payload <arquivo.json>',
    )
    .strict()
    .showHelpOnFail(true)
    .fail((msg: string | null | undefined, _err: Error | null | undefined, y: Argv<unknown>) => {
      if (msg) console.error(msg);
      y.showHelp();
      process.exit(1);
    })
    .help('help')
    .alias('help', ['h', 'H'])
    .option('queue', {
      alias: ['q', 'Q'],
      type: 'string',
      describe: 'Nome da fila do Azure Service Bus',
    })
    .option('topic', {
      alias: ['t', 'T'],
      type: 'string',
      describe: 'Nome do tópico do Azure Service Bus',
    })
    .option('destination', {
      alias: ['d', 'D'],
      type: 'string',
      describe: 'Destino unificado (nome da fila ou tópico)',
    })
    .option('type', {
      alias: ['y', 'Y'],
      type: 'string',
      describe: 'Tipo do destino unificado: queue ou topic',
    })
    .option('payload', {
      alias: ['p', 'P'],
      type: 'string',
      demandOption: true,
      describe: 'Caminho do arquivo JSON a ser enviado',
    })
    .option('correlation-id', {
      alias: 'cid',
      type: 'string',
      describe: 'Correlation ID para rastreamento; se omitido, um UUID v4 será gerado',
    })
    .check((args: Record<string, unknown>) => {
      const queue = String(args.queue ?? '').trim();
      const topic = String(args.topic ?? '').trim();
      const destination = String(args.destination ?? '').trim();
      const kindRaw = String(args.type ?? '')
        .trim()
        .toLowerCase();

      if (!args.payload || String(args.payload).trim() === '') {
        throw new Error('Parâmetro obrigatório ausente: --payload');
      }

      const usingUnified = !!destination || !!kindRaw;
      const usingLegacy = !!queue || !!topic;

      if (usingUnified && usingLegacy) {
        throw new Error('Não misture --destination/--type com --queue/--topic');
      }

      if (usingUnified) {
        if (!destination || !kindRaw) {
          throw new Error('Para o modo unificado informe ambos: --destination e --type');
        }
        if (kindRaw !== 'queue' && kindRaw !== 'topic') {
          throw new Error("--type deve ser 'queue' ou 'topic'");
        }
        return true;
      }

      // Legacy
      if (!queue && !topic) {
        throw new Error('Informe --queue ou --topic (apenas um)');
      }
      if (queue && topic) {
        throw new Error('Use apenas um destino: --queue ou --topic');
      }
      return true;
    })
    .parseAsync();

  const {
    queue,
    topic,
    destination,
    type: kindInput,
    payload,
    correlationId: cliCid,
  } = argv as unknown as Args;

  try {
    const connectionString = getConnectionString();
    const jsonBody = await readAndValidateJson(payload);
    const correlationId = (cliCid && cliCid.trim()) || randomUUID();

    const client = new ServiceBusClient(connectionString);
    const kind = (kindInput || '').toLowerCase();
    const finalName =
      (destination && destination.trim()) ||
      (queue && queue.trim()) ||
      (topic && topic.trim()) ||
      '';
    const destinationKind =
      kind === 'queue' ? 'fila' : kind === 'topic' ? 'tópico' : queue ? 'fila' : 'tópico';
    const sender = client.createSender(finalName);
    try {
      await sender.sendMessages({
        body: JSON.parse(jsonBody),
        contentType: 'application/json',
        correlationId,
      });
      console.log(
        `Mensagem enviada com sucesso para ${destinationKind}: ${finalName} (correlationId=${correlationId})`,
      );
    } finally {
      await sender.close();
      await client.close();
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(`Erro: ${err.message}`);
    } else {
      console.error(`Erro: ${String(err)}`);
    }
    process.exitCode = 1;
  }
}

main();
