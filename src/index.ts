export * from './lib/nomd/nomd.js'
export * from './lib/notion/client.js'

// ---------------- test -----------------
import 'dotenv/config'
import { Noblog } from './lib/nomd/nomd.js'
import { GetAllPosts } from './lib/notion/client.js'
import { client } from './lib/notion/client.js'
import type { Page } from './lib/notion/object.js'

const test = async () => {
  const nob = new Noblog();
  let save_dir = "./src/pages/posts/"
  let sub_dir = "nob_children"

  const pages = await GetAllPosts()
  console.log(pages)
  const futs = pages.map(page => {
    return nob.FromPageid(page.id)
  })

  await Promise.all(futs)
  for (const pageid of Object.keys(nob.MdCollection)) {
    let fpath = sub_dir;
    if (pages.find(page => page.id === pageid))
      fpath = save_dir
    await nob.SaveJelly(pageid + ".md", fpath, nob.MdCollection[pageid])
  }
  console.log(`success: finish dump all files to "${save_dir}"`)
  // nob.FromPageid(res[5]?.id as any).then(
  //   res => {
  //     console.log(nob.MdCollection)
  //   }
  // )
}

test()
