import * as path from "path";
import * as fs from "fs/promises";
import * as fmt from "./format.js";
import {
  GetPage,
  GetBlockChildren,
  client as notion_client,
} from "../notion/client.js";
import {
  type Range,
  type CalloutIcon,
  BLOCK_BULLETED_LIST_ITEM,
  BLOCK_CALLOUT,
  BLOCK_CHILD_PAGE,
  BLOCK_NUMBERED_LIST_ITEM,
  BLOCK_SYNCED_BLOCK,
  BLOCK_TO_DO,
  BLOCK_TOGGLE,
  BLOCK_UNSUPPORTED,
  LINEWRAP_NEWLINE,
  LINEWRAP_NULL,
} from "./utils.js";
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";

// from notion-to-md
type MdBlock = {
  type?: string;
  blockId: string;
  parent: string;
  children: MdBlock[];
};

export type MdJelly = {
  content: string; // markdown content
  children: string[]; // child_page
};

export type CustomTransformer = (
  block: BlockObjectResponse,
) => string | boolean | Promise<string | boolean>;

async function SaveJelly(
  fname: string,
  dir: string,
  jelly: MdJelly | undefined,
  dry_run: boolean = false,
): Promise<string> {
  if (jelly === undefined) return `failed: ${fname} has empty jelly: `;

  try {
    if (dry_run) {
      console.log(jelly.content);
      return `success: ${fname} saved to ${dir}`;
    }
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fname);
    await fs.writeFile(filePath, jelly.content, "utf-8");
    return `success: ${fname} saved to ${filePath}`;
  } catch (error) {
    if (error instanceof Error) {
      return `failed: ${fname} - ${error.message}`;
    } else {
      return "failed: an unknown error occurred";
    }
  }
}

export class Noblog {
  Posts: PageObjectResponse[] = [];
  CurrPage: string = "";
  SavePath: string = "./src/pages/posts/";
  ChildPath: string = "nob_children/";
  LayoutPath: string = "../../layouts/MarkdownPostLayout.astro";
  MdCollection: Record<string, MdJelly> = {};
  CustomTransformers: Record<string, CustomTransformer> = {};

  constructor(
    posts: PageObjectResponse[],
    save_path?: string,
    child_path?: string,
    layout_path?: string,
  ) {
    this.Posts = posts;
    if (child_path != undefined) {
      this.ChildPath = child_path;
    }
    if (save_path != undefined) {
      this.SavePath = save_path;
    }
    if (layout_path != undefined) {
      this.LayoutPath = layout_path;
    }

    this.CustomTransformers["child_page"] = async (block) => {
      const page = block as any;
      if (!page?.id) {
        return false;
      }

      // if (curr_page.id in this.Post) and (page.id in this.Post) ||
      //    (curr_page.id not in this.Post) and (page.id not in this.Post)
      //    * path should be "../pageid"
      // if (curr_page.id in this.Post) and (page.id not in this.Post)
      //    * path should be "../save_path/pageid"
      // if (curr_page.id not in this.Post) and (page.id in this.Post)
      //    * path should be "../../pageid"
      let sub_path;
      const parent_surface =
        this.Posts.filter((post) => post.id === this.CurrPage).length > 0;
      const child_surface =
        this.Posts.filter((post) => post.id === page.id).length > 0;

      if (parent_surface === child_surface) {
        sub_path = "";
      } else if (parent_surface) {
        sub_path = this.ChildPath;
      } else {
        sub_path = "..";
      }

      const full_path = path.join("../", sub_path, page.id);
      return `(」ﾟﾛﾟ)｣ [${page.child_page.title}](${full_path})`;
    };
  }

  // Collect converts all pages in database to markdown files
  async Collect(recursive: boolean = true) {
    const save_dir = this.SavePath;
    const sub_dir = path.join(save_dir, this.ChildPath);
    for (const page of this.Posts) {
      await this.FromPageId(page.id, recursive);
    }

    try {
      for (const page_id of Object.keys(this.MdCollection)) {
        let fpath = sub_dir;
        if (this.Posts.find((page) => page.id === page_id)) fpath = save_dir;
        await SaveJelly(page_id + ".md", fpath, this.MdCollection[page_id]);
      }
      console.log(`success: finish dump all files to "${save_dir}"`);
    } catch (error) {
      if (error instanceof Error) {
        console.log(
          `failed: consider run verbose with v=true - ${error.message}`,
        );
      } else {
        console.log("failed: an unknown error occurred");
      }
    }
  }

  // FromBlocks converts blocks fetched from notion api to
  // rendered chunk (which is called jelly). Content in jelly
  // will be collected to form the final markdown. If recursive
  // is true, it will also fetch child pages exists in the given
  // blocks.
  async FromBlocks(blocks: MdBlock[], recursive: boolean): Promise<MdJelly> {
    const jelly: MdJelly = { content: "", children: [] };
    for (const block of blocks) {
      const subjelly = await this.FromBlocks(block.children, recursive);

      let line_wrap = LINEWRAP_NULL;
      if (
        block.type !== BLOCK_TO_DO &&
        block.type !== BLOCK_BULLETED_LIST_ITEM &&
        block.type !== BLOCK_NUMBERED_LIST_ITEM
      ) {
        line_wrap = LINEWRAP_NEWLINE;
      }

      switch (block.type) {
        case BLOCK_TOGGLE:
          jelly.content += fmt.toggle(block.parent, subjelly.content);
          jelly.children = [...jelly.children, ...subjelly.children];
          continue;
        default:
          jelly.content +=
            line_wrap + `${fmt.addTabSpace(block.parent, 0)}\n` + line_wrap;
      }

      if (block.type === BLOCK_CHILD_PAGE) {
        jelly.children = [...jelly.children, block.blockId];
        if (recursive) await this.FromPageId(block.blockId, recursive);
      } else {
        jelly.content += subjelly.content;
        jelly.children = [...jelly.children, ...subjelly.children];
      }
    }
    return jelly;
  }

  // FromPageid converts a page id to rendered chunk (which is
  // called jelly). Content in jelly will be collected to form
  // the final markdown. If recursive is true, it will also
  // fetch child pages exists in the given page.
  async FromPageId(
    page_id: string,
    recursive: boolean = true,
  ): Promise<MdJelly> {
    // preserve the curr page info
    const prev_page = this.CurrPage;
    this.CurrPage = page_id;

    if (this.MdCollection.hasOwnProperty(page_id)) {
      return this.MdCollection[page_id]!;
    }
    const blocks = await this.PageToMarkdown(page_id);
    const jelly = await this.FromBlocks(blocks, recursive);
    const meta = await GetPage(page_id);
    const astro_meta = await this.AssembleAstroFrontmatter(meta);
    jelly.content = astro_meta + jelly.content;
    this.MdCollection[page_id] = jelly;

    // restore the prev page info
    this.CurrPage = prev_page;
    return jelly;
  }

  async PageToMarkdown(
    id: string,
    totalPage?: number | null | undefined,
  ): Promise<MdBlock[]> {
    if (!notion_client) {
      throw new Error("notion client is not provided");
    }
    const blocks = await GetBlockChildren(id, totalPage);
    const parsedData = await this.BlocksToMarkdown(blocks);
    return parsedData;
  }

  async BlocksToMarkdown(
    blocks?: BlockObjectResponse[],
    totalPage: number | null = null,
    mdBlocks: MdBlock[] = [],
  ): Promise<MdBlock[]> {
    if (!notion_client) {
      throw new Error("notion client is not provided");
    }

    if (!blocks) return mdBlocks;
    for (const block of blocks) {
      // @ts-ignore
      if (block.type === BLOCK_UNSUPPORTED) {
        continue;
      }

      if (!("has_children" in block) || !block.has_children) {
        mdBlocks.push({
          // @ts-ignore
          type: block.type,
          blockId: block.id,
          children: [],
          parent: await this.BlockToMarkdown(block),
        });
        continue;
      }

      const block_id =
        block.type == BLOCK_SYNCED_BLOCK &&
          block.synced_block?.synced_from?.block_id
          ? block.synced_block.synced_from.block_id
          : block.id;
      // Get children of this block.
      const child_blocks = await GetBlockChildren(block_id, totalPage);

      // Push this block to mdBlocks.
      mdBlocks.push({
        type: block.type,
        blockId: block.id,
        parent: await this.BlockToMarkdown(block),
        children: [],
      });

      if (block.type === BLOCK_CALLOUT) {
        continue;
      }

      if (!(block.type in this.CustomTransformers)) {
        continue;
      }

      // Recursively call BlocksToMarkdown to collect children. check for custom transformer before parsing child
      if (mdBlocks !== undefined) {
        await this.BlocksToMarkdown(
          child_blocks,
          totalPage,
          mdBlocks[mdBlocks.length - 1]?.children,
        );
      }
    }
    return mdBlocks;
  }

  async BlockToMarkdown(block: BlockObjectResponse): Promise<string> {
    if (typeof block !== "object" || !("type" in block)) return "";
    let renderedData = "";
    const { type } = block;
    if (type in this.CustomTransformers && !!this.CustomTransformers[type]) {
      const transformer = this.CustomTransformers[type]!;
      const customTransformerValue = await transformer(block);
      if (typeof customTransformerValue === "string")
        return customTransformerValue;
    }

    switch (type) {
      case "image":
        const blockContent = block.image;
        let image_title = "image";

        const image_caption_plain = blockContent.caption
          .map((item: any) => item.plain_text)
          .join("");

        let link = "";
        const image_type = blockContent.type;
        if (image_type === "external") {
          link = blockContent.external.url;
        }

        if (image_type === "file") {
          link = blockContent.file.url;
        }

        // image caption with high priority
        if (image_caption_plain.trim().length > 0) {
          image_title = image_caption_plain;
        } else if (image_type === "file" || image_type === "external") {
          const matches = link.match(/[^\/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/);
          image_title = matches ? matches[0] : image_title;
        }

        return await fmt.image(image_title, link, false);

      case "divider":
        return fmt.divider();

      case "equation":
        return fmt.equation(block.equation.expression);

      case "pdf":
      case "file":
      case "video":
        {
          let blockContent;
          let title: string = type;
          if (type === "pdf") blockContent = block.pdf;
          if (type === "file") blockContent = block.file;
          if (type === "video") blockContent = block.video;

          const caption = blockContent?.caption
            .map((item: any) => item.plain_text)
            .join("");

          if (blockContent) {
            const file_type = blockContent.type;
            let link = "";
            if (file_type === "file") link = blockContent.file.url;
            if (file_type === "external") link = blockContent.external.url;

            if (caption && caption.trim().length > 0) {
              title = caption;
            } else if (link) {
              const matches = link.match(
                /[^\/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/,
              );
              title = matches ? matches[0] : type;
            }

            return fmt.link(title, link);
          }
        }
        break;

      case "embed":
      case "bookmark":
      case "link_preview":
      case "link_to_page":
        {
          let blockContent;
          const title: string = type;
          if (type === "embed") blockContent = block.embed;
          if (type === "bookmark") blockContent = block.bookmark;
          if (type === "link_preview") blockContent = block.link_preview;
          if (
            type === "link_to_page" &&
            block.link_to_page.type === "page_id"
          ) {
            blockContent = {
              url: `https://www.notion.so/${block.link_to_page.page_id}`,
            };
          }

          if (blockContent) return fmt.link(title, blockContent.url);
        }
        break;

      case "child_page": {
        const pageTitle: string = block.child_page.title;
        return fmt.heading2(pageTitle);
      }
      case "child_database": {
        const pageTitle = block.child_database.title || `child_database`;
        return fmt.heading2(pageTitle);
      }

      case "table": {
        const { id, has_children } = block;
        const tableArr: string[][] = [];
        if (has_children) {
          const tableRows = await GetBlockChildren(id, 100);
          const rowsPromise = tableRows?.map(async (row) => {
            const { type } = row as any;
            const cells = (row as any)[type]["cells"];

            /**
             * this is more like a hack since matching the type text was
             * difficult. So converting each cell to paragraph type to
             * reuse the BlockToMarkdown function
             */
            const cellStringPromise = cells.map(
              async (cell: any) =>
                await this.BlockToMarkdown({
                  type: "paragraph",
                  paragraph: { rich_text: cell },
                } as BlockObjectResponse),
            );

            const cellStringArr = await Promise.all(cellStringPromise);
            tableArr.push(cellStringArr);
          });
          await Promise.all(rowsPromise || []);
        }
        return fmt.table(tableArr);
      }

      // Rest of the types:
      //   "paragraph" "heading_1" "heading_2" "heading_3"
      //   "bulleted_list_item" "numbered_list_item"
      //   "quote" "to_do" "template" "synced_block"
      //   "child_page" "child_database" "code" "callout" "breadcrumb"
      //   "table_of_contents" "link_to_page" "audio" "unsupported"
      default: {
        // @ts-ignore
        const blockContent = block[type].text || block[type].rich_text || [];

        const bucket: string[] = [];
        const code_range: Range[] = [];
        const bold_range: Range[] = [];
        const italic_range: Range[] = [];
        const underline_range: Range[] = [];
        const strikethrough_range: Range[] = [];

        const push_or_merge = (arr: Range[], idx: number) => {
          if (arr.length == 0) {
            return;
          }
          // @ts-ignore
          if (arr[arr.length - 1][1] === idx) {
            // @ts-ignore
            arr[arr.length - 1][1] += 1;
          } else {
            arr.push([idx, idx + 1]);
          }
        };

        for (let i = 0; i < blockContent.length; i++) {
          const content: RichTextItemResponse = blockContent[i] as any;
          if (content.type === "equation") {
            bucket.push(fmt.inlineEquation(content.equation.expression));
            continue;
          }
          let plain_text = content.plain_text;
          if (content["href"])
            plain_text = fmt.link(plain_text, content["href"]);
          bucket.push(plain_text);

          const annotations = content.annotations;
          if (annotations.code) push_or_merge(code_range, i);
          if (annotations.bold) push_or_merge(bold_range, i);
          if (annotations.italic) push_or_merge(italic_range, i);
          if (annotations.underline) push_or_merge(underline_range, i);
          if (annotations.strikethrough) push_or_merge(strikethrough_range, i);
        }

        const annoed_bucket = [];
        for (const range of code_range)
          annoed_bucket.push({ range: range, type: "code" });
        for (const range of bold_range)
          annoed_bucket.push({ range: range, type: "bold" });
        for (const range of italic_range)
          annoed_bucket.push({ range: range, type: "italic" });
        for (const range of underline_range)
          annoed_bucket.push({ range: range, type: "underline" });
        for (const range of strikethrough_range)
          annoed_bucket.push({ range: range, type: "strikethrough" });
        annoed_bucket.sort(
          // @ts-ignore
          (a, b) => a.range[1] - a.range[0] - (b.range[1] - b.range[0]),
        );

        for (const annoed of annoed_bucket) {
          const type = annoed.type;
          const [from, to] = annoed.range;
          let panno,
            sanno = fmt.GetPrefixSuffix(type);
          // @ts-ignore
          bucket[from] = panno + bucket[from];
          // @ts-ignore
          bucket[to - 1] = bucket[to - 1] + sanno;
        }
        bucket.forEach((x) => (renderedData += x));
      }
    }

    switch (type) {
      case "code":
        renderedData = fmt.codeBlock(renderedData, block[type].language);
        break;
      case "heading_1":
        renderedData = fmt.heading1(renderedData);
        break;
      case "heading_2":
        renderedData = fmt.heading2(renderedData);
        break;
      case "heading_3":
        renderedData = fmt.heading3(renderedData);
        break;
      case "quote":
        renderedData = fmt.quote(renderedData);
        break;
      case "callout":
        const { id, has_children } = block;
        let callout_string = "";

        if (!has_children) {
          return fmt.callout(renderedData, block.callout.icon as CalloutIcon);
        }

        const callout_children_object = await GetBlockChildren(id, 100);
        const callout_children = await this.BlocksToMarkdown(
          callout_children_object,
        );

        callout_string += `${renderedData}\n`;
        callout_string += (await this.FromBlocks(callout_children, true))
          .content;

        renderedData = fmt.callout(
          callout_string.trim(),
          block.callout.icon as CalloutIcon,
        );
        break;
      case "bulleted_list_item":
        renderedData = fmt.bullet(renderedData);
        break;
      case "numbered_list_item":
        renderedData = fmt.bullet(
          renderedData,
          (block.numbered_list_item as any).number, // @ts-ignore // number is annotated manually
        );
        break;
      case "to_do":
        renderedData = fmt.todo(renderedData, block.to_do.checked);
        break;
    }

    return renderedData;
  }

  async AssembleAstroFrontmatter(page: PageObjectResponse) {
    let frontmatter = "";
    // Default layout
    const ischild =
      this.Posts.filter((post) => post.id === page.id).length > 0 ? "" : "../";
    frontmatter += "layout: " + ischild + this.LayoutPath + "\n";

    Object.entries(page.properties).forEach(([key, property]) => {
      switch (property.type) {
        case "title": // Get title
          frontmatter +=
            "title: " +
            JSON.stringify(property.title?.[0]?.plain_text ?? "") +
            "\n";
          break;
        case "multi_select": // Get tags
          frontmatter +=
            "tags: " +
            JSON.stringify(property.multi_select.map((tag) => tag.name)) +
            "\n";
          break;
        case "date": // Get date
          frontmatter +=
            "pubDate: " +
            (property.date?.start ?? new Date().toISOString().split("T")[0]) +
            "\n";
          break;
        default: // Customized properties from the template given in the Github repo
          switch (key) {
            case "archived": // Get archived
              if (property.type === "checkbox")
                frontmatter +=
                  "archived: " + (property as any).checkbox
                    ? "true"
                    : "false" + "\n";
              break;
            case "description": // Get description
              if (property.type === "rich_text")
                frontmatter +=
                  "description: " +
                  JSON.stringify(property.rich_text?.[0]?.plain_text ?? "") +
                  "\n";
              break;
            default:
              break;
          }
      }
    });

    return "---\n" + frontmatter + "---\n";
  }
}
