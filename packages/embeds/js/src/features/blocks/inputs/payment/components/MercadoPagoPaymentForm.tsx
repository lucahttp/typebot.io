import type { PaymentInputBlock } from "@typebot.io/blocks-inputs/payment/schema";
import type { RuntimeOptions } from "@typebot.io/chat-api/schemas";
import { getRuntimeVariable } from "@typebot.io/env/getRuntimeVariable";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { loadMercadoPago } from "../../../../../lib/mercadopago";
import type { BotContext } from "../../../../../types";

// Unique IDs per instance to avoid conflicts when re-mounted in SPA
let instanceCounter = 0;

type Props = {
  context: BotContext;
  options: PaymentInputBlock["options"] & RuntimeOptions;
  onSuccess: () => void;
  onTransitionEnd: () => void;
};

export function MercadoPagoPaymentForm(props: Props) {
  const [message, setMessage] = createSignal<string>();
  const [isLoading, setIsLoading] = createSignal(true);

  // Each mount gets its own unique container IDs — prevents stale brick from previous render
  const instanceId = ++instanceCounter;
  const PAYMENT_CONTAINER_ID = `mp-payment-container-${instanceId}`;
  const SLOT_NAME = `mercadopago-form-${instanceId}`;

  let paymentElementSlot: HTMLSlotElement | undefined;
  // Reference to the actual DOM container (outside shadow DOM)
  let paymentContainer: HTMLDivElement | undefined;
  let brickController: { unmount: () => void } | undefined;

  const mountBrick = async () => {
    const publicKey = props.options?.publicKey;
    if (!publicKey) {
      setMessage("Falta la clave pública de MercadoPago");
      setIsLoading(false);
      return;
    }

    const amount = Number(props.options?.amount);
    if (!amount || amount <= 0) {
      setMessage("Monto de pago inválido");
      setIsLoading(false);
      return;
    }

    if (!paymentContainer) {
      setMessage("Error interno: contenedor no disponible");
      setIsLoading(false);
      return;
    }

    try {
      const mp = await loadMercadoPago(publicKey);
      const bricksBuilder = mp.bricks();

      // Safe paymentMethods config — use "all" strings, never arrays or snake_case
      // maxInstallments must NOT be inside paymentMethods per the actual SDK schema
      const settings = {
        initialization: {
          amount,
          // preferenceId is optional — only needed for Checkout Pro flow
        },
        customization: {
          paymentMethods: {
            ticket: "all",
            creditCard: "all",
            debitCard: "all",
            mercadoPago: "all",
          },
          visual: {
            style: { theme: "default" as const },
            texts: {
              formSubmit: props.options?.labels?.button ?? "Pagar",
            },
          },
        },
        callbacks: {
          onReady: () => {
            setIsLoading(false);
            setTimeout(() => props.onTransitionEnd(), 500);
          },
          onSubmit: async ({ formData }: { formData: unknown }) => {
            try {
              setMessage(undefined);

              const { amount: rawAmount, currency, credentialsId } =
                props.options ?? {};
              if (!rawAmount || !currency || !credentialsId) {
                throw new Error("Faltan datos de configuración del pago");
              }

              const apiHost =
                props.context.apiHost ??
                getRuntimeVariable("NEXT_PUBLIC_VIEWER_URL");

              const response = await fetch(
                `${apiHost}/api/v1/payments/mercadopago`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    credentialsId,
                    formData,
                    isPreview: props.context.isPreview ?? false,
                  }),
                },
              );

              if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(
                  err?.error?.message ?? "Error procesando el pago",
                );
              }

              const result = await response.json();

              if (result.status === "approved" || result.status === "pending") {
                await props.onSuccess();
              } else {
                setMessage(
                  `Estado del pago: ${result.status ?? "desconocido"}`,
                );
              }
            } catch (err) {
              setMessage(
                err instanceof Error
                  ? err.message
                  : "Error al procesar el pago",
              );
              console.error("[MercadoPago] submit error:", err);
            }
          },
          onError: (error: { message: string }) => {
            setMessage(error.message);
            setIsLoading(false);
            console.error("[MercadoPago] brick error:", error);
          },
        },
      };

      brickController = await bricksBuilder.create(
        "payment",
        PAYMENT_CONTAINER_ID,
        settings,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo inicializar el pago";
      setMessage(msg);
      setIsLoading(false);
      console.error("[MercadoPago] init error:", err);
    }
  };

  const initShadowMount = () => {
    if (!paymentElementSlot) return;

    // The slot lives inside shadow DOM; we attach the real container to the host element
    const rootNode = paymentElementSlot.getRootNode() as ShadowRoot;
    const host = rootNode.host;

    const placeholder = document.createElement("div");
    placeholder.style.width = "100%";
    placeholder.slot = SLOT_NAME;
    host.appendChild(placeholder);

    const container = document.createElement("div");
    container.id = PAYMENT_CONTAINER_ID;
    placeholder.appendChild(container);
    paymentContainer = container;
  };

  onMount(() => {
    if (paymentElementSlot) {
      initShadowMount();
      mountBrick();
    }
  });

  onCleanup(() => {
    brickController?.unmount();
    brickController = undefined;
    // Remove the injected placeholder from the host element
    if (paymentContainer) {
      paymentContainer.closest(`[slot="${SLOT_NAME}"]`)?.remove();
    }
  });

  return (
    <div class="flex flex-col p-4 typebot-input w-full items-center">
      <Show when={isLoading()}>
        <div class="flex justify-center items-center py-4 animate-pulse text-gray-500">
          Cargando formulario de pago...
        </div>
      </Show>
      <slot name={SLOT_NAME} ref={paymentElementSlot} />
      <Show when={message()}>
        <div class="typebot-input-error-message mt-4 text-center animate-fade-in">
          {message()}
        </div>
      </Show>
    </div>
  );
}
