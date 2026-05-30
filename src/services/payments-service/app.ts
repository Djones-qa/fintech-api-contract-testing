import express, { Request, Response, NextFunction } from "express";
import { CreatePaymentRequestSchema } from "../../schemas/payment.schema";
import { Payment, CreatePaymentRequest } from "../../types";

const app = express();
app.use(express.json());

// ─── In-memory store ──────────────────────────────────────────────────────────

const payments: Map<string, Payment> = new Map();

function seedPayments(): void {
  const seed: Payment = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 250.0,
    currency: "USD",
    status: "completed",
    method: "bank_transfer",
    sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
    destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
    description: "Invoice payment #1042",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:31:00.000Z",
  };
  payments.set(seed.id, seed);
}

seedPayments();

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "payments-service" });
});

app.get("/payments", (_req: Request, res: Response) => {
  const data = Array.from(payments.values());
  res.json({
    data,
    pagination: {
      page: 1,
      pageSize: 20,
      total: data.length,
      totalPages: 1,
    },
  });
});

app.get("/payments/:id", (req: Request, res: Response) => {
  const payment = payments.get(req.params["id"] ?? "");
  if (!payment) {
    return res.status(404).json({
      code: "PAYMENT_NOT_FOUND",
      message: `Payment ${req.params["id"]} not found`,
      requestId: `req_${Date.now()}`,
    });
  }
  return res.json(payment);
});

app.post("/payments", (req: Request, res: Response) => {
  const parsed = CreatePaymentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      code: "VALIDATION_ERROR",
      message: "Invalid payment request",
      details: parsed.error.flatten(),
      requestId: `req_${Date.now()}`,
    });
  }

  const body = parsed.data as CreatePaymentRequest;
  const newPayment: Payment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...body,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payments.set(newPayment.id, newPayment);
  return res.status(201).json(newPayment);
});

app.patch("/payments/:id/cancel", (req: Request, res: Response) => {
  const payment = payments.get(req.params["id"] ?? "");
  if (!payment) {
    return res.status(404).json({
      code: "PAYMENT_NOT_FOUND",
      message: `Payment ${req.params["id"]} not found`,
      requestId: `req_${Date.now()}`,
    });
  }
  if (payment.status === "completed") {
    return res.status(409).json({
      code: "PAYMENT_ALREADY_COMPLETED",
      message: "Cannot cancel a completed payment",
      requestId: `req_${Date.now()}`,
    });
  }
  const updated: Payment = { ...payment, status: "cancelled", updatedAt: new Date().toISOString() };
  payments.set(updated.id, updated);
  return res.json(updated);
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    requestId: `req_${Date.now()}`,
  });
});

export { app, payments, seedPayments };
