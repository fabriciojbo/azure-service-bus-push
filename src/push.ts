#!/usr/bin/env node
import "dotenv/config";
import { ServiceBusClient } from "@azure/service-bus";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import yargs, { Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { randomUUID } from "node:crypto";

type Args = {
  queue: string;
  payload: string;
  correlationId?: string;
};

function getConnectionString(): string {
  const conn = process.env.SB_CONNECTION_STRING || process.env.SB_ENDPOINT;
  if (!conn || conn.trim().length === 0) {
    throw new Error(
      "Variável de ambiente SB_ENDPOINT (ou SB_CONNECTION_STRING) não encontrada. Configure no .env."
    );
  }
  return conn.trim();
}

async function readAndValidateJson(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch (err) {
    throw new Error(`Arquivo não encontrado: ${resolved}`);
  }
  if (!stat.isFile()) {
    throw new Error(`Caminho não é um arquivo: ${resolved}`);
  }

  let content: string;
  try {
    content = await fs.readFile(resolved, "utf8");
  } catch (err) {
    throw new Error(`Falha ao ler o arquivo: ${resolved}`);
  }

  try {
    // Validar JSON; se válido, retornamos stringificada com formatação compacta
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (err) {
    throw new Error(`Conteúdo não é um JSON válido: ${resolved}`);
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("push")
    .usage("Uso: pnpm push --queue <nome> --payload <arquivo.json>")
    .strict()
    .showHelpOnFail(true)
    .fail(
      (
        msg: string | null | undefined,
        _err: Error | null | undefined,
        y: Argv<unknown>
      ) => {
        if (msg) console.error(msg);
        y.showHelp();
        process.exit(1);
      }
    )
    .help("help")
    .alias("help", ["h", "H"])
    .option("queue", {
      alias: ["q", "Q"],
      type: "string",
      demandOption: true,
      describe: "Nome da fila do Azure Service Bus",
    })
    .option("payload", {
      alias: ["p", "P"],
      type: "string",
      demandOption: true,
      describe: "Caminho do arquivo JSON a ser enviado",
    })
    .option("correlation-id", {
      alias: "cid",
      type: "string",
      describe:
        "Correlation ID para rastreamento; se omitido, um UUID v4 será gerado",
    })
    .check((args: Record<string, unknown>) => {
      if (!args.queue || String(args.queue).trim() === "") {
        throw new Error("Parâmetro obrigatório ausente: --queue");
      }
      if (!args.payload || String(args.payload).trim() === "") {
        throw new Error("Parâmetro obrigatório ausente: --payload");
      }
      return true;
    })
    .parseAsync();

  const { queue, payload, correlationId: cliCid } = argv as unknown as Args;

  try {
    const connectionString = getConnectionString();
    const jsonBody = await readAndValidateJson(payload);
    const correlationId = (cliCid && cliCid.trim()) || randomUUID();

    const client = new ServiceBusClient(connectionString);
    const sender = client.createSender(queue);
    try {
      await sender.sendMessages({
        body: jsonBody,
        contentType: "application/json",
        correlationId,
      });
      console.log(
        `Mensagem enviada com sucesso para a fila: ${queue} (correlationId=${correlationId})`
      );
    } finally {
      await sender.close();
      await client.close();
    }
  } catch (err: any) {
    console.error(`Erro: ${err?.message ?? String(err)}`);
    process.exitCode = 1;
  }
}

main();
