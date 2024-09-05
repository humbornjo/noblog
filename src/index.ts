export * from './lib/nomd/nomd.js'
export * from './lib/notion/client.js'

// ---------------- test -----------------
import 'dotenv/config'
import { Noblog } from './lib/nomd/nomd.js'
import { GetAllPosts } from './lib/notion/client.js'

const test = async () => {
  const pages = await GetAllPosts()
  const nob = new Noblog(pages);
  nob.Collect()
}

test()
