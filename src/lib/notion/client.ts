import "dotenv/config";
import retry from "async-retry";
import { Client, isNotionClientError } from "@notionhq/client";

import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  GetDatabaseParameters,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDataSourceParameters,
  QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

const NOTION_API_SECRET = process.env.NOTION_API_SECRET ?? "";
const NOBLOG_DATABASE_ID = process.env.NOBLOG_DATABASE_ID ?? "";

export const client = new Client({
  auth: NOTION_API_SECRET,
});

const numberOfRetry = 2;

export async function ListPages(): Promise<PageObjectResponse[]> {
  const respDatabase = (await client.databases.retrieve({
    database_id: NOBLOG_DATABASE_ID,
  } as GetDatabaseParameters)) as DatabaseObjectResponse;

  const reqDataSources: Array<QueryDataSourceParameters> =
    respDatabase.data_sources.map((source) => ({
      data_source_id: source.id,
      filter: {
        and: [
          {
            property: "publish",
            checkbox: { equals: true },
          },
        ],
      },
      sorts: [
        {
          property: "date",
          direction: "descending",
        },
      ],
      page_size: 100,
    }));

  let results = [] as Array<PageObjectResponse>;
  for (const req of reqDataSources) {
    let params: QueryDataSourceParameters = req;
    while (true) {
      const resp: QueryDataSourceResponse = await retry(
        async (bail) => {
          try {
            return client.dataSources.query(params);
          } catch (error: unknown) {
            if (isNotionClientError(error)) {
              bail(error);
            }
            throw error;
          }
        },
        { retries: numberOfRetry },
      );

      results = results.concat(resp.results as PageObjectResponse[]);
      if (!resp.has_more) {
        break;
      }
      params.start_cursor = resp.next_cursor as string;
    }
  }

  return results;
}

export async function GetPage(page_id: string): Promise<PageObjectResponse> {
  const result = await retry(
    async (bail) => {
      try {
        return (await client.pages.retrieve({
          page_id: page_id,
        })) as PageObjectResponse;
      } catch (error: unknown) {
        if (isNotionClientError(error)) {
          bail(error);
        }
        throw error;
      }
    },
    { retries: numberOfRetry },
  );
  return result;
}

export async function GetBlockChildren(
  block_id: string,
  totalPage: number | null | undefined,
) {
  const results: Array<BlockObjectResponse> = [];
  let pageCount = 0;
  let start_cursor = undefined;

  do {
    const response = (await client.blocks.children.list({
      start_cursor: start_cursor,
      block_id: block_id,
    } as ListBlockChildrenParameters)) as ListBlockChildrenResponse;
    results.push(...(response.results as BlockObjectResponse[]));

    start_cursor = response?.next_cursor;
    pageCount += 1;
  } while (
    start_cursor != null &&
    (totalPage == null || pageCount < totalPage)
  );

  ModifyNumberedListObject(results);
  return results;
}

function ModifyNumberedListObject(blocks: BlockObjectResponse[]) {
  let numberedListIndex = 0;
  for (const block of blocks) {
    if ("type" in block && block.type === "numbered_list_item") {
      // add numbers
      // @ts-ignore
      block.numbered_list_item.number = ++numberedListIndex;
    } else {
      numberedListIndex = 0;
    }
  }
}
