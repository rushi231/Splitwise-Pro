Splitwise Pro

A backend-focused expense-sharing application inspired by Splitwise. The project is being built to explore REST API design, PostgreSQL data modeling, authentication, event-based financial tracking, idempotent writes, and debt simplification.

Status: Work in progress. The backend is currently the main focus, with additional features planned.

Getting Started
Prerequisites
Node.js 18+
Docker and Docker Compose
npm
1. Clone the repository
git clone <your-repository-url>
cd Splitwise-Pro
2. Start PostgreSQL

From the backend directory:

cd splitwise-backend-js
docker compose up -d
3. Install dependencies
npm install
4. Configure environment variables

Copy the example environment file:

cp .env.example .env

The default database configuration is:

DATABASE_URL=postgresql://splitwise:splitwise@localhost:5432/splitwise
PORT=3000
NODE_ENV=development

For a non-development environment, set a strong JWT_SECRET in your environment before running the application.

5. Run database migrations
npm run migrate
6. Start the server

Development:

npm run dev

Production-style start:

npm start

The API runs on:

http://localhost:3000

Health check:

GET /health

Expected response:

{
  "status": "ok"
}
API Overview
Authentication
POST /users/signup
POST /users/login
GET  /users/me

Testing

Run the test suite with:

npm test

The current tests cover debt simplification, including:

Already-settled groups
Simple two-person debts
Multi-person debt simplification
Ledger consistency checks
Ignoring users with zero balances
Design Decisions
Integer cents

Amounts are stored as integer cents instead of floating-point dollars:

$10.50 → 1050

This avoids floating-point precision problems when calculating financial balances.

Append-only financial events

Financial history is represented as immutable events instead of repeatedly updating a balance column. This makes it possible to reconstruct the current state and inspect the history that produced it.

Database-level idempotency

Idempotency is enforced using a PostgreSQL unique constraint rather than relying only on application-level checks. This prevents race conditions where two identical requests arrive at nearly the same time.

Transactions

Group creation uses a database transaction so that creating the group and adding its creator as a member succeed or fail together.

Roadmap

Planned work includes:

Frontend UI
More complete expense editing and settlement flows
Recurring expenses
Additional API test coverage
Improved authorization and group membership checks
Production deployment
Additional Splitwise-style features
Disclaimer

