package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/Azure/azure-sdk-for-go/sdk/messaging/azservicebus"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

type Config struct {
	Queue         string
	Topic         string
	Destination   string
	Type          string
	Payload       string
	CorrelationID string
}

func main() {
	if err := godotenv.Load(); err != nil {
		// .env file is optional, so we don't fail here
	}

	var config Config

	var rootCmd = &cobra.Command{
		Use:   "push",
		Short: "CLI para publicar mensagens JSON em filas ou tópicos do Azure Service Bus",
		Long: `CLI simples para publicar mensagens JSON em filas ou tópicos do Azure Service Bus,
lendo a conexão de variáveis de ambiente (.env) e validando parâmetros, arquivo e JSON.`,
		Example: `  push --destination sq.pismo.onboarding.succeeded --type queue --payload payload.json
  push --queue sq.pismo.onboarding.succeeded --payload payload.json
  push -D sq.pismo.onboarding.succeeded -Y queue -P payload.json`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runPush(config)
		},
	}

	rootCmd.Flags().StringVarP(&config.Queue, "queue", "q", "", "Nome da fila do Azure Service Bus")
	rootCmd.Flags().StringVarP(&config.Topic, "topic", "t", "", "Nome do tópico do Azure Service Bus")
	rootCmd.Flags().StringVarP(&config.Destination, "destination", "d", "", "Destino unificado (nome da fila ou tópico)")
	rootCmd.Flags().StringVarP(&config.Type, "type", "y", "", "Tipo do destino unificado: queue ou topic")
	rootCmd.Flags().StringVarP(&config.Payload, "payload", "p", "", "Caminho do arquivo JSON a ser enviado")
	rootCmd.Flags().StringVar(&config.CorrelationID, "correlation-id", "", "Correlation ID para rastreamento; se omitido, um UUID v4 será gerado")
	rootCmd.Flags().StringVar(&config.CorrelationID, "cid", "", "Alias para --correlation-id")

	rootCmd.MarkFlagRequired("payload")

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func getConnectionString() (string, error) {
	conn := os.Getenv("SB_CONNECTION_STRING")
	if conn == "" {
		conn = os.Getenv("SB_ENDPOINT")
	}
	if conn == "" || strings.TrimSpace(conn) == "" {
		return "", fmt.Errorf("variável de ambiente SB_ENDPOINT (ou SB_CONNECTION_STRING) não encontrada. Configure no .env")
	}
	return strings.TrimSpace(conn), nil
}

func readAndValidateJSON(filePath string) ([]byte, error) {
	resolved, err := filepath.Abs(filePath)
	if err != nil {
		return nil, fmt.Errorf("erro ao resolver caminho: %w", err)
	}

	stat, err := os.Stat(resolved)
	if err != nil {
		return nil, fmt.Errorf("arquivo não encontrado: %s", resolved)
	}
	if !stat.Mode().IsRegular() {
		return nil, fmt.Errorf("caminho não é um arquivo: %s", resolved)
	}

	file, err := os.Open(resolved)
	if err != nil {
		return nil, fmt.Errorf("falha ao ler o arquivo: %s", resolved)
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("falha ao ler o arquivo: %s", resolved)
	}

	var jsonData interface{}
	if err := json.Unmarshal(content, &jsonData); err != nil {
		return nil, fmt.Errorf("conteúdo não é um JSON válido: %s", resolved)
	}

	// Return compacted JSON
	compacted, err := json.Marshal(jsonData)
	if err != nil {
		return nil, fmt.Errorf("erro ao compactar JSON: %w", err)
	}

	return compacted, nil
}

func validateArgs(config Config) error {
	if config.Payload == "" {
		return fmt.Errorf("parâmetro obrigatório ausente: --payload")
	}

	usingUnified := config.Destination != "" || config.Type != ""
	usingLegacy := config.Queue != "" || config.Topic != ""

	if usingUnified && usingLegacy {
		return fmt.Errorf("não misture --destination/--type com --queue/--topic")
	}

	if usingUnified {
		if config.Destination == "" || config.Type == "" {
			return fmt.Errorf("para o modo unificado informe ambos: --destination e --type")
		}
		typeStr := strings.ToLower(config.Type)
		if typeStr != "queue" && typeStr != "topic" {
			return fmt.Errorf("--type deve ser 'queue' ou 'topic'")
		}
		return nil
	}

	// Legacy mode
	if config.Queue == "" && config.Topic == "" {
		return fmt.Errorf("informe --queue ou --topic (apenas um)")
	}
	if config.Queue != "" && config.Topic != "" {
		return fmt.Errorf("use apenas um destino: --queue ou --topic")
	}

	return nil
}

func runPush(config Config) error {
	if err := validateArgs(config); err != nil {
		return err
	}

	connectionString, err := getConnectionString()
	if err != nil {
		return err
	}

	jsonBody, err := readAndValidateJSON(config.Payload)
	if err != nil {
		return err
	}

	correlationID := strings.TrimSpace(config.CorrelationID)
	if correlationID == "" {
		correlationID = uuid.New().String()
	}

	client, err := azservicebus.NewClientFromConnectionString(connectionString, nil)
	if err != nil {
		return fmt.Errorf("erro ao criar cliente do Service Bus: %w", err)
	}
	defer client.Close(context.Background())

	// Determine destination name and type
	var finalName string
	var destinationKind string

	if config.Destination != "" {
		finalName = strings.TrimSpace(config.Destination)
		typeStr := strings.ToLower(config.Type)
		if typeStr == "queue" {
			destinationKind = "fila"
		} else {
			destinationKind = "tópico"
		}
	} else if config.Queue != "" {
		finalName = strings.TrimSpace(config.Queue)
		destinationKind = "fila"
	} else {
		finalName = strings.TrimSpace(config.Topic)
		destinationKind = "tópico"
	}

	sender, err := client.NewSender(finalName, nil)
	if err != nil {
		return fmt.Errorf("erro ao criar sender: %w", err)
	}
	defer sender.Close(context.Background())

	// Parse JSON for message body
	var messageBody interface{}
	if err := json.Unmarshal(jsonBody, &messageBody); err != nil {
		return fmt.Errorf("erro ao parsear JSON: %w", err)
	}

	contentType := "application/json"
	message := &azservicebus.Message{
		Body:          jsonBody,
		ContentType:   &contentType,
		CorrelationID: &correlationID,
	}

	ctx := context.Background()
	if err := sender.SendMessage(ctx, message, nil); err != nil {
		return fmt.Errorf("erro ao enviar mensagem: %w", err)
	}

	fmt.Printf("Mensagem enviada com sucesso para %s: %s (correlationId=%s)\n",
		destinationKind, finalName, correlationID)

	return nil
}