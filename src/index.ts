export * from './lib/nomd.js'

// ---------------- test -----------------
import 'dotenv/config'
import { GenMarkdown, MarkdownCache } from './lib/nomd.js'
import { getAllPosts } from './lib/notion/client.js'


getAllPosts().then(res => {
  // client.pages.retrieve({ page_id: res[0]?.id } as any).then(
  //   res => console.log(res))
  //
  GenMarkdown(res[5]?.id as any).then(
    res => {
      console.log(MarkdownCache)
    }
  )
  // client.blocks.children.list({ block_id: res[0]?.id } as any).then(
  //   res => console.log(res))
})
