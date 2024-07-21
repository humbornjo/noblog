import { NotionToMarkdown } from "notion-to-md";
import { client as notion_client } from "./notion/client.js";
import * as cvtmd from "./cvtmd.js"

// from notion-to-md
type MdBlock = {
  type?: string;
  blockId: string;
  parent: string;
  children: MdBlock[];
};

type MdJelly = {
  content: string;    // markdown content
  children: string[]; // child_page
}

export const MarkdownCache: Record<string, MdJelly> = {}
const nestingLevel = 0
const n2m = new NotionToMarkdown({ notionClient: notion_client });

n2m.setCustomTransformer("child_page", async (block) => {
  const page = block as any;
  console.log(block)
  if (!page?.id) return false;
  return `[${page.child_page.title}](${page.id}.md)`;
});

export async function GenMarkdown(page_id: string, recursive: boolean = true) {
  if (MarkdownCache.hasOwnProperty(page_id)) {
    return MarkdownCache[page_id]
  }
  const blocks = await n2m.pageToMarkdown(page_id)
  const jelly = block2Markdown(blocks, recursive);
  MarkdownCache[page_id] = jelly;
  return jelly;
}

function block2Markdown(blocks: MdBlock[], recursive: boolean): MdJelly {
  let jelly: MdJelly = { content: "", children: [] }
  for (const block of blocks) {
    const subjelly = block2Markdown(block.children, recursive);

    if (block.type === "toggle") {
      jelly.content += cvtmd.toggle(block.parent, subjelly.content);
      jelly.children = jelly.children.concat(subjelly.children)
      continue;
    }
    let line_wrap = "";
    if (
      block.type !== "to_do" &&
      block.type !== "bulleted_list_item" &&
      block.type !== "numbered_list_item"
    ) {
      line_wrap = "\n";
    }
    jelly.content += (line_wrap + `${cvtmd.addTabSpace(block.parent, nestingLevel)}\n` + line_wrap);
    jelly.content += subjelly.content;
    jelly.children = jelly.children.concat(subjelly.children)
    if (block.type === "child_page" && recursive) {
      GenMarkdown(block.blockId, recursive)
    }
  }
  return jelly;
}
