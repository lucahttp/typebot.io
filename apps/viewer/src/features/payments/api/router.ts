import { mercadoPagoPayment } from "./mercadopago";
import { openPixPayment, openPixPaymentStatus } from "./openpix";

export const paymentsRouter = {
  openPixPayment,
  openPixPaymentStatus,
  mercadoPagoPayment,
};
