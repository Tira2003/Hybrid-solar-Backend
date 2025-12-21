# Hybrid Solar Backend

## Links

- **Website:** [https://fed-4-front-end-tirangaliyanage.netlify.app/](https://fed-4-front-end-tirangaliyanage.netlify.app/)
- **Frontend Repository:** [https://github.com/Tira2003/Solar_FE](https://github.com/Tira2003/Solar_FE)
- **Backend Repository:** [https://github.com/Tira2003/Hybrid-solar-Backend](https://github.com/Tira2003/Hybrid-solar-Backend)
- **Data API Repository:** [https://github.com/Tira2003/Hybrid-Solar-data-api](https://github.com/Tira2003/Hybrid-Solar-data-api)
- **Backend URL:** [https://fed-4-back-end-tiranga.onrender.com](https://fed-4-back-end-tiranga.onrender.com)
- **API URL:** [https://hybrid-solar-data-api.onrender.com](https://hybrid-solar-data-api.onrender.com)

## Description
A robust Node.js and TypeScript backend for a Hybrid Solar System Monitoring and Anomaly Detection platform. This system collects energy generation data from solar units, integrates with real-time weather data to detect anomalies using advanced algorithms, and provides management features for users, payments, and invoices.

## Features
- **Solar Unit Management**: Register and manage solar installations with capacity and location data.
- **Energy Tracking**: Record and monitor energy generation in real-time.
- **Anomaly Detection**: 
  - Detects panel failures, degradation, and sensor malfunctions.
  - Correlates generation data with local weather conditions.
  - Generates alerts for critical issues.
- **Weather Integration**: Automatic fetching of solar irradiance, temperature, and cloud cover data via Open-Meteo API.
- **User Authentication**: Secure user management using Clerk.
- **Billing & Payments**: Invoice generation and payment processing via Stripe.
- **Admin Dashboard**: Comprehensive view for administrators to monitor system health and users.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Clerk
- **Payments**: Stripe
- **Validation**: Zod
- **Scheduling**: node-cron

## Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- MongoDB Database (Local or Atlas)
- Clerk Account (for authentication)
- Stripe Account (for payments)

## Environment Variables
To run this project, you will need to add the following environment variables to your `.env` file in the `BACK END` directory.

```env
# Server Configuration
PORT=8000

# Database
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Frontend Integration
FRONTEND_URL=https://fed-4-front-end-tirangaliyanage.netlify.app
# or for local development: http://localhost:5173

# Optional: Cron Schedules
SYNC_CRON_SCHEDULE='0 0 * * *'
INVOICE_CRON_SCHEDULE='0 0 1 * *'
ANOMALY_CRON_SCHEDULE='0 1 * * *'

# Optional: External Data API
DATA_API_URL=http://localhost:8001
```

## Installation & Running

1. **Navigate to the backend directory**
   ```bash
   cd "BACK END"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development Mode**
   Runs the server with hot-reloading (using nodemon).
   ```bash
   npm run dev
   ```

4. **Build**
   Compile TypeScript to JavaScript.
   ```bash
   npm run build
   ```

5. **Production Start**
   Run the compiled code.
   ```bash
   npm start
   ```

## API Documentation
The API is organized into several key resources:

- `/api/solar-units`: Manage solar panel installations.
- `/api/energy-generation-records`: Submit and retrieve generation data.
- `/api/anomalies`: Access detected system anomalies.
- `/api/weather`: Get weather data for solar unit locations.
- `/api/invoices`: Manage billing and invoices.
- `/api/payments`: Handle Stripe payment sessions.
- `/api/users`: User management endpoints.
- `/api/admin`: Administrative dashboard statistics.

## Deployed Application
The frontend application is deployed and available at:
[Hybrid Solar Frontend](https://fed-4-front-end-tirangaliyanage.netlify.app)
