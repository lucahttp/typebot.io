import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import type { OpenPixCredentials } from "@typebot.io/credentials/schemas";
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

export const UpdateOpenPixCredentialsModalContent = ({
  credentialsId,
  onUpdate,
}: Props) => {
  const { t } = useTranslate();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const [isUpdating, setIsUpdating] = useState(false);
  const [openPixConfig, setOpenPixConfig] = useState<
    OpenPixCredentials["data"] & { name: string }
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
    if (!existingCredentials || openPixConfig) return;
    setOpenPixConfig({
      name: existingCredentials.name,
      live: (existingCredentials.data as any).live,
      test: (existingCredentials.data as any).test ?? { secretKey: "" },
    });
  }, [existingCredentials, openPixConfig]);

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
    openPixConfig &&
    setOpenPixConfig({
      ...openPixConfig,
      name,
    });

  const handleSecretKeyChange = (secretKey: string) =>
    openPixConfig &&
    setOpenPixConfig({
      ...openPixConfig,
      live: { secretKey },
    });

  const handleTestSecretKeyChange = (secretKey: string) =>
    openPixConfig &&
    setOpenPixConfig({
      ...openPixConfig,
      test: { secretKey },
    });

  const updateCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !workspace?.id || !openPixConfig) return;
    mutate({
      credentialsId,
      scope: "workspace",
      workspaceId: workspace.id,
      credentials: {
        data: {
          live: openPixConfig.live,
          test: {
            secretKey: isNotEmpty(openPixConfig.test?.secretKey)
              ? openPixConfig.test.secretKey
              : undefined,
          },
        },
        name: openPixConfig.name,
        type: "openpix",
      },
    });
  };

  return (
    <Dialog.Popup render={<form onSubmit={updateCreds} />}>
      <form className="flex flex-col gap-4">
        <Field.Root>
          <Field.Label>
            {t(
              "blocks.inputs.payment.settings.openPixConfig.accountName.label",
            )}
          </Field.Label>
          <Input
            defaultValue={openPixConfig?.name}
            onValueChange={handleNameChange}
            placeholder="Typebot"
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {t("blocks.inputs.payment.settings.openPixConfig.testKeys.label")}
            <MoreInfoTooltip>
              {t(
                "blocks.inputs.payment.settings.openPixConfig.testKeys.infoText.label",
              )}
            </MoreInfoTooltip>
          </Field.Label>
          <div className="flex items-center gap-2">
            <Input
              onValueChange={handleTestSecretKeyChange}
              placeholder="TEST_SECRET_KEY"
              defaultValue={openPixConfig?.test?.secretKey}
              type="password"
            />
          </div>
        </Field.Root>
        <Field.Root>
          <Field.Label>
            {t("blocks.inputs.payment.settings.openPixConfig.liveKeys.label")}
          </Field.Label>
          <div className="flex items-center gap-2">
            <Input
              onValueChange={handleSecretKeyChange}
              placeholder="LIVE_SECRET_KEY"
              defaultValue={openPixConfig?.live?.secretKey}
              type="password"
            />
          </div>
        </Field.Root>

        <p>
          ({t("blocks.inputs.payment.settings.openPixConfig.findKeys.label")}{" "}
          <TextLink
            href="https://app.openpix.com.br/home/developers"
            isExternal
          >
            {t(
              "blocks.inputs.payment.settings.openPixConfig.findKeys.here.label",
            )}
          </TextLink>
          )
        </p>
      </form>
      <Dialog.Footer>
        <Button
          type="submit"
          disabled={
            openPixConfig?.live.secretKey === "" ||
            openPixConfig?.name === "" ||
            isUpdating
          }
        >
          {t("connect")}
        </Button>
      </Dialog.Footer>
    </Dialog.Popup>
  );
};
