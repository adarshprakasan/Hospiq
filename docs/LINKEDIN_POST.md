# LinkedIn post draft

I built and deployed **Hospiq**, a hospital workflow web app that follows a patient visit from finding a doctor to collecting medication.

A patient can find a doctor, book a place in the outpatient queue, and show a visit QR at reception. Staff check them in and call them. The doctor records the consultation, and the patient can follow lab results and prescriptions. The pharmacist confirms availability, records payment, and marks the order collected.

Some of the features I built across those workflows:

• **Patient portal** with appointment tracking, saved doctors and hospitals, family access, medical records, and notifications.
• **Health profile** with a photo, height and weight, automatic BMI, Apple Health export and CSV imports, and a privacy center for data export and session management.
• **Clinical workspace** with private drafts, structured vitals, finalized notes with documented corrections, and lab order review.
• **Pharmacy tools** for partial availability, receipts, eligible refunds, and batch-level inventory.
• **Hospital administration** with registration approval, facility-scoped access, and metrics based on recorded queue and consultation events.

I built the frontend with **React, Vite, and Material UI**, and the REST API with **Node.js, Express, and Mongoose**. The demo runs on **Render**, with **MongoDB Atlas** for persistence and **Redis-compatible Valkey** for rate limiting. **GitHub Actions** runs the quality checks, including server integration tests and Playwright browser checks.

The most useful deployment lesson was learning to validate startup and sign-in separately. The API could report that MongoDB was ready while the demo account was still missing from the deployed database. Once I added the account to the right database, I verified the live sign-in API and signed in through the app.

Live demo: https://hospiq-demo.onrender.com
Source code: https://github.com/adarshprakasan/Hospiq

If you’ve worked on outpatient queues or pharmacy workflows, I’d like to hear which handoff causes the most friction in practice.

#React #NodeJS #MongoDB #HealthTech #FullStackDevelopment
