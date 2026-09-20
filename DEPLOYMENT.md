# Akshaanshh Jyotish — Deployment Handoff

## Purpose

This repository is ready to be handed to the hosting/deployment expert.

The project owner is not handling the hosting infrastructure directly. The hosting expert is responsible for deployment, server/runtime configuration, domain, HTTPS/SSL, and production environment configuration.

## Deployment Reference

- Branch: `prelaunch-hardening`
- Production handoff tag: `production-handoff-v1`
- Production handoff commit: `ed2e4df`

The local production build has passed successfully:

- Next.js compilation: passed
- TypeScript: passed
- Static page generation: `83/83`
- Page optimization: passed

## Application

- Next.js: `16.3.0`
- React: `19.2.8`
- React DOM: `19.2.8`
- TypeScript: `5.x`
- MongoDB / Mongoose
- Razorpay
- Resend

## Build and Start

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Start the production application:

```bash
npm start
```

The project uses the standard Next.js production server.

## Production Environment Variables

Configure the following as secure production environment variables:

```text
MONGODB_URI
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
JWT_SECRET
CUSTOMER_SESSION_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
SUPER_ADMIN_EMAIL
```

Do not commit any secret values to GitHub.

The repository ignores `.env*` files. Local `.env.local` is not tracked.

## Razorpay

Razorpay is currently configured/tested in Test Mode during development.

For the real production customer environment:

1. Use Razorpay Live Mode credentials.
2. Configure the production `RAZORPAY_KEY_ID`.
3. Configure the production `RAZORPAY_KEY_SECRET`.
4. Configure the production `RAZORPAY_WEBHOOK_SECRET`.
5. Configure the production webhook:

```text
https://YOUR-PRODUCTION-DOMAIN/api/payment/webhook
```

6. Verify payment creation, payment verification, booking confirmation, webhook processing, and refund/reconciliation before accepting real customer payments.

Do not put Razorpay secrets in the repository.

## MongoDB

Configure the production MongoDB connection through `MONGODB_URI`.

The production MongoDB instance/database and network access are part of the hosting/deployment configuration.

## Resend

Configure:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Ensure the production sending address/domain is correctly configured in Resend.

## Application URL

Set:

```text
NEXT_PUBLIC_APP_URL
```

to the final HTTPS production URL.

## Important Existing Architecture

Please deploy the existing application without changing its application architecture.

In particular, preserve:

- MongoDB/Mongoose models
- customer authentication
- admin authentication
- consultant lifecycle
- booking architecture
- availability/SlotHold behavior
- booking statuses
- payment statuses
- Razorpay payment flow
- refund/reconciliation flow
- customer booking/account linking
- historical booking price snapshots
- existing API routes

Any application-code changes should be coordinated with the project owner.

## Post-Deployment Smoke Tests

After deployment, verify:

### Public site
- Homepage
- About
- Services
- Consultants
- Contact
- Privacy Policy
- Terms & Conditions
- Cancellation/Refund Policy

### Customer
- Account creation
- Login/logout
- Forgot/reset password
- Multiple bookings under one customer account

### Booking
- Service selection
- Consultation mode
- Consultant/date/time selection
- Booking creation
- Booking ID
- Booking status

### Payment
- Razorpay order creation
- Payment verification
- Booking confirmation
- Production webhook
- Refund/reconciliation

### Guest tracking
- Booking ID + email
- OTP request
- OTP verification
- Booking display

### Admin
- Admin login
- Dashboard
- Services
- Consultants
- Availability
- Bookings
- Feedback
- Queries
- Settings
- Password reset

### Consultant
- Onboarding
- Availability
- Lifecycle/status
- Booking assignment

## Launch Requirement

The site should not be considered ready to accept real payments until:

- production domain and HTTPS are working
- production environment variables are configured
- MongoDB connection works
- Resend email works
- Razorpay Live Mode is configured
- production Razorpay webhook is configured
- payment verification succeeds
- booking confirmation succeeds
- refund/reconciliation is verified
- final smoke tests pass
