import * as path from "path"
import { Logger } from "tslog";

import { Noblog } from "../lib/nomd/nomd.js";
import { GetAllPosts } from "../lib/notion/client.js";

let v: boolean = false;
let save_dir = "./content/markdown"
let sub_dir = "sub"
const nob = new Noblog()
const logger = new Logger({ name: "noblog" });

function help() {
  const usage = "Usage: noblog <SAVE_DIR>";
  const example = "Example:\n  noblog .";

  const output = usage + "\n" + example + "\n";
  return output;
}

async function main() {
  const argv = process.argv.slice(2,);
  if (argv.length > 1) {
    console.error("Error: invallid arg.");
    console.log(help());
  }
  save_dir = argv[0] ?? save_dir;
  sub_dir = path.join(save_dir, sub_dir)

  const pages = await GetAllPosts();
  const futures = pages.map(page => {
    return nob.FromPageid(page.id)
  })

  try {
    await Promise.all(futures);
    for (const pageid of Object.keys(nob.MdCollection)) {
      let fpath = save_dir;
      if (pages.find(page => page.id !== pageid))
        fpath = sub_dir
      const log = await nob.SaveJelly(pageid, fpath, nob.MdCollection[pageid])
      if (v) logger.info(log);
    }
    console.log(`success: finish dump all files to "${save_dir}"`)
  } catch (error) {
    if (error instanceof Error) {
      console.log(`failed: consider running with "v=true" - ${error.message}`);
    } else {
      console.log('failed: an unknown error occurred');
    }
  }
}

main()
