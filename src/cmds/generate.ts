import * as path from "path"
import { Logger } from "tslog";

import { Noblog } from "../lib/nomd/nomd.js";
import { GetAllPosts } from "../lib/notion/client.js";

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
      if (pages.find(page => page.id === pageid))
        nob.SaveJelly(pageid, save_dir, nob.MdCollection[pageid])
      else
        nob.SaveJelly(pageid, sub_dir, nob.MdCollection[pageid])
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Failed to dump markdown: ${error.message}`);
    } else {
      console.log('An unknown error occurred');
    }
  }
}

main()
