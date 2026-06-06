import { ORPCError } from "@orpc/server";
import { publicProcedure } from "@typebot.io/config/orpc/viewer/middlewares";
import { decrypt } from "@typebot.io/credentials/decrypt";
import { getCredentials } from "@typebot.io/credentials/getCredentials";
import type { MercadoPagoCredentials } from "@typebot.io/credentials/schemas";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const createMercadoPagoPaymentSchema = z.object({
  sessionId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  payer: z.record(z.string(), z.unknown()).optional(),
  formData: z.record(z.string(), z.unknown()),
  credentialsId: z.string(),
  workspaceId: z.string(),
  isPreview: z.boolean().optional(),
});

export const mercadoPagoPayment = publicProcedure
  .route({
    method: "POST",
    path: "/v1/payments/mercadopago",
    summary: "Create MercadoPago payment",
    tags: ["Payments"],
  })
  .input(createMercadoPagoPaymentSchema)
  .output(z.any())
  .handler(async ({ input }) => {
    const { credentialsId, workspaceId } = input;

    const credentials = await getCredentials(credentialsId, workspaceId);
    if (!credentials) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Invalid or missing MercadoPago credentials",
      });
    }

    const decryptedData = (await decrypt(
      credentials.data,
      credentials.iv,
    )) as MercadoPagoCredentials["data"];

    const isPreview = input.isPreview ?? false;
    const accessToken = isPreview
      ? decryptedData.test?.accessToken
      : decryptedData.live.accessToken;

    if (!accessToken) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Missing MercadoPago ${
          isPreview ? "test" : "live"
        } access token`,
      });
    }

    try {
      const payment = new Payment(new MercadoPagoConfig({ accessToken }));
      const paymentBody = input.formData!;
      const response = await payment.create({
        body: paymentBody,
        requestOptions: { idempotencyKey: uuidv4() },
      });

      return response;
    } catch (error) {
      console.error(error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to process MercadoPago payment",
      });
    }
  });
