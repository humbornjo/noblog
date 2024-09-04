import { Noblog } from "../lib/nomd/nomd.js";
import { GetAllPosts } from "../lib/notion/client.js";

function help() {
  const usage = "Usage:\n  noblog <SAVE_DIR> <SUB_DIR>";
  const example = "Example:\n  noblog";
  const params = "Config:\n  save_dir: dir for posts in database. (default: ./src/pages/posts)\n  sub_dir: sub pages during collection. (default: nob_children/)";
  const output = usage + "\n" + example + "\n" + params + "\n";
  return output;
}

async function main() {
  const argv = process.argv.slice(2,);
  if (argv.length > 2) {
    console.error("Error: invallid arg.");
    console.log(help());
  }

  const save_dir = argv[0] ?? "./src/pages/posts";
  const sub_dir = argv[1] ?? "nob_children/"
  const pages = await GetAllPosts();
  const nob = new Noblog(pages, save_dir, sub_dir)

  nob.Collect(true)
}

main()
