export * from './lib/nomd/nomd.js'
export * from './lib/notion/client.js'

// ---------------- test -----------------
import 'dotenv/config'
import { Noblog } from './lib/nomd/nomd.js'
import { GetAllPosts } from './lib/notion/client.js'
import { client } from './lib/notion/client.js'
import type { Page } from './lib/notion/object.js'

const nob = new Noblog();

GetAllPosts().then(res => {
  client.pages.retrieve({ page_id: res[0]?.id } as any).then(
    res => {
      const page = res as Page
      console.log(page.properties.date?.date)
    })

  // nob.FromPageid(res[5]?.id as any).then(
  //   res => {
  //     console.log(nob.MdCollection)
  //   }
  // )
})

const list2string = ["111", "hello", "world"]

console.log(JSON.stringify(list2string))
