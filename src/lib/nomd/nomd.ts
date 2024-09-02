import * as fs from 'fs/promises';
import * as path from 'path';
import { NotionToMarkdown } from "notion-to-md";

import * as cvtmd from "./cvter.js"
import type { Page } from '../notion/object.js';
import { GetPageMeta, client as notion_client } from "../notion/client.js";

// from notion-to-md
type MdBlock = {
  type?: string;
  blockId: string;
  parent: string;
  children: MdBlock[];
};

export type MdJelly = {
  content: string;    // markdown content
  children: string[]; // child_page
}

export class Noblog extends NotionToMarkdown {
  MdCollection: Record<string, MdJelly> = {};

  constructor() {
    super({ notionClient: notion_client });
    this.setCustomTransformer("child_page", async (block) => {
      const page = block as any;
      if (!page?.id) return false;
      return `[${page.child_page.title}](${page.id}.md)`;
    })
  }

  async FromBlocks(blocks: MdBlock[], recursive: boolean): Promise<MdJelly> {
    let jelly: MdJelly = { content: "", children: [] }
    for (const block of blocks) {
      const subjelly = await this.FromBlocks(block.children, recursive);

      if (block.type === "toggle") {
        jelly.content += cvtmd.toggle(block.parent, subjelly.content);
        jelly.children = [...jelly.children, ...subjelly.children];
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
      jelly.content += (line_wrap + `${cvtmd.addTabSpace(block.parent, 0)}\n` + line_wrap);
      if (block.type === "child_page") {
        jelly.children = [...jelly.children, block.blockId];
        if (recursive) await this.FromPageid(block.blockId, recursive);
      } else {
        jelly.content += subjelly.content;
        jelly.children = [...jelly.children, ...subjelly.children];
      }
    }
    return jelly;
  }

  async FromPageid(page_id: string, recursive: boolean = true) {
    if (this.MdCollection.hasOwnProperty(page_id)) {
      return this.MdCollection[page_id];
    }
    const blocks = await this.pageToMarkdown(page_id);
    const jelly = await this.FromBlocks(blocks, recursive);
    const meta = await GetPageMeta(page_id)
    const astro_meta = await AssembleAstroFrontmatter(meta)
    jelly.content = astro_meta + jelly.content
    this.MdCollection[page_id] = jelly;
    return jelly;
  }

  async SaveJelly(fname: string, dir: string, jelly: MdJelly | undefined): Promise<string> {
    if (jelly === undefined) return `failed: ${fname} has empty jelly: `
    try {
      await fs.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, fname);
      await fs.writeFile(filePath, jelly.content, 'utf-8');
      return `success: ${fname} saved to ${filePath}`;
    } catch (error) {
      if (error instanceof Error) {
        return `failed: ${fname} - ${error.message}`;
      } else {
        return 'failed: an unknown error occurred';
      }
    }
  }
}

async function AssembleAstroFrontmatter(page: Page) {
  let frontmatter = ""
  // get title
  frontmatter += "title: " + "'" + (page.properties.title?.title?.[0]?.plain_text ?? "") + "'" + "\n"
  // get tags
  frontmatter += "tags: " + (JSON.stringify((page.properties.tags?.multi_select ?? []).map(tag => tag.name))) + "\n"
  // get date
  frontmatter += "date: " + (page.properties.date?.date?.start ?? "") + "\n"
  // get archived
  frontmatter += "archived: " + (page.properties.archived ? "true" : "false") + "\n"
  return "---\n" + frontmatter + "---\n"
}
