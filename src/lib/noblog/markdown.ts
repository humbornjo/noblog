import { markdownTable } from "markdown-table";
import type { CalloutIcon } from "./types.js";

export const inlineCode = (text: string) => `\`${text}\``;
export const inlineEquation = (text: string) => `$${text}$`;
export const bold = (text: string) => `**${text}**`;
export const italic = (text: string) => `_${text}_`;
export const strikethrough = (text: string) => `~~${text}~~`;
export const underline = (text: string) => `<u>${text}</u>`;
export const link = (text: string, href: string) => `[${text}](${href})`;

export function codeBlock(text: string, language = ""): string {
  const normalizedLanguage = language === "plain text" ? "text" : language;
  return `\`\`\`${normalizedLanguage}\n${text}\n\`\`\``;
}

export const equation = (text: string) => `$$\n${text}\n$$`;
export const heading1 = (text: string) => `# ${text}`;
export const heading2 = (text: string) => `## ${text}`;
export const heading3 = (text: string) => `### ${text}`;
export const quote = (text: string) => `> ${text.replace(/\n/g, "  \n> ")}`;

export function callout(text: string, icon?: CalloutIcon): string {
  const emoji = icon?.type === "emoji" ? `${icon.emoji} ` : "";
  return `> ${emoji}${text.replace(/\n/g, "  \n> ")}`;
}

export function bullet(text: string, count?: number): string {
  const rendered = text.trim();
  return count === undefined ? `- ${rendered}` : `${count}. ${rendered}`;
}

export const todo = (text: string, checked: boolean) =>
  checked ? `- [x] ${text}` : `- [ ] ${text}`;

export async function image(
  alt: string,
  href: string,
  convertToBase64 = false,
): Promise<string> {
  if (!convertToBase64 || href.startsWith("data:")) {
    if (href.startsWith("data:")) {
      const base64 = href.split(",").pop();
      return `![${alt}](data:image/png;base64,${base64})`;
    }
    return `![${alt}](${href})`;
  }

  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  return `![${alt}](data:image/png;base64,${Buffer.from(buffer).toString("base64")})`;
}

export const divider = () => "---";

export function toggle(summary?: string, children?: string): string {
  if (!summary) return children ?? "";
  return `<details>\n<summary>${summary}</summary>\n${children ?? ""}\n</details>\n\n`;
}

export function table(cells: string[][], hasColumnHeader = true): string {
  if (hasColumnHeader || cells.length === 0) return markdownTable(cells);

  const width = Math.max(...cells.map((row) => row.length));
  if (width === 0) return "";
  const emptyHeader = Array.from({ length: width }, () => "");
  return markdownTable([emptyHeader, ...cells]);
}
