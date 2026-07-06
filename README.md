# Autopilot: AI Travel Copilot

Autopilot is a premium AI Travel Copilot that plans, optimizes, and books complete trips using a multi-agent architecture. The application is built with a modern, elegant, and futuristic design language.

## Architecture

- **Frontend**: Next.js 15 (App Router), TailwindCSS, Shadcn UI, Framer Motion, Zustand
- **Backend**: FastAPI, SQLAlchemy (Async), Celery, Redis
- **AI / Multi-Agent**: LangChain, LangGraph
- **Database**: PostgreSQL
- **Auth**: Clerk

## Folder Structure

- `/frontend`: The Next.js web application.
- `/backend`: The FastAPI application and LangGraph agents.
- `docker-compose.yml`: Local infrastructure (PostgreSQL, Redis).

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose

### Running Locally

1. **Start Infrastructure**:
   ```bash
   docker compose up -d
   ```

2. **Run Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn main:app --reload
   ```

3. **Run Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Multi-Agent System (LangGraph)

Autopilot uses specialized AI agents to orchestrate the perfect trip:
1. **Requirements Agent**: Extracts user preferences.
2. **Budget Agent**: Allocates budget dynamically.
3. **Transport Agent**: Finds optimal flights.
4. **Accommodation Agent**: Finds the best hotels.
5. **Itinerary Agent**: Generates the day-by-day plan.

## Design

Inspired by Apple, Linear, and Notion AI, Autopilot utilizes glassmorphism, subtle gradients, dark mode, and fluid micro-animations for a $100M SaaS feel.
