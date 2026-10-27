import {
  Client,
  isFullBlock,
  isFullDatabase,
  isFullPage,
  isNotionClientError,
} from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client";
import type { NotionReader } from "../noblog/types.js";

export interface NotionSourceConfig {
  readonly notionApiSecret: string;
  readonly databaseId: string;
}

export interface NotionSource extends NotionReader {
  listPages(): Promise<PageObjectResponse[]>;
}

export function createNotionSource(
  config: NotionSourceConfig,
): NotionSource {
  const client = new Client({ auth: config.notionApiSecret });
  return {
    listPages: () => listPages(client, config.databaseId),
    getPage: (pageId) => getPage(client, pageId),
    getBlockChildren: (blockId) => getBlockChildren(client, blockId),
  };
}

async function listPages(
  client: Client,
  databaseId: string,
): Promise<PageObjectResponse[]> {
  const database = await withRetry(() =>
    client.databases.retrieve({ database_id: databaseId }),
  );
  if (!isFullDatabase(database)) {
    throw new Error(`Notion database ${databaseId} is not a full database`);
  }

  const pages: PageObjectResponse[] = [];
  for (const source of database.data_sources) {
    let startCursor: string | undefined;
    do {
      const response = await withRetry(() =>
        client.dataSources.query({
          data_source_id: source.id,
          filter: {
            property: "publish",
            checkbox: { equals: true },
          },
          sorts: [{ property: "date", direction: "descending" }],
          page_size: 100,
          start_cursor: startCursor,
        }),
      );
      pages.push(...response.results.filter(isFullPage));
      startCursor = response.next_cursor ?? undefined;
      if (!response.has_more) break;
    } while (startCursor);
  }

  return pages;
}

async function getPage(
  client: Client,
  pageId: string,
): Promise<PageObjectResponse> {
  const page = await withRetry(() => client.pages.retrieve({ page_id: pageId }));
  if (!isFullPage(page)) {
    throw new Error(`Notion page ${pageId} is not a full page`);
  }
  return page;
}

async function getBlockChildren(
  client: Client,
  blockId: string,
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let startCursor: string | undefined;

  do {
    const response = await withRetry(() =>
      client.blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: startCursor,
      }),
    );
    blocks.push(...response.results.filter(isFullBlock));
    startCursor = response.next_cursor ?? undefined;
  } while (startCursor);

  return blocks;
}

const MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (attempt === MAX_ATTEMPTS - 1 || !isRetryable(error)) throw error;
      await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
}

function isRetryable(error: unknown): boolean {
  if (!isNotionClientError(error) || !("status" in error)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
