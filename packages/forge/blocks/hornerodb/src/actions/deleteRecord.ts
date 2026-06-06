import { createAction, option } from "@typebot.io/forge";
import { auth } from "../auth";
import { fetchers, listTablesFetcher } from "./fetchers";

export const deleteRecord = createAction({
  auth,
  name: "Delete Record",
  fetchers,
  options: option.object({
    tableSlug: option.string.meta({
      layout: {
        label: "Table",
        isRequired: true,
        fetcher: listTablesFetcher.id,
      },
    }),
    recordId: option.string.meta({
      layout: {
        label: "Record ID",
        isRequired: true,
        helperText: "UUID of the record to delete.",
      },
    }),
  }),
});
