import * as path from 'path';
import * as fs from 'fs/promises';
import { NotionToMarkdown } from "notion-to-md";

import * as fmt from "./format.js"
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
  Posts: Page[] = [];
  SavePath: string = "./src/pages/posts/";
  ChildPath: string = "nob_children/";
  MdCollection: Record<string, MdJelly> = {};

  constructor(posts: Page[], save_path?: string, child_path?: string) {
    super({ notionClient: notion_client });

    this.Posts = posts;
    if (child_path != undefined) {
      this.ChildPath = child_path;
    }
    if (save_path != undefined) {
      this.SavePath = save_path;
    }

    this.setCustomTransformer("child_page", async (block) => {
      let path = this.ChildPath;
      const page = block as any;
      if (!page?.id) { return false; }
      if (this.Posts.filter(post => post.id === page.child_page.title).length > 0) {
        path = "";
      }
      return `[${page.child_page.title}](${path}${page.id})`;
    })
  }

  async Collect(recur: boolean = true) {
    const save_dir = this.SavePath
    const sub_dir = path.join(save_dir, this.ChildPath)
    const futs = this.Posts.map(page => {
      return this.FromPageid(page.id, recur)
    })
    try {
      await Promise.all(futs)
      for (const pageid of Object.keys(this.MdCollection)) {
        let fpath = sub_dir;
        if (this.Posts.find(page => page.id === pageid))
          fpath = save_dir
        await this.SaveJelly(pageid + ".md", fpath, this.MdCollection[pageid])
      }
      console.log(`success: finish dump all files to "${save_dir}"`)
    } catch (error) {
      if (error instanceof Error) {
        console.log(`failed: consider run verbose with v=true - ${error.message}`);
      } else {
        console.log('failed: an unknown error occurred');
      }
    }
  }

  async FromBlocks(blocks: MdBlock[], recursive: boolean): Promise<MdJelly> {
    let jelly: MdJelly = { content: "", children: [] }
    for (const block of blocks) {
      const subjelly = await this.FromBlocks(block.children, recursive);

      if (block.type === "toggle") {
        jelly.content += fmt.toggle(block.parent, subjelly.content);
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
      jelly.content += (line_wrap + `${fmt.addTabSpace(block.parent, 0)}\n` + line_wrap);
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
    const astro_meta = await this.AssembleAstroFrontmatter(meta)
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

  async AssembleAstroFrontmatter(page: Page) {
    let frontmatter = ""
    // default layout
    const ischild = this.Posts.filter(post => post.id === page.id).length > 0 ? "" : "../"
    frontmatter += "layout: " + ischild + "../../layouts/MarkdownPostLayout.astro" + "\n"
    // get title
    frontmatter += "title: " + JSON.stringify(page.properties.title?.title?.[0]?.plain_text ?? "") + "\n"
    // get tags
    frontmatter += "tags: " + JSON.stringify((page.properties.tags?.multi_select ?? []).map(tag => tag.name)) + "\n"
    // get date
    frontmatter += "pubDate: " + (page.properties.date?.date?.start ?? new Date().toISOString().split("T")[0]) + "\n"
    // get archived
    frontmatter += "archived: " + (page.properties.archived ? "true" : "false") + "\n"
    // get description
    frontmatter += "description: " + JSON.stringify(page.properties.description?.rich_text?.[0]?.plain_text ?? "") + "\n"
    return "---\n" + frontmatter + "---\n"
  }
}



