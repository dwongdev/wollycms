import { createDocument, Editor, getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { describe, expect, it } from 'vitest';

import { CustomImage } from './customImage.js';

const schema = getSchema([
  StarterKit,
  CustomImage,
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
]);

function roundTrip(content: JSONContent): JSONContent {
  return createDocument(content, schema, {}, { errorOnInvalidContent: true }).toJSON();
}

function collectImages(node: JSONContent): JSONContent[] {
  const images = node.type === 'image' ? [node] : [];
  return images.concat(node.content?.flatMap(collectImages) ?? []);
}

describe('CustomImage JSON compatibility', () => {
  it('keeps a legacy image without width visually unset', () => {
    const content = roundTrip({
      type: 'doc',
      content: [{ type: 'image', attrs: { src: '/legacy.jpg', alt: 'Legacy image' } }],
    });

    expect(collectImages(content)[0]?.attrs?.width).toBeNull();
  });

  it('preserves every explicit size inside and outside tables', () => {
    const sizes = ['25%', '50%', '75%', '100%'];
    const content = roundTrip({
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/outside.jpg', alt: 'Outside table', width: '25%' } },
        {
          type: 'table',
          content: [{
            type: 'tableRow',
            content: sizes.map((width) => ({
              type: 'tableCell',
              content: [{ type: 'image', attrs: { src: `/${width}.jpg`, alt: width, width } }],
            })),
          }],
        },
      ],
    });

    expect(collectImages(content).map((image) => image.attrs?.width)).toEqual(['25%', ...sizes]);
  });

  it('can assign medium explicitly when inserting a new image', () => {
    const editor = new Editor({
      extensions: [StarterKit, CustomImage],
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });

    editor.chain()
      .setImage({ src: '/new.jpg', alt: 'New image' })
      .updateAttributes('image', { width: '50%' })
      .run();

    expect(collectImages(editor.getJSON())[0]?.attrs?.width).toBe('50%');
    editor.destroy();
  });
});
