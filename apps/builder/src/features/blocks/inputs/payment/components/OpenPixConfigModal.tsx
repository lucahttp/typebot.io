import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import type { OpenPixCredentials } from "@typebot.io/credentials/schemas";
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

export const OpenPixCreateModalContent = ({
  onNewCredentials,
  onClose,
}: Props) => {
  const { t } = useTranslate();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [openPixConfig, setOpenPixConfig] = useState<
    OpenPixCredentials["data"] & { name: string }
  >({
    name: "",
    live: { secretKey: "" },
    test: { secretKey: "" },
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
    setOpenPixConfig({
      ...openPixConfig,
      name,
    });

  const handleSecretKeyChange = (secretKey: string) =>
    setOpenPixConfig({
      ...openPixConfig,
      live: { secretKey },
    });

  const handleTestSecretKeyChange = (secretKey: string) =>
    setOpenPixConfig({
      ...openPixConfig,
      test: { secretKey },
    });

  const createCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !workspace?.id) return;
    mutate({
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
    <Dialog.Popup
      render={(props) => <form onSubmit={createCredentials} {...props} />}
    >
      <Dialog.Title>
        {t("blocks.inputs.payment.settings.openPixConfig.title.label")}
      </Dialog.Title>
      <Field.Root>
        <Field.Label>
          {t("blocks.inputs.payment.settings.openPixConfig.accountName.label")}
        </Field.Label>
        <Input onValueChange={handleNameChange} placeholder="Typebot" />
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
            type="password"
          />
        </div>
      </Field.Root>
      <p>
        ({t("blocks.inputs.payment.settings.openPixConfig.findKeys.label")}{" "}
        <TextLink href="https://app.openpix.com.br/home/developers" isExternal>
          {t(
            "blocks.inputs.payment.settings.openPixConfig.findKeys.here.label",
          )}
        </TextLink>
        )
      </p>
      <Dialog.Footer>
        <Button
          type="submit"
          disabled={
            openPixConfig.live.secretKey === "" ||
            openPixConfig.name === "" ||
            isCreating
          }
        >
          {t("connect")}
        </Button>
      </Dialog.Footer>
    </Dialog.Popup>
  );
};

export const OpenPixConfigModal = ({
  isOpen,
  onNewCredentials,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNewCredentials: (id: string) => void;
}) => (
  <Dialog.Root isOpen={isOpen} onClose={onClose}>
    <OpenPixCreateModalContent
      onNewCredentials={onNewCredentials}
      onClose={onClose}
    />
  </Dialog.Root>
);
