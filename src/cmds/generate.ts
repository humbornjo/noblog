#!/usr/bin/env node

import { Noblog } from "../lib/nomd/nomd.js";
import { GetAllPosts } from "../lib/notion/client.js";

function help() {
  console.log(`\n
Usage: noblog [SAVE_PATH] [SUB_PATH]

Example:
  noblog
  noblog src/pages/posts/ nob_children/

Available <option>:
  -v  Print more messages for debugging.\n`)
}

async function main() {
  const argv = process.argv.slice(2,);
  if (argv.length > 2) {
    console.error("Error: invallid arg.");
    help();
  }

  const save_dir = argv[0] ?? "./src/pages/posts";
  const sub_dir = argv[1] ?? "nob_children/"
  const pages = await GetAllPosts();
  const nob = new Noblog(pages, save_dir, sub_dir)

  nob.Collect(true)
}

main()
