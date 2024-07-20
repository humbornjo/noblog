import 'dotenv/config'
import { Client, isFullDatabase, isFullPage } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import { getAllPosts } from './lib/notion/client.js'


const NOTION_API_SECRET = process.env.NOTION_API_SECRET ?? ''
const client = new Client({
  auth: NOTION_API_SECRET,
})

getAllPosts().then(res => {
  // client.pages.retrieve({ page_id: res[0]?.id } as any).then(
  //   res => console.log(res))

  client.blocks.children.list({ block_id: res[0]?.id } as any).then(
    res => console.log(res))
})

client.blocks.retrieve({ block_id: "eee83245-9f75-458e-9e6d-d1b40603b442" })
  .then(res => console.log(res))






// const mdblocks = await n2m.pageToMarkdown("d462cfca-0a39-4b65-8430-4eae35edbb76", 2);
// const mdString = n2m.toMarkdownString(mdblocks);
// console.log(mdString.parent);
// console.log(mdblocks);


