.PHONY: build run clean install test lint fmt vet help

# Variables
BINARY_NAME=sb-push
BUILD_DIR=bin
MAIN_FILE=main.go

# Default target
all: build

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_FILE)

# Run the application (requires payload file)
run:
	go run $(MAIN_FILE) $(ARGS)

# Install dependencies
install:
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR)
	go clean

# Run tests
test:
	go test -v ./...

# Lint the code
lint:
	@which golangci-lint > /dev/null || (echo "golangci-lint not found. Install it first." && exit 1)
	golangci-lint run

# Format the code
fmt:
	go fmt ./...

# Vet the code
vet:
	go vet ./...

# Check formatting
check-fmt:
	@test -z "$$(gofmt -l .)" || (echo "Code is not formatted. Run 'make fmt'" && exit 1)

# Development workflow - format, vet, and build
dev: fmt vet build

# Help
help:
	@echo "Available targets:"
	@echo "  build      - Build the application"
	@echo "  run        - Run the application (use ARGS='--help' for usage)"
	@echo "  install    - Install dependencies"
	@echo "  clean      - Clean build artifacts"
	@echo "  test       - Run tests"
	@echo "  lint       - Run linter (requires golangci-lint)"
	@echo "  fmt        - Format code"
	@echo "  vet        - Run go vet"
	@echo "  check-fmt  - Check if code is formatted"
	@echo "  dev        - Development workflow (fmt + vet + build)"
	@echo "  help       - Show this help"
	@echo ""
	@echo "Examples:"
	@echo "  make run ARGS='--help'"
	@echo "  make run ARGS='--destination test-queue --type queue --payload payload.json'"