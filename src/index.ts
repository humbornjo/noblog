export * from './lib/nomd/nomd.js'
export * from './lib/notion/client.js'

// ---------------- test -----------------
import 'dotenv/config'
import { Noblog } from './lib/nomd/nomd.js'
import { GetAllPosts } from './lib/notion/client.js'

const nob = new Noblog();

GetAllPosts().then(res => {
  // client.pages.retrieve({ page_id: res[0]?.id } as any).then(
  //   res => console.log(res))
  //
  nob.FromPageid(res[5]?.id as any).then(
    res => {
      console.log(nob.MdCollection)
    }
  )
  // client.blocks.children.list({ block_id: res[0]?.id } as any).then(
  //   res => console.log(res))
})
