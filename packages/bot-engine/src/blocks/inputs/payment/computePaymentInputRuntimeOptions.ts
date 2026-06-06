import { ORPCError } from "@orpc/server";
import {
  defaultPaymentInputOptions,
  PaymentProvider,
} from "@typebot.io/blocks-inputs/payment/constants";
import type {
  PaymentInputBlock,
  PaymentInputRuntimeOptions,
} from "@typebot.io/blocks-inputs/payment/schema";
import { decrypt } from "@typebot.io/credentials/decrypt";
import { getCredentials } from "@typebot.io/credentials/getCredentials";
import type {
  MercadoPagoCredentials,
  OpenPixCredentials,
  StripeCredentials,
} from "@typebot.io/credentials/schemas";
import type { SessionStore } from "@typebot.io/runtime-session-store";
import { parseVariables } from "@typebot.io/variables/parseVariables";
import type { Variable } from "@typebot.io/variables/schemas";
import { MercadoPagoConfig, Preference } from "mercadopago";
import Stripe from "stripe";

export const computePaymentInputRuntimeOptions = (
  options: PaymentInputBlock["options"],
  {
    sessionStore,
    variables,
    isPreview,
    workspaceId,
    resultId,
  }: {
    sessionStore: SessionStore;
    variables: Variable[];
    isPreview: boolean;
    workspaceId: string;
    resultId?: string;
  },
): Promise<PaymentInputRuntimeOptions> => {
  const provider = options?.provider ?? defaultPaymentInputOptions.provider;

  switch (provider) {
    case PaymentProvider.STRIPE:
      return createStripePaymentIntent(options, {
        sessionStore,
        variables,
        isPreview,
        workspaceId,
      });
    case PaymentProvider.MERCADO_PAGO:
      return createMercadoPagoPreference(options, {
        sessionStore,
        variables,
        isPreview,
        workspaceId,
        resultId,
      });
    case PaymentProvider.OPENPIX:
      return createOpenPixPayment(options, {
        sessionStore,
        variables,
        isPreview,
        workspaceId,
      });
    default:
      throw new ORPCError("BAD_REQUEST", {
        message: "Unsupported payment provider",
      });
  }
};

const createStripePaymentIntent = async (
  options: PaymentInputBlock["options"],
  {
    sessionStore,
    variables,
    isPreview,
    workspaceId,
  }: {
    sessionStore: SessionStore;
    variables: Variable[];
    isPreview: boolean;
    workspaceId: string;
  },
): Promise<PaymentInputRuntimeOptions> => {
  if (!options?.credentialsId)
    throw new ORPCError("BAD_REQUEST", {
      message: "Missing credentialsId",
    });
  const stripeKeys = await getStripeInfo(options.credentialsId, workspaceId);
  if (!stripeKeys)
    throw new ORPCError("NOT_FOUND", {
      message: "Credentials not found",
    });
  const stripe = new Stripe(
    isPreview && stripeKeys?.test?.secretKey
      ? stripeKeys.test.secretKey
      : stripeKeys.live.secretKey,
    { apiVersion: "2024-09-30.acacia" },
  );
  const currency = options?.currency || defaultPaymentInputOptions.currency;
  const amount = Math.round(
    Number(parseVariables(options.amount, { variables, sessionStore })) *
      (isZeroDecimalCurrency(currency) ? 1 : 100),
  );
  if (Number.isNaN(amount))
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Could not parse amount, make sure your block is configured correctly",
    });
  // Create a PaymentIntent with the order amount and currency
  const receiptEmail = parseVariables(options.additionalInformation?.email, {
    variables,
    sessionStore,
  });
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    receipt_email: receiptEmail === "" ? undefined : receiptEmail,
    description: parseVariables(options.additionalInformation?.description, {
      variables,
      sessionStore,
    }),
    automatic_payment_methods: {
      enabled: true,
    },
  });

  if (!paymentIntent.client_secret)
    throw new ORPCError("BAD_REQUEST", {
      message: "Could not create payment intent",
    });

  const priceFormatter = new Intl.NumberFormat(
    options.currency === "EUR" ? "fr-FR" : undefined,
    {
      style: "currency",
      currency,
    },
  );

  return {
    paymentIntentSecret: paymentIntent.client_secret,
    publicKey:
      isPreview && stripeKeys.test?.publicKey
        ? stripeKeys.test.publicKey
        : stripeKeys.live.publicKey,
    amountLabel: priceFormatter.format(
      amount / (isZeroDecimalCurrency(currency) ? 1 : 100),
    ),
  };
};

const createMercadoPagoPreference = async (
  options: PaymentInputBlock["options"],
  {
    sessionStore,
    variables,
    isPreview,
    workspaceId,
    resultId,
  }: {
    sessionStore: SessionStore;
    variables: Variable[];
    isPreview: boolean;
    workspaceId: string;
    resultId?: string;
  },
): Promise<PaymentInputRuntimeOptions> => {
  if (!options?.credentialsId)
    throw new ORPCError("BAD_REQUEST", {
      message: "Missing credentialsId",
    });
  const keys = await getMercadoPagoInfo(options.credentialsId, workspaceId);
  if (!keys)
    throw new ORPCError("NOT_FOUND", {
      message: "Credentials not found",
    });

  const accessToken =
    isPreview && keys.test?.accessToken
      ? keys.test.accessToken
      : keys.live.accessToken;

  if (!accessToken)
    throw new ORPCError("BAD_REQUEST", {
      message: `Missing MercadoPago ${isPreview ? "test" : "live"} access token`,
    });

  const currency = options?.currency || defaultPaymentInputOptions.currency;
  const amount = Number(
    parseVariables(options.amount, { variables, sessionStore }),
  );
  if (Number.isNaN(amount) || amount <= 0)
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Could not parse amount, make sure your block is configured correctly",
    });

  const priceFormatter = new Intl.NumberFormat(
    options.currency === "EUR" ? "fr-FR" : undefined,
    {
      style: "currency",
      currency,
    },
  );

  let preferenceId: string | undefined;
  let paymentLinkUrl: string | undefined;

  try {
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const description = parseVariables(
      options.additionalInformation?.description,
      { variables, sessionStore },
    );
    const externalReference = resultId || "preview";

    const response = await preference.create({
      body: {
        items: [
          {
            id: "payment",
            title: description || "Payment",
            quantity: 1,
            unit_price: amount,
          },
        ],
        external_reference: externalReference,
      },
    });

    preferenceId = response.id;
    paymentLinkUrl = isPreview
      ? response.sandbox_init_point
      : response.init_point;
  } catch (error) {
    console.error("Failed to create MercadoPago preference:", error);
  }

  return {
    preferenceId,
    paymentLinkUrl,
    publicKey:
      isPreview && keys.test?.publicKey
        ? keys.test.publicKey
        : keys.live.publicKey,
    amountLabel: priceFormatter.format(amount),
  };
};

const createOpenPixPayment = async (
  options: PaymentInputBlock["options"],
  {
    sessionStore,
    variables,
    isPreview,
    workspaceId,
  }: {
    sessionStore: SessionStore;
    variables: Variable[];
    isPreview: boolean;
    workspaceId: string;
  },
): Promise<PaymentInputRuntimeOptions> => {
  if (!options?.credentialsId)
    throw new ORPCError("BAD_REQUEST", {
      message: "Missing credentialsId",
    });
  const openPixKeys = await getOpenPixInfo(options.credentialsId, workspaceId);
  if (!openPixKeys)
    throw new ORPCError("NOT_FOUND", {
      message: "Credentials not found",
    });

  const currency = options?.currency || defaultPaymentInputOptions.currency;
  const amount = Number(
    parseVariables(options.amount, { variables, sessionStore }),
  );
  if (Number.isNaN(amount))
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Could not parse amount, make sure your block is configured correctly",
    });

  const priceFormatter = new Intl.NumberFormat(
    options.currency === "EUR" ? "fr-FR" : undefined,
    {
      style: "currency",
      currency,
    },
  );

  return {
    publicKey:
      isPreview && openPixKeys.test?.secretKey
        ? openPixKeys.test.secretKey
        : openPixKeys.live.secretKey,
    amountLabel: priceFormatter.format(amount),
  };
};

const getStripeInfo = async (
  credentialsId: string,
  workspaceId: string,
): Promise<StripeCredentials["data"] | undefined> => {
  const credentials = await getCredentials(credentialsId, workspaceId);
  if (!credentials) return;
  return (await decrypt(
    credentials.data,
    credentials.iv,
  )) as StripeCredentials["data"];
};

const getMercadoPagoInfo = async (
  credentialsId: string,
  workspaceId: string,
): Promise<MercadoPagoCredentials["data"] | undefined> => {
  const credentials = await getCredentials(credentialsId, workspaceId);
  if (!credentials) return;
  return (await decrypt(
    credentials.data,
    credentials.iv,
  )) as MercadoPagoCredentials["data"];
};

const getOpenPixInfo = async (
  credentialsId: string,
  workspaceId: string,
): Promise<OpenPixCredentials["data"] | undefined> => {
  const credentials = await getCredentials(credentialsId, workspaceId);
  if (!credentials) return;
  return (await decrypt(
    credentials.data,
    credentials.iv,
  )) as OpenPixCredentials["data"];
};

// https://stripe.com/docs/currencies#zero-decimal
const isZeroDecimalCurrency = (currency: string) =>
  [
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
  ].includes(currency);
