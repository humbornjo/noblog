# noblog

This package aims to generate static content from notion.so and provide a plugable component/theme market for you bloggers.

the pattern would be like notablog (see reference), but more flexiable thanks to the mighty power of Astro

# Usage 

```
npm install -g noblog
noblog
```

1. Duplicate this [database](https://www.notion.so/humbornjo/fa0faae85c504934a4a86cfa70302850?v=2abd1079ae134fbd8df2604765baa1df) and write blogs on it.

2. Find a astro template, here is a shabby template I made: [nobloger](https://github.com/humbornjo/nobloger)

3. set two env variables:
    ```
    NOBLOG_DATABASE_ID: your notion database id.
    NOTION_API_SECRET: your notion api secret.
    ```

3. Run `noblog` and deploy your site.

By default, `noblog` saves all your post (the posts at the surface og your database) under `SAVE_PATH`. 

The articles that are not directly posted on the database is saved under `SAVE_PATH/SUB_PATH`.

The default value of `SAVE_PATH` is `./src/pages/posts/`, `SUB_PATH` is `nob_children/`  

So if you run `noblog` only, the file structure would be,

```
project root
└──src
   └── pages
       └── posts
           ├── blog_1.md
           ├── blog_2.md
           └── nob_children
               ├── referenced_blog_1.md
               ├── referenced_blog_2.md
               ├── referenced_blog_3.md
               ├── referenced_blog_4.md
               └── referenced_blog_5.md
```

Save dir could be altered by add args when running command,

```
noblog <SAVE_PATH> <SUB_PATH>
```

At this time, all the generated markdown is with Astro style, which means each file has a frontmatter like this,

```
---
layout: ../../layouts/MarkdownPostLayout.astro
title: "golang blog"
tags: ["lang", "go"]
pubDate: 2024-01-24
archived: false
description: "sometimes I hate, sometimes I love. <3"
---
```

Layout used is hard coded in `./src/layouts/MarkdownPostLayout.astro`

In addition, any astro template that offer `./src/layouts/MarkdownPostLayout.astro` and use the default blog file structure (please refer to the code block above) is compatiable with `noblog`.


# Millstone
* \[2024.07.08\] fuck around
* \[2024.07.20\] generate github flavored markdown
* \[2024.09.04\] at least it worked

# Reference 
I really appreciate their work and effort, but their code just sucks. And I refactor some :|

* [notion api](https://developers.notion.com/reference/intro)
* [notion sdk](https://developers.notion.com/docs/getting-started)
* [notion-to-md](https://github.com/souvikinator/notion-to-md)
* [notablog](https://github.com/dragonman225/notablog)
* [astro-notion-blog](https://github.com/otoyo/astro-notion-blog)
