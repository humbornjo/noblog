# 📝 Noblog

> Transform your Notion content into beautiful static blogs with Astro

[![npm version](https://badge.fury.io/js/noblog.svg)](https://badge.fury.io/js/noblog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Noblog generates static content from Notion databases and provides a pluggable component/theme marketplace for bloggers. Inspired by [notablog](https://github.com/dragonman225/notablog) but more flexible thanks to the power of Astro.

## 🆚 Why Noblog vs notion-to-md?

While Noblog uses [notion-to-md](https://github.com/souvikinator/notion-to-md) under the hood, it provides significant improvements for blog generation:

### 🔧 **Enhanced Markdown Generation**

**Problem with notion-to-md:**
When dealing with complex formatting like nested styles (e.g., `{BLOCK1}` and `{BLOCK2}` both bold, but only `BLOCK1` also italic), notion-to-md generates malformed markdown:

```markdown
_**BLOCK1**_**BLOCK2** # Broken: unmerged tags
```

**Noblog's Solution:**

- **Merged Tag Handling**: Properly merges nested formatting tags
- **Clean Markdown Output**: Generates valid, renderer-friendly markdown
- **Astro-Optimized**: Specifically designed for static site generation

### 🏗️ **Complete Blog Structure**

**notion-to-md:** Just converts pages to markdown

**Noblog:**

- ✅ Automatic file structure generation
- ✅ Parent/child page organization
- ✅ Astro-compatible frontmatter
- ✅ Customizable save paths
- ✅ Layout path customization
- ✅ Theme marketplace ready

### ⚡ **One-Command Solution**

Instead of manually handling notion-to-md output and building your own file structure:

```bash
# With Noblog - everything handled automatically
noblog --layout ../../layouts/BlogLayout.astro

# With notion-to-md - you'd need to build everything yourself
```

> **Note:** Noblog includes improvements to notion-to-md's core parsing logic, fixing edge cases like unmerged formatting tags that can break markdown renderers.

## 🚀 Quick Start

### Installation

```bash
npm install -g noblog
```

### Basic Usage

```bash
noblog
```

That's it! Noblog will fetch your Notion content and generate static markdown files.

### 🛠️ Command-Line Options

Noblog supports various command-line options to customize your blog generation:

```bash
# Basic usage with default settings
noblog

# Custom layout path
noblog --layout ../../layouts/BlogLayout.astro

# Custom save and sub paths with layout
noblog ./content/blog/ ./content/blog/subpages/ --layout ../../../layouts/CustomLayout.astro

# Verbose output for debugging
noblog -v
# or
noblog --verbose
```

**Available Options:**

- `--layout PATH` - Custom layout path relative to the posts directory (default: `../../layouts/MarkdownPostLayout.astro`)
- `-v, --verbose` - Print more messages for debugging
- `-h, --help` - Show help message
- `--version` - Show version information

**Positional Arguments:**

- `SAVE_PATH` - Directory to save main posts (default: `./src/pages/posts/`)
- `SUB_PATH` - Subdirectory for nested content (default: `nob_children/`)

## 📋 Setup Guide

### 1. Create Your Notion Database

Duplicate this [template database](https://www.notion.so/humbornjo/fa0faae85c504934a4a86cfa70302850?v=2abd1079ae134fbd8df2604765baa1df) and start writing your blog posts in Notion.

### 2. Configure Environment Variables

Set up your Notion API credentials:

```bash
export NOBLOG_DATABASE_ID="your-notion-database-id"
export NOTION_API_SECRET="your-notion-api-secret"
```

### 3. Choose a Template

Pick an Astro template that supports Noblog. Here's a starter template: **[nobloger](https://github.com/humbornjo/nobloger)**

### 4. Deploy Your Site

Run `noblog` to generate your content, then deploy your Astro site to your preferred hosting platform.

## 📁 File Structure

By default, Noblog organizes your content like this:

```
project-root/
└── src/
    └── pages/
        └── posts/
            ├── blog-post-1.md          # Direct database entries
            ├── blog-post-2.md
            └── nob_children/
                ├── sub-post-1.md       # Referenced/child pages
                ├── sub-post-2.md
                └── sub-post-3.md
```

### Custom Save Paths

You can customize the output directories:

```bash
noblog <SAVE_PATH> <SUB_PATH>

# Example:
noblog ./content/blog/ ./content/blog/subpages/
```

## 🎯 Markdown Output

Generated markdown files include Astro-compatible frontmatter:

```markdown
---
layout: ../../layouts/MarkdownPostLayout.astro
title: "Your Blog Post Title"
tags: ["tag1", "tag2", "tag3"]
pubDate: 2024-01-24
archived: false
description: "Your post description here"
---

# Your content starts here...
```

## 🔧 Requirements

**Any Astro template can be used with Noblog!** The only requirement is that your template includes a layout component.

This means you can use:

- ✅ Any existing Astro blog template
- ✅ Your custom Astro theme
- ✅ Popular Astro themes from the community
- ✅ The starter template: **[nobloger](https://github.com/humbornjo/nobloger)**

### Layout Customization

By default, Noblog uses `../../layouts/MarkdownPostLayout.astro` as the layout path. You can customize this using the `--layout` option:

```bash
# Use a custom layout
noblog --layout ../../layouts/BlogLayout.astro

# Use with custom save paths
noblog ./content/blog/ ./content/blog/subpages/ --layout ../../../layouts/CustomLayout.astro
```

**Important:** The layout path is relative to the posts directory where your markdown files are saved. For example:
- If your save path is `./src/pages/posts/`, the default layout path `../../layouts/MarkdownPostLayout.astro` points to `./src/layouts/MarkdownPostLayout.astro`
- If you change the save path to `./content/blog/`, you might need `--layout ../../layouts/CustomLayout.astro` to point to `./content/layouts/CustomLayout.astro`

Adjust the layout path based on where your Astro layout files are located relative to your posts directory.

## 🙏 Acknowledgments

Built upon the excellent work of these projects:

- [Notion API](https://developers.notion.com/reference/intro) - Official Notion API documentation
- [Notion SDK](https://developers.notion.com/docs/getting-started) - Notion's official SDK
- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Notion to Markdown converter
- [notablog](https://github.com/dragonman225/notablog) - Original inspiration
- [astro-notion-blog](https://github.com/otoyo/astro-notion-blog) - Astro + Notion integration
