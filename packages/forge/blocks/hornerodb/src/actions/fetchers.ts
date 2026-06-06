import type { FetcherDefinition } from "@typebot.io/forge/types";

// Shared fetchers used by every action to populate workspace / table dropdowns.
// They are wired to handlers in src/handlers/fetchersHandler.ts.

export const listTablesFetcher: FetcherDefinition = {
  id: "listTables",
};

export const fetchers: FetcherDefinition[] = [listTablesFetcher];
