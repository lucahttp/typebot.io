import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import type { MercadoPagoCredentials } from "@typebot.io/credentials/schemas";
import { isNotEmpty } from "@typebot.io/lib/utils";
import { Button } from "@typebot.io/ui/components/Button";
import { Dialog } from "@typebot.io/ui/components/Dialog";
import { Field } from "@typebot.io/ui/components/Field";
import { Input } from "@typebot.io/ui/components/Input";
import { MoreInfoTooltip } from "@typebot.io/ui/components/MoreInfoTooltip";
import { useEffect, useState } from "react";
import { TextLink } from "@/components/TextLink";
import { useUser } from "@/features/user/hooks/useUser";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { orpc } from "@/lib/queryClient";

type Props = {
  credentialsId: string;
  onUpdate: () => void;
};

export const UpdateMercadoPagoCredentialsModalContent = ({
  credentialsId,
  onUpdate,
}: Props) => {
  const { t } = useTranslate();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const [isUpdating, setIsUpdating] = useState(false);
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState<
    MercadoPagoCredentials["data"] & { name: string }
  >();

  const { data: existingCredentials } = useQuery(
    orpc.credentials.getCredentials.queryOptions({
      input: {
        scope: "workspace",
        credentialsId,
        workspaceId: workspace?.id ?? "",
      },
      enabled: !!workspace?.id,
    }),
  );

  useEffect(() => {
    if (!existingCredentials || mercadoPagoConfig) return;
    setMercadoPagoConfig({
      name: existingCredentials.name,
      live: (existingCredentials.data as any).live,
      test: (existingCredentials.data as any).test ?? {
        publicKey: "",
        accessToken: "",
      },
    });
  }, [existingCredentials, mercadoPagoConfig]);

  const { mutate } = useMutation(
    orpc.credentials.updateCredentials.mutationOptions({
      onMutate: () => setIsUpdating(true),
      onSettled: () => setIsUpdating(false),
      onSuccess: () => {
        onUpdate();
      },
    }),
  );

  const handleNameChange = (name: string) =>
    mercadoPagoConfig &&
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      name,
    });

  const handlePublicKeyChange = (publicKey: string) =>
    mercadoPagoConfig &&
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      live: { ...mercadoPagoConfig.live, publicKey },
    });

  const handleAccessTokenChange = (accessToken: string) =>
    mercadoPagoConfig &&
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      live: { ...mercadoPagoConfig.live, accessToken },
    });

  const handleTestPublicKeyChange = (publicKey: string) =>
    mercadoPagoConfig &&
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      test: { ...mercadoPagoConfig.test, publicKey },
    });

  const handleTestAccessTokenChange = (accessToken: string) =>
    mercadoPagoConfig &&
    setMercadoPagoConfig({
      ...mercadoPagoConfig,
      test: { ...mercadoPagoConfig.test, accessToken },
    });

  const updateCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !workspace?.id || !mercadoPagoConfig) return;
    mutate({
      credentialsId,
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
    <Dialog.Popup render={<form onSubmit={updateCreds} />}>
      <form className="flex flex-col gap-4">
        <Field.Root>
          <Field.Label>
            {t(
              "blocks.inputs.payment.settings.mercadoPagoConfig.accountName.label",
            )}
          </Field.Label>
          <Input
            defaultValue={mercadoPagoConfig?.name}
            onValueChange={handleNameChange}
            placeholder="Typebot Mercado Pago"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {t(
              "blocks.inputs.payment.settings.mercadoPagoConfig.testKeys.label",
            )}
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
              defaultValue={mercadoPagoConfig?.test?.publicKey}
            />
            <Input
              onValueChange={handleTestAccessTokenChange}
              placeholder="TEST_ACCESS_TOKEN"
              defaultValue={mercadoPagoConfig?.test?.accessToken}
              type="password"
            />
          </div>
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {t(
              "blocks.inputs.payment.settings.mercadoPagoConfig.liveKeys.label",
            )}
          </Field.Label>
          <div className="flex items-center gap-2">
            <Input
              onValueChange={handlePublicKeyChange}
              placeholder="LIVE_PUBLIC_KEY"
              defaultValue={mercadoPagoConfig?.live?.publicKey}
            />
            <Input
              onValueChange={handleAccessTokenChange}
              placeholder="LIVE_ACCESS_TOKEN"
              defaultValue={mercadoPagoConfig?.live?.accessToken}
              type="password"
            />
          </div>
        </Field.Root>

        <p>
          (
          {t("blocks.inputs.payment.settings.mercadoPagoConfig.findKeys.label")}{" "}
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
      </form>
      <Dialog.Footer>
        <Button
          type="submit"
          disabled={
            mercadoPagoConfig?.live.publicKey === "" ||
            mercadoPagoConfig?.name === "" ||
            mercadoPagoConfig?.live.accessToken === "" ||
            isUpdating
          }
        >
          {t("connect")}
        </Button>
      </Dialog.Footer>
    </Dialog.Popup>
  );
};
