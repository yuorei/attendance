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
- **Integration**: Slack API for slash commands and OAuth authentication
- **Frontend**: React Router 7 with TypeScript and Tailwind CSS on Cloudflare Workers

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

## Authentication

The system now supports Slack OAuth authentication for web access:
- Users can log in with their Slack account via `/login` route
- Authentication provides team_id, user_id, access_token, and channel access
- Dynamic channel selection: users can choose any accessible Slack channel
- Selected channel information is stored in localStorage for persistence
- Session data is stored in localStorage for frontend state management
- Protected routes require authentication to access attendance data

## API Endpoints

### Authentication
- `GET /auth/slack` - Initiate Slack OAuth flow
- `GET /auth/slack/callback` - Handle OAuth callback and return user session
- `GET /api/v1/slack/channels` - Get accessible Slack channels for authenticated user

### Attendance API
- `POST /api/v1/attendance/check-in` - Record check-in
- `POST /api/v1/attendance/check-out` - Record check-out  
- `GET /api/v1/attendance/monthly` - Get monthly attendance records
- `PUT /api/v1/attendance/edit` - Edit existing attendance record
- `DELETE /api/v1/attendance/:id` - Delete attendance record
- `POST /api/v1/attendance/workplace/subscribe` - Subscribe to workplace

### Legacy Slack Integration
- `POST /slack/slash/attendance` - Slack slash command handler

## Environment Variables

Required for deployment:
- `OTEL_ENDPOINT` - OpenTelemetry collector endpoint
- `OTEL_TOKEN` - Authentication token for telemetry
- `ENV` - Environment identifier (local/dev/prod)
- `SLACK_CLIENT_ID` - Slack OAuth Client ID for web authentication
- `SLACK_CLIENT_SECRET` - Slack OAuth Client Secret for web authentication  
- `SLACK_REDIRECT_URI` - Slack OAuth redirect URI (e.g., https://your-api-gateway-url/auth/slack/callback)

## Frontend Routes

- `/` - Home page with system overview and login options
- `/login` - Slack OAuth login page
- `/auth/callback` - OAuth callback processing page  
- `/attendance` - Protected attendance records dashboard
- `/attendance/:id` - Individual user attendance details

## Deployment Notes

### Slack App Configuration
To enable OAuth authentication, configure your Slack app with:
1. OAuth Redirect URLs: Add your API Gateway callback URL
2. OAuth Scopes: `users:read`, `channels:read`, `groups:read`, `channels:history`, `groups:history`
3. Set Client ID and Secret in Terraform variables

### Channel Management
- Users can dynamically select from their accessible Slack channels
- Channel selection persists across sessions
- Attendance records are tied to the selected channel
- Real-time channel switching without re-authentication

### Frontend Deployment
The React frontend is deployed on Cloudflare Workers and requires:
- `VITE_API_URL` environment variable pointing to your API Gateway endpoint

## Testing

The application includes a test endpoint at `/health` and manual testing via the `make req` command which sends a mock Slack event.