import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Get current directory and file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder
dotenv.config({ path: path.join(__dirname, ".env") });

const { Client } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Client
const pgClient = new Client({
  connectionString: process.env.POSTGRES_URL,
});

// PostgreSQL Setup
async function setupPostgres() {
  await pgClient.connect();
  console.log("✅ Connected to PostgreSQL");

  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS test (
      transaction_id UUID PRIMARY KEY,
      user_id VARCHAR(50),
      amount NUMERIC(10,2),
      merchant_name VARCHAR(100),
      location_city VARCHAR(50),
      location_country VARCHAR(50),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20),
      risk_score INT
    );
  `);
  console.log("📦 PostgreSQL test table created");

  // Insert a test record
  await pgClient.query(
    `
    INSERT INTO test (transaction_id, user_id, amount, merchant_name, location_city,location_country, status, risk_score)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [uuidv4(), "user123", 250.75, "Amazon", "Mumbai", "India", "legit", 12]
  );
  console.log("✅ Test transaction inserted into PostgreSQL");
}
// MongoDB Setup
async function setupMongo() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const transactionSchema = new mongoose.Schema({
    transactionId: String,
    rawData: Object,
    anomalies: Array,
    modelPrediction: Object,
    createdAt: { type: Date, default: Date.now },
  });

  const TransactionLog = mongoose.model("TransactionLog", transactionSchema);

  // Test insert
  await TransactionLog.create({
    transactionId: uuidv4(),
    rawData: { amount: 250.75, merchant: "Amazon", ip: "192.168.1.1" },
    anomalies: ["ip_blacklist"],
    modelPrediction: { fraud: true, confidence: 0.92 },
  });
  console.log("✅ Test document inserted into MongoDB");
}
// Run setup for both DBs
(async () => {
  try {
    await setupPostgres();
    await setupMongo();
  } catch (err) {
    console.error("❌ Database setup error:", err);
  }
})();
// Health Check Route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
