import 'dotenv/config'

import retry from 'async-retry'
import { Client, APIResponseError } from '@notionhq/client'
import type { Page, QueryDatabaseResponse } from './object.js'
import type * as request from './request.ts'

const NOTION_API_SECRET = process.env.NOTION_API_SECRET ?? ''
const NOBLOG_DATABASE_ID = process.env.NOBLOG_DATABASE_ID ?? ''

export const client = new Client({
  auth: NOTION_API_SECRET,
})

const numberOfRetry = 2

export async function GetAllPosts(): Promise<Page[]> {
  const params: request.QueryDatabase = {
    database_id: NOBLOG_DATABASE_ID,
    filter: {
      and: [{
        property: 'publish',
        checkbox: { equals: true, },
      }]
    },
    sorts: [{
      property: 'date',
      direction: 'descending',
    }],
    page_size: 100,
  }

  let results: Page[] = []
  while (true) {
    const res = await retry(
      async (bail) => {
        try {
          return (await client.databases.query(
            params as any
          )) as QueryDatabaseResponse
        } catch (error: unknown) {
          if (error instanceof APIResponseError) {
            if (error.status && error.status >= 400 && error.status < 500) {
              bail(error)
            }
          }
          throw error
        }
      }, { retries: numberOfRetry, }
    )

    results = results.concat(res.results)
    if (!res.has_more) { break }
    params['start_cursor'] = res.next_cursor as string
  }

  return results
}


export async function GetPageMeta(page_id: string): Promise<Page> {
  while (true) {
    await retry(
      async (bail) => {
        try {
          return (await client.pages.retrieve({ page_id: page_id })) as Page
        } catch (error: unknown) {
          if (error instanceof APIResponseError) {
            if (error.status && error.status >= 400 && error.status < 500) {
              bail(error)
            }
          }
          throw error
        }
      }, { retries: numberOfRetry, }
    )
  }
}
