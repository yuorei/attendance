# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slack attendance tracking application built with Go, deployed as AWS Lambda functions with DynamoDB storage and Terraform infrastructure management. The system processes Slack slash commands to track attendance and includes OpenTelemetry observability.

## Architecture

The application follows Clean Architecture with these layers:
- **Domain**: Core business entities (`domain/attendance.go`)
- **UseCase**: Business logic (`usecase/attendance_log.go`)
- **Adapter**: Interface adapters for infrastructure and presentation
  - **Infrastructure**: DynamoDB operations (`adapter/infrastructure/`)
  - **Presentation**: HTTP handlers and Slack integration (`adapter/presentation/`)
- **Driver**: External interfaces like router and database connections (`driver/`)

## Development Commands

### Server Development (from `/server` directory)
- `make dev` - Run server locally with ENV=local on port 8080
- `make up` - Start DynamoDB local with Docker Compose
- `make fmt` - Format Go code and tidy modules
- `make db_init` - Initialize local DynamoDB table
- `make db_list` - List DynamoDB tables locally
- `make req` - Send test request to local server
- `./build.sh` - Build Lambda binary and copy to Terraform environments

### Infrastructure Deployment (from `/terraform/environment/dev|prod`)
- `make apply` - Deploy infrastructure to AWS with OpenTelemetry configuration

### Local Development Setup
1. Start DynamoDB: `make up` (from server directory)
2. Initialize tables: `make db_init`
3. Run application: `make dev`
4. Test endpoint: `make req`

## Tech Stack

- **Backend**: Go 1.23.4 with Echo framework
- **Database**: DynamoDB (local and AWS)
- **Deployment**: AWS Lambda with API Gateway
- **Infrastructure**: Terraform modules for Lambda, DynamoDB, API Gateway
- **Observability**: OpenTelemetry (currently commented out in Lambda due to tracing issues)
- **Integration**: Slack API for slash commands

## Database Schema

### AttendanceLog Table
- Partition Key: `UserID` (String)
- Sort Key: `Timestamp` (String)
- GSI: `gsi_workplace_timestamp` for workplace-based queries

### WorkplaceBindings Table
- Stores user-workplace-channel associations
- GSI: `CompositeKey-index` for composite queries

## Key Files and Patterns

- `main.go` - Lambda entry point using Echo Lambda adapter
- `router/router.go` - Route definitions and middleware setup
- Environment detection via `ENV=local` for local vs Lambda execution
- DynamoDB operations use AWS SDK v2 with attribute value marshaling
- OpenTelemetry integration prepared but disabled in Lambda environment

## Environment Variables

Required for deployment:
- `OTEL_ENDPOINT` - OpenTelemetry collector endpoint
- `OTEL_TOKEN` - Authentication token for telemetry
- `ENV` - Environment identifier (local/dev/prod)

## Testing

The application includes a test endpoint at `/health` and manual testing via the `make req` command which sends a mock Slack event.