import { PaymentProvider } from "@typebot.io/blocks-inputs/payment/constants";
import type { PaymentInputBlock } from "@typebot.io/blocks-inputs/payment/schema";
import type { RuntimeOptions } from "@typebot.io/chat-api/schemas";
import type { BotContext } from "../../../../../types";
import { MercadoPagoPaymentForm } from "./MercadoPagoPaymentForm";
import { OpenPixPaymentForm } from "./OpenPixPaymentForm";
import { StripePaymentForm } from "./StripePaymentForm";

type Props = {
  context: BotContext;
  options: PaymentInputBlock["options"] & RuntimeOptions;
  onSuccess: () => void;
  onTransitionEnd: () => void;
};

export const PaymentForm = (props: Props) => {
  const provider = props.options?.provider ?? PaymentProvider.STRIPE;

  if (provider === PaymentProvider.MERCADO_PAGO) {
    return (
      <MercadoPagoPaymentForm
        onSuccess={props.onSuccess}
        options={props.options}
        context={props.context}
        onTransitionEnd={props.onTransitionEnd}
      />
    );
  }

  if (provider === PaymentProvider.OPENPIX) {
    return (
      <OpenPixPaymentForm
        onSuccess={props.onSuccess}
        options={props.options}
        context={props.context}
        onTransitionEnd={props.onTransitionEnd}
      />
    );
  }

  return (
    <StripePaymentForm
      onSuccess={props.onSuccess}
      options={props.options}
      context={props.context}
      onTransitionEnd={props.onTransitionEnd}
    />
  );
};
