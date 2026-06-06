import { InputBlockType } from "@typebot.io/blocks-inputs/constants";
import type { InputBlock } from "@typebot.io/blocks-inputs/schema";
import type {
  ContinueChatResponse,
  RuntimeOptions,
} from "@typebot.io/chat-api/schemas";
import type { SessionStore } from "@typebot.io/runtime-session-store";
import { deepParseVariables } from "@typebot.io/variables/deepParseVariables";
import type { Variable } from "@typebot.io/variables/schemas";
import { injectVariableValuesInCardsBlock } from "./blocks/cards/injectVariableValuesInCardsBlock";
import { injectVariableValuesInButtonsInputBlock } from "./blocks/inputs/buttons/injectVariableValuesInButtonsInputBlock";
import { parseDateInput } from "./blocks/inputs/date/parseDateInput";
import { computePaymentInputRuntimeOptions } from "./blocks/inputs/payment/computePaymentInputRuntimeOptions";
import { injectVariableValuesInPictureChoiceBlock } from "./blocks/inputs/pictureChoice/injectVariableValuesInPictureChoiceBlock";
import { getPrefilledInputValue } from "./getPrefilledValue";

export const formatInputForChatResponse = async (
  block: InputBlock,
  {
    variables,
    sessionStore,
    isPreview,
    workspaceId,
    resultId,
  }: {
    variables: Variable[];
    sessionStore: SessionStore;
    isPreview: boolean;
    workspaceId: string;
    resultId?: string;
  },
): Promise<ContinueChatResponse["input"]> => {
  switch (block.type) {
    case InputBlockType.CHOICE: {
      return injectVariableValuesInButtonsInputBlock(block, {
        variables,
        sessionStore,
      });
    }
    case InputBlockType.PICTURE_CHOICE: {
      return injectVariableValuesInPictureChoiceBlock(block, {
        variables,
        sessionStore,
      });
    }
    case InputBlockType.NUMBER: {
      return deepParseVariables(
        {
          ...block,
          prefilledValue: getPrefilledInputValue(variables)(block),
        },
        {
          variables,
          sessionStore,
        },
      );
    }
    case InputBlockType.DATE: {
      return parseDateInput(block, {
        variables,
        sessionStore,
      });
    }
    case InputBlockType.RATING: {
      return deepParseVariables(
        {
          ...block,
          prefilledValue: getPrefilledInputValue(variables)(block),
        },
        {
          variables,
          sessionStore,
        },
      );
    }
    case InputBlockType.CARDS: {
      return injectVariableValuesInCardsBlock(block, {
        variables,
        sessionStore,
      });
    }
    default: {
      return deepParseVariables(
        {
          ...block,
          runtimeOptions: await computeRuntimeOptions(block, {
            sessionStore,
            variables,
            isPreview,
            workspaceId,
            resultId,
          }),
          prefilledValue: getPrefilledInputValue(variables)(block),
        },
        {
          variables,
          sessionStore,
        },
      );
    }
  }
};

const computeRuntimeOptions = (
  block: InputBlock,
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
): Promise<RuntimeOptions> | undefined => {
  switch (block.type) {
    case InputBlockType.PAYMENT: {
      return computePaymentInputRuntimeOptions(block.options, {
        sessionStore,
        variables,
        isPreview,
        workspaceId,
        resultId,
      });
    }
  }
};
