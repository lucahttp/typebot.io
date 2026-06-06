import { createFetcherHandler } from "@typebot.io/forge";
import { ky } from "@typebot.io/lib/ky";
import { parseUnknownError } from "@typebot.io/lib/parseUnknownError";
import { listTablesFetcher } from "../actions/fetchers";
import { searchRecords } from "../actions/searchRecords";
import type { HorneroDbTable, HorneroDbTablesResponse } from "../types";

export const listTablesFetcherHandler = createFetcherHandler(
  searchRecords,
  listTablesFetcher.id,
  async ({ credentials }) => {
    const baseUrl = credentials?.baseUrl;
    const apiKey = credentials?.apiKey;
    const workspaceId = credentials?.workspaceId;
    if (!baseUrl || !apiKey || !workspaceId) return { data: [] };
    try {
      const data = await ky
        .get(`${baseUrl}/api/v1/workspaces/${workspaceId}/tables`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        .json<HorneroDbTablesResponse>();
      return {
        data: (data.data ?? []).map((t: HorneroDbTable) => ({
          label: `${t.name} (${t.slug})`,
          value: t.slug,
        })),
      };
    } catch (error) {
      console.error("listTables fetcher failed", error);
      return { data: [], error: await parseUnknownError({ err: error }) };
    }
  },
);
