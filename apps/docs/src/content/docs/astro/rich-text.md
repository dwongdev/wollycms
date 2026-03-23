---
title: Rich Text
description: How WollyCMS stores and renders rich text content using TipTap JSON.
---

WollyCMS stores rich text as [TipTap](https://tiptap.dev/) JSON, not raw HTML. The `@wollycms/astro` package includes `renderRichText()` to convert this JSON to HTML at render time.

## Using the RichText component

The simplest way to render rich text is with the built-in component:

```astro
---
import RichText from '@wollycms/astro/components/RichText.astro';

const { fields } = Astro.props;
---

<div class="prose">
  <RichText content={fields.body} />
</div>
```

Or call `renderRichText()` directly for more control:

```astro
---
import { renderRichText } from '@wollycms/astro/helpers/richtext';

const { fields } = Astro.props;
const html = renderRichText(fields.body);
---

<div class="prose" set:html={html} />
```

## Supported node types

`renderRichText()` handles these TipTap node types out of the box:

| Node type | HTML output |
|---|---|
| `paragraph` | `<p>` |
| `heading` | `<h2>` – `<h6>` (based on `level` attribute) |
| `bulletList` | `<ul>` |
| `orderedList` | `<ol>` |
| `listItem` | `<li>` |
| `blockquote` | `<blockquote>` |
| `codeBlock` | `<pre><code>` (with optional `language` class) |
| `image` | `<img>` (or `<a><img></a>` when linked) |
| `table` | `<table>` with `<tr>`, `<th>`, `<td>` |
| `horizontalRule` | `<hr />` |
| `hardBreak` | `<br />` |

## Text marks

Inline formatting is stored as marks on text nodes:

| Mark | HTML output |
|---|---|
| `bold` | `<strong>` |
| `italic` | `<em>` |
| `underline` | `<u>` |
| `strike` | `<s>` |
| `code` | `<code>` |
| `link` | `<a href="...">` |
| `subscript` | `<sub>` |
| `superscript` | `<sup>` |

## Image attributes

Image nodes support these attributes:

| Attribute | Type | Description |
|---|---|---|
| `src` | `string` | Image URL |
| `alt` | `string` | Alt text |
| `title` | `string` | Title text (optional) |
| `width` | `string` | CSS width (e.g. `"50%"`) |
| `float` | `string` | `"none"`, `"left"`, `"right"`, or `"center"` |
| `caption` | `string` | Figure caption text (optional) |
| `href` | `string` | Link URL — wraps the image in `<a>` (optional) |
| `linkTarget` | `string` | Link target, e.g. `"_blank"` (optional) |

When an image has an `href`, the rendered output wraps it in a link:

```html
<!-- Image without link -->
<img src="/api/content/media/42/original" alt="QR code" />

<!-- Image with link -->
<a href="https://example.com" target="_blank">
  <img src="/api/content/media/42/original" alt="QR code" />
</a>
```

Editors can add links to images in the admin UI by clicking the image and then clicking the link button in the toolbar.

## Custom renderers

If you write your own renderer instead of using `renderRichText()`, make sure to handle image links. The `href` and `linkTarget` values are stored as attributes on the image node, not as marks:

```json
{
  "type": "image",
  "attrs": {
    "src": "/api/content/media/42/original",
    "alt": "QR code",
    "href": "https://example.com",
    "linkTarget": "_blank"
  }
}
```

:::caution
If your custom renderer doesn't check for `attrs.href` on image nodes, linked images will render as plain images with no link. The built-in `renderRichText()` handles this automatically.
:::

## TipTap JSON structure

Rich text content is stored as a JSON document with a `doc` root node. Here is an example showing the structure:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [
        { "type": "text", "text": "Welcome" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Visit our " },
        {
          "type": "text",
          "text": "website",
          "marks": [
            { "type": "link", "attrs": { "href": "https://example.com" } }
          ]
        },
        { "type": "text", "text": " for details." }
      ]
    },
    {
      "type": "image",
      "attrs": {
        "src": "/api/content/media/5/original",
        "alt": "Logo",
        "href": "https://example.com",
        "linkTarget": "_blank"
      }
    }
  ]
}
```
