import { describe, expect, it } from "vitest";
import {
  renderPlainText,
  renderRichText,
} from "../src/lib/noblog/rich-text.js";
import { equation, text } from "./fixtures.js";

describe("rich text rendering", () => {
  it("renders links and stacked annotations", () => {
    const rendered = renderRichText([
      text("Read "),
      text("the docs", {
        href: "https://example.com",
        annotations: { bold: true, italic: true },
      }),
    ]);

    expect(rendered).toBe("Read _**[the docs](https://example.com)**_");
  });

  it("renders code, underline, and strikethrough in the correct order", () => {
    const rendered = renderRichText([
      text("formatted", {
        annotations: {
          code: true,
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
        },
      }),
    ]);

    expect(rendered).toBe("~~<u>_**`formatted`**_</u>~~");
  });

  it("merges adjacent annotations and keeps overlapping markers balanced", () => {
    expect(
      renderRichText([
        text("one ", { annotations: { bold: true } }),
        text("two", { annotations: { bold: true } }),
      ]),
    ).toBe("**one two**");

    expect(
      renderRichText([
        text("one", { annotations: { bold: true, italic: true } }),
        text(" two", { annotations: { bold: true } }),
      ]),
    ).toBe("**_one_ two**");
  });

  it("renders inline equations and plain text", () => {
    const richText = [text("Value: "), equation("x^2")];

    expect(renderRichText(richText)).toBe("Value: $x^2$");
    expect(renderPlainText(richText)).toBe("Value: x^2");
  });
});
