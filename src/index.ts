import "dotenv/config";

// ---------------- test Noblog -----------------
export * from "./lib/nomd/nomd.js";
export * from "./lib/notion/client.js";
import { Noblog } from "./lib/nomd/nomd.js";
import { GetAllPosts } from "./lib/notion/client.js";
const testNob = async () => {
  const pages = await GetAllPosts();
  const nob = new Noblog(pages);
  nob.Collect();
};

// ----------- test NotionToMarkdown ------------
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
const testN2m = async () => {
  const notion = new Client({
    auth: process.env.NOTION_API_SECRET ?? "",
  });
  // passing notion client to the option
  const n2m = new NotionToMarkdown({ notionClient: notion });
  const x = await n2m.pageToMarkdown("10cf16f8-9950-8008-a146-e7971c864d3a");
  console.log(x);
};

// ------------------ main ---------------------
if (process.argv[2] === "test") {
  testNob();
}
