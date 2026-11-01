# SuperWise API

Backend for **SuperWise**, a services marketplace where clients hire verified
workers (electricians, painters, carpenters…), follow the work's progress, chat
in real time and pay online. Admins verify workers' ID proofs, manage
categories and handle complaints.

Frontend: [superWiseFront](https://github.com/M-Ali-Haninsha/superWiseFront) · Live: https://superwise.vercel.app

## Stack

Node.js · Express 5 · MongoDB (Mongoose) · Socket.IO · JWT · Cloudinary ·
Razorpay · Nodemailer · zod · node:test + supertest

## Architecture

```
routes/        URL → middleware chain → controller (auth role, validation, uploads)
controllers/   read the request, call a service, send the response
services/      business logic and database access; throw HttpErrors
middleware/    authenticate(role), validate(zod), uploads, rate limit, error handler
models/        Mongoose schemas
socket/        authenticated Socket.IO chat
validators/    zod request schemas
config/        environment loading and validation
tests/         API tests against an in-memory MongoDB
```

### Conventions

- **Errors** use HTTP status codes with a `{ "message": "..." }` body:
  400 invalid input, 401 not logged in / session expired, 403 wrong role or
  blocked account, 404 not found, 409 duplicate, 422 not allowed yet.
- **Auth**: login returns a JWT holding only `{ sub, role }`. Every protected
  route declares its role, e.g. `authenticate("worker")`. Blocked accounts are
  rejected on every request, and workers cannot log in until an admin verifies them.
- **Private data** never leaves the server: passwords and ID proofs are
  `select: false`, and public worker endpoints omit other clients' requests and income.
- **Signup** emails a 4-digit OTP that is stored hashed per email, expires after
  10 minutes and allows 5 attempts.
- **Uploads** stream from memory to Cloudinary. ID proofs are stored as private
  assets; admins get a 5-minute signed link.
- **Payments**: the amount comes from the database, and work is marked paid only
  after the Razorpay signature is verified. Each payment is credited once
  (90% worker / 10% platform).

## Running locally

```bash
cp .env.example .env   # fill in the values
npm install
npm run dev            # http://localhost:3000, restarts on changes
```

| Script | |
|---|---|
| `npm start` | start the server |
| `npm run dev` | start with auto-restart |
| `npm test` | run the API tests (no external services needed) |
| `npm run lint` | ESLint |

The tests start an in-memory MongoDB and replace email, Cloudinary and Razorpay
with fakes, so they need no `.env` and touch no real data.

## Deployment (Render)

- Start command: `npm start`. Set the variables from `.env.example`;
  `CORS_ORIGIN=https://superwise.vercel.app` restricts browser access to the frontend.
- One-off after upgrading from the old version: `node scripts/normalize-emails.js`
  lowercases stored emails, since logins now match emails case-insensitively.
