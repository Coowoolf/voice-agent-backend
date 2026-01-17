# Voice Agent Backend

Backend service for Voice Agent - Claude Code plugin that enables voice calls via Agora Conversational AI.

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/voice-agent?referralCode=voice-agent)

### Prerequisites

Before deploying, ensure you have:

1. **Agora Account** - Get credentials from [Agora Console](https://console.agora.io)
2. **Anthropic API Key** - Get from [Anthropic Console](https://console.anthropic.com)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AGORA_APP_ID` | Agora Application ID | ✅ |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate | ✅ |
| `AGORA_API_KEY` | Agora REST API Key | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API Key | ✅ |
| `JWT_SECRET` | JWT signing secret (auto-generated) | ✅ |
| `DATABASE_*` | PostgreSQL connection (provided by Railway) | Auto |
| `REDIS_*` | Redis connection (provided by Railway) | Auto |

### Deployment Steps

1. Click "Deploy on Railway" button above
2. Connect your GitHub account
3. Add PostgreSQL and Redis plugins
4. Configure environment variables
5. Deploy!

## Local Development

```bash
# Install dependencies
npm install

# Start with Docker Compose
docker-compose up -d

# Or run directly
npm run start:dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /calls/initiate` - Initiate a voice call
- `GET /calls/:id/status` - Get call status
- `POST /auth/login` - User authentication
