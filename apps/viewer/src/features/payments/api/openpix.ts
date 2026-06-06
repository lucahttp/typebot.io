import { ORPCError } from "@orpc/server";
import { publicProcedure } from "@typebot.io/config/orpc/viewer/middlewares";
import { decrypt } from "@typebot.io/credentials/decrypt";
import { getCredentials } from "@typebot.io/credentials/getCredentials";
import type { OpenPixCredentials } from "@typebot.io/credentials/schemas";
import ky from "ky";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const OPENPIX_API_BASE_URL = "https://api.openpix.com.br/api/v1/charge";
const OPENPIX_PAYMENT_STATUS_URL = "https://api.openpix.com.br/api/v1/charge";
const CONVERSION_FACTOR = 100;

const openPixPaymentInputSchema = z.object({
  credentialsId: z.string(),
  workspaceId: z.string(),
  amount: z.number().positive(),
  correlationId: z.string().optional(),
  customer: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      taxID: z.string().optional(),
    })
    .optional(),
  description: z.string().optional(),
});

const openPixPaymentOutputSchema = z.object({
  success: z.boolean(),
  charge: z.object({
    id: z.string(),
    qrCodeUrl: z.string(),
    paymentLinkUrl: z.string(),
    status: z.string(),
    brCode: z.string().optional(),
  }),
});

const openPixPaymentStatusInputSchema = z.object({
  credentialsId: z.string(),
  workspaceId: z.string(),
  correlationId: z.string(),
});

const openPixPaymentStatusOutputSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  paidAmount: z.number().optional(),
});

export const openPixPayment = publicProcedure
  .route({
    method: "POST",
    path: "/v1/payments/openpix",
    summary: "Create OpenPix payment",
    tags: ["Payments"],
  })
  .input(openPixPaymentInputSchema)
  .output(openPixPaymentOutputSchema)
  .handler(async ({ input }) => {
    const credentials = await getCredentials(
      input.credentialsId,
      input.workspaceId,
    );
    if (!credentials) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Invalid or missing OpenPix credentials",
      });
    }

    const decryptedData = (await decrypt(
      credentials.data,
      credentials.iv,
    )) as OpenPixCredentials["data"];
    const correlationId = input.correlationId ?? uuidv4();
    try {
      const { charge } = await ky
        .post(OPENPIX_API_BASE_URL, {
          headers: {
            "Content-Type": "application/json",
            Authorization: decryptedData.live.secretKey,
          },
          json: {
            correlationID: correlationId,
            value: Math.round(input.amount * CONVERSION_FACTOR),
          },
        })
        .json<{
          charge: {
            correlationID: string;
            qrCodeImage: string;
            paymentLinkUrl: string;
            status: string;
            brCode?: string;
          };
        }>();

      return {
        success: true,
        charge: {
          id: charge.correlationID,
          qrCodeUrl: charge.qrCodeImage,
          paymentLinkUrl: charge.paymentLinkUrl,
          status: charge.status,
          brCode: charge.brCode,
        },
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error ? error.message : "Payment processing failed",
      });
    }
  });

export const openPixPaymentStatus = publicProcedure
  .route({
    method: "POST",
    path: "/v1/payments/openpix/status",
    summary: "Check OpenPix payment status",
    tags: ["Payments"],
  })
  .input(openPixPaymentStatusInputSchema)
  .output(openPixPaymentStatusOutputSchema)
  .handler(async ({ input }) => {
    const credentials = await getCredentials(
      input.credentialsId,
      input.workspaceId,
    );
    if (!credentials) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Invalid or missing OpenPix credentials",
      });
    }

    const decryptedData = (await decrypt(
      credentials.data,
      credentials.iv,
    )) as OpenPixCredentials["data"];

    try {
      const response = await ky
        .get(`${OPENPIX_PAYMENT_STATUS_URL}/${input.correlationId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: decryptedData.live.secretKey,
          },
        })
        .json<{
          charge: {
            status: string;
            value?: number;
          };
        }>();
      return {
        success: true,
        status: response.charge.status,
        paidAmount: response.charge.value
          ? response.charge.value / CONVERSION_FACTOR
          : undefined,
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          error instanceof Error
            ? error.message
            : "Payment status check failed",
      });
    }
  });
