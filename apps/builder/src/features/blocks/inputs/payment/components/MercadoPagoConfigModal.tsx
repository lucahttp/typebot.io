import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import type { MercadoPagoCredentials } from "@typebot.io/credentials/schemas";
import { isNotEmpty } from "@typebot.io/lib/utils";
import { Button } from "@typebot.io/ui/components/Button";
import { Dialog } from "@typebot.io/ui/components/Dialog";
import { Field } from "@typebot.io/ui/components/Field";
import { Input } from "@typebot.io/ui/components/Input";
import { MoreInfoTooltip } from "@typebot.io/ui/components/MoreInfoTooltip";
import type React from "react";
import { useState } from "react";
import { TextLink } from "@/components/TextLink";
import { useUser } from "@/features/user/hooks/useUser";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { orpc, queryClient } from "@/lib/queryClient";
import { toast } from "@/lib/toast";

type Props = {
  onNewCredentials: (id: string) => void;
  onClose: () => void;
};

export const MercadoPagoCreateModalContent = ({
  onNewCredentials,
  onClose,
}: Props) => {
  const { t } = useTranslate();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState<
    MercadoPagoCredentials["data"] & { name: string }
  >({
    name: "",
    live: { publicKey: "", accessToken: "" },
    test: { publicKey: "", accessToken: "" },
  });

  const { mutate } = useMutation(
    orpc.credentials.createCredentials.mutationOptions({
      onMutate: () => setIsCreating(true),
      onSettled: () => setIsCreating(false),
      onError: (err) => {
        toast({
          description: err.message,
        });
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: orpc.credentials.listCredentials.key(),
        });
        onNewCredentials(data.credentialsId);
        onClose();
      },
    }),
  );

  const handleNameChange = (name: string) =>
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      name,
    });

  const handlePublicKeyChange = (publicKey: string) =>
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      live: { ...mercadoPagoConfig.live, publicKey },
    });

  const handleAccessTokenChange = (accessToken: string) =>
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      live: { ...mercadoPagoConfig.live, accessToken },
    });

  const handleTestPublicKeyChange = (publicKey: string) =>
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      test: { ...mercadoPagoConfig.test, publicKey },
    });

  const handleTestAccessTokenChange = (accessToken: string) =>
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      test: { ...mercadoPagoConfig.test, accessToken },
    });

  const createCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !workspace?.id) return;
    mutate({
      scope: "workspace",
      workspaceId: workspace.id,
      credentials: {
        data: {
          live: mercadoPagoConfig.live,
          test: {
            publicKey: isNotEmpty(mercadoPagoConfig.test?.publicKey)
              ? mercadoPagoConfig.test.publicKey
              : undefined,
            accessToken: isNotEmpty(mercadoPagoConfig.test?.accessToken)
              ? mercadoPagoConfig.test.accessToken
              : undefined,
          },
        },
        name: mercadoPagoConfig.name,
        type: "mercadopago",
      },
    });
  };

  return (
    <Dialog.Popup
      render={(props) => <form onSubmit={createCredentials} {...props} />}
    >
      <Dialog.Title>
        {t("blocks.inputs.payment.settings.mercadoPagoConfig.title.label")}
      </Dialog.Title>
      <Field.Root>
        <Field.Label>
          {t(
            "blocks.inputs.payment.settings.mercadoPagoConfig.accountName.label",
          )}
        </Field.Label>
        <Input
          onValueChange={handleNameChange}
          placeholder="Typebot Mercado Pago"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>
          {t("blocks.inputs.payment.settings.mercadoPagoConfig.testKeys.label")}
          <MoreInfoTooltip>
            {t(
              "blocks.inputs.payment.settings.mercadoPagoConfig.testKeys.infoText.label",
            )}
          </MoreInfoTooltip>
        </Field.Label>
        <div className="flex items-center gap-2">
          <Input
            onValueChange={handleTestPublicKeyChange}
            placeholder="TEST_PUBLIC_KEY"
          />
          <Input
            onValueChange={handleTestAccessTokenChange}
            placeholder="TEST_ACCESS_TOKEN"
            type="password"
          />
        </div>
      </Field.Root>
      <Field.Root>
        <Field.Label>
          {t("blocks.inputs.payment.settings.mercadoPagoConfig.liveKeys.label")}
        </Field.Label>
        <div className="flex items-center gap-2">
          <Input
            onValueChange={handlePublicKeyChange}
            placeholder="LIVE_PUBLIC_KEY"
          />
          <Input
            onValueChange={handleAccessTokenChange}
            placeholder="LIVE_ACCESS_TOKEN"
            type="password"
          />
        </div>
      </Field.Root>
      <p>
        ({t("blocks.inputs.payment.settings.mercadoPagoConfig.findKeys.label")}{" "}
        <TextLink
          href="https://www.mercadopago.com.br/developers/panel"
          isExternal
        >
          {t(
            "blocks.inputs.payment.settings.mercadoPagoConfig.findKeys.here.label",
          )}
        </TextLink>
        )
      </p>
      <Dialog.Footer>
        <Button
          type="submit"
          disabled={
            mercadoPagoConfig.live.publicKey === "" ||
            mercadoPagoConfig.name === "" ||
            mercadoPagoConfig.live.accessToken === "" ||
            isCreating
          }
        >
          {t("connect")}
        </Button>
      </Dialog.Footer>
    </Dialog.Popup>
  );
};

export const MercadoPagoConfigModal = ({
  isOpen,
  onNewCredentials,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNewCredentials: (id: string) => void;
}) => (
  <Dialog.Root isOpen={isOpen} onClose={onClose}>
    <MercadoPagoCreateModalContent
      onNewCredentials={onNewCredentials}
      onClose={onClose}
    />
  </Dialog.Root>
);
