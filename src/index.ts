import 'dotenv/config'
import { GenMarkdown } from './lib/nomd.js'
import { getAllPosts } from './lib/notion/client.js'


getAllPosts().then(res => {
  // client.pages.retrieve({ page_id: res[0]?.id } as any).then(
  //   res => console.log(res))
  //
  GenMarkdown(res[5]?.id as any).then(
    res => { }
  )
  // client.blocks.children.list({ block_id: res[0]?.id } as any).then(
  //   res => console.log(res))
})
