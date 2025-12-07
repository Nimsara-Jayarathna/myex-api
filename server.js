import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import { notFound, errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();

const corsOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : undefined;

app.use(
  cors(
    corsOrigins && corsOrigins.length > 0
      ? { origin: corsOrigins, credentials: true }
      : undefined
  )
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const { authorization, cookie, ...restHeaders } = req.headers || {};
    const sensitiveFields = [
      "password",
      "confirmPassword",
      "token",
      "secret",
      "apiKey",
      "accessToken",
      "refreshToken",
    ];
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const sanitizedBody = hasBody
      ? Object.fromEntries(
          Object.entries(req.body).map(([key, value]) => [
            key,
            sensitiveFields.includes(key) ? "[REDACTED]" : value,
          ])
        )
      : null;

    console.log("Request:", req.method, req.originalUrl);
    console.log("Headers:", restHeaders);
    if (sanitizedBody) console.log("Body:", sanitizedBody);

    next();
  });
}

app.get("/", (req, res) => {
  res.send("MyEx API is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
