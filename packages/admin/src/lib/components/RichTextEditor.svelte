<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, Extension } from '@tiptap/core';
  import { Plugin, PluginKey } from '@tiptap/pm/state';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Underline from '@tiptap/extension-underline';
  import Image from '@tiptap/extension-image';
  import { focusTrap } from '$lib/focusTrap.js';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableCell from '@tiptap/extension-table-cell';
  import TableHeader from '@tiptap/extension-table-header';
  import Placeholder from '@tiptap/extension-placeholder';
  import Dropcursor from '@tiptap/extension-dropcursor';
  import MediaPicker from './MediaPicker.svelte';

  let { content, onUpdate }: { content: any; onUpdate: (json: any) => void } = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();
  let headingWarnings = $state<string[]>([]);
  let showImagePicker = $state(false);
  let showSlashMenu = $state(false);
  let slashMenuPos = $state({ top: 0, left: 0 });
  let slashFilter = $state('');
  let slashSelectedIndex = $state(0);
  let isInTable = $state(false);
  let isImageSelected = $state(false);
  let showSource = $state(false);
  let sourceHtml = $state('');

  // Image insertion state (two-step: pick → confirm with alt text)
  let pendingImage = $state<{ id: number; src: string; alt: string; title: string } | null>(null);

  // Link dialog state
  let showLinkDialog = $state(false);
  let linkUrl = $state('');
  let linkText = $state('');
  let linkTab = $state<'url' | 'media'>('url');

  // Current block format (reactive via editor reassignment in onTransaction)
  let currentBlockFormat = $derived.by(() => {
    if (!editor) return 'paragraph';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    return 'paragraph';
  });

  function setBlockFormat(format: string) {
    if (!editor) return;
    if (format === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else if (format === 'h2') {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (format === 'h3') {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    } else if (format === 'h4') {
      editor.chain().focus().toggleHeading({ level: 4 }).run();
    }
  }

  // Current image attributes (reactive via editor reassignment in onTransaction)
  let currentImageAttrs = $derived.by(() => {
    if (!isImageSelected || !editor) return { width: '50%', float: 'none', caption: '' };
    const attrs = editor.getAttributes('image');
    return {
      width: attrs.width || '50%',
      float: attrs.float || 'none',
      caption: attrs.caption || '',
    };
  });

  // Custom Image extension with width, float, and caption
  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: '50%',
          parseHTML: (element: HTMLElement) => element.style.width || null,
        },
        float: {
          default: 'none',
          parseHTML: (element: HTMLElement) => element.style.float || element.getAttribute('data-float') || null,
        },
        caption: {
          default: '',
          parseHTML: (element: HTMLElement) => element.getAttribute('data-caption') || null,
        },
      };
    },

    renderHTML({ node }) {
      const { src, alt, title, width, float: floatVal, caption } = node.attrs;
      const styles: string[] = [];
      if (width) styles.push(`width: ${width}`);
      if (floatVal && floatVal !== 'none') {
        styles.push(`float: ${floatVal}`);
        if (floatVal === 'left') styles.push('margin: 0 1rem 0.5rem 0');
        else styles.push('margin: 0 0 0.5rem 1rem');
      }

      const imgAttrs: Record<string, any> = {};
      if (src) imgAttrs.src = src;
      if (alt) imgAttrs.alt = alt;
      if (title) imgAttrs.title = title;
      if (styles.length) imgAttrs.style = styles.join('; ');
      if (caption) imgAttrs['data-caption'] = caption;

      return ['img', imgAttrs];
    },
  });

  const slashCommands = [
    { label: 'Heading 2', description: 'Large section heading', command: 'h2' },
    { label: 'Heading 3', description: 'Medium section heading', command: 'h3' },
    { label: 'Heading 4', description: 'Small section heading', command: 'h4' },
    { label: 'Bullet List', description: 'Unordered list', command: 'bullet' },
    { label: 'Numbered List', description: 'Ordered list', command: 'ordered' },
    { label: 'Blockquote', description: 'Quoted text block', command: 'quote' },
    { label: 'Code Block', description: 'Preformatted code', command: 'code' },
    { label: 'Horizontal Rule', description: 'Visual separator', command: 'hr' },
    { label: 'Image', description: 'Insert from media library', command: 'image' },
    { label: 'Document', description: 'Link to a file or document', command: 'document' },
    { label: 'Table', description: '3x3 table', command: 'table' },
    { label: 'Link', description: 'Insert hyperlink', command: 'link' },
  ];

  let filteredSlashCommands = $derived(
    slashFilter
      ? slashCommands.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()))
      : slashCommands
  );

  function checkHeadings(doc: any) {
    const warnings: string[] = [];
    if (!doc?.content) { headingWarnings = warnings; return; }
    let prev = 1;
    for (const node of doc.content) {
      if (node.type === 'heading' && node.attrs?.level) {
        const lvl = node.attrs.level;
        if (lvl > prev + 1) {
          warnings.push(`H${lvl} follows H${prev} — skips H${prev + 1}`);
        }
        prev = lvl;
      }
    }
    headingWarnings = warnings;
  }

  const PasteCleanup = Extension.create({
    name: 'pasteCleanup',
    addProseMirrorPlugins() {
      return [new Plugin({
        key: new PluginKey('pasteCleanup'),
        props: {
          transformPastedHTML(html: string) {
            return html
              .replace(/<!--\[if[^]*?endif\]-->/gi, '')
              .replace(/<\/?o:[^>]*>/gi, '')
              .replace(/<\/?v:[^>]*>/gi, '')
              .replace(/<\/?w:[^>]*>/gi, '')
              .replace(/\s*class="[^"]*"/gi, '')
              .replace(/\s*style="[^"]*"/gi, '')
              .replace(/<span[^>]*>\s*<\/span>/gi, '')
              .replace(/mso-[^;"']*/gi, '')
              .replace(/&nbsp;/gi, ' ');
          },
        },
      })];
    },
  });

  onMount(() => {
    editor = new Editor({
      element: editorEl!,
      extensions: [
        StarterKit,
        Underline,
        Link.configure({ openOnClick: false }),
        CustomImage,
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        Placeholder.configure({ placeholder: 'Type / for commands...' }),
        Dropcursor.configure({ color: '#2563eb', width: 2 }),
        PasteCleanup,
      ],
      content: content || '',
      onTransaction: () => {
        editor = editor;
        isInTable = !!editor?.isActive('table');
        isImageSelected = !!editor?.isActive('image');
        if (editor) checkHeadings(editor.getJSON());
      },
      onBlur: () => {
        if (editor && !showSource) {
          onUpdate(editor.getJSON());
        }
        setTimeout(() => { showSlashMenu = false; }, 200);
      },
    });

    editorEl!.addEventListener('keydown', handleSlashKey);
  });

  onDestroy(() => {
    editorEl?.removeEventListener('keydown', handleSlashKey);
    editor?.destroy();
  });

  function handleSlashKey(e: KeyboardEvent) {
    if (showSource) return;

    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        slashSelectedIndex = Math.min(slashSelectedIndex + 1, filteredSlashCommands.length - 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        slashSelectedIndex = Math.max(slashSelectedIndex - 1, 0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand(slashSelectedIndex);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        showSlashMenu = false;
        return;
      }
      return;
    }

    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 1), from, '\n'
      );
      if (textBefore === '' || textBefore === '\n') {
        e.preventDefault();
        openSlashMenu();
      }
    }
  }

  function openSlashMenu() {
    if (!editor || !editorEl) return;
    const { view } = editor;
    const coords = view.coordsAtPos(view.state.selection.from);
    const editorRect = editorEl.getBoundingClientRect();
    slashMenuPos = {
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    };
    slashFilter = '';
    slashSelectedIndex = 0;
    showSlashMenu = true;
  }

  function executeSlashCommand(index: number) {
    const cmd = filteredSlashCommands[index];
    if (!cmd || !editor) return;
    showSlashMenu = false;

    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (textBefore === '/') {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    }

    switch (cmd.command) {
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'h4': editor.chain().focus().toggleHeading({ level: 4 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
      case 'hr': editor.chain().focus().setHorizontalRule().run(); break;
      case 'image': showImagePicker = true; pendingImage = null; break;
      case 'document': linkTab = 'media'; openLinkDialog(); break;
      case 'table': editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'link': openLinkDialog(); break;
    }
  }

  // ---- HTML Source toggle ----
  function toggleSource() {
    if (!editor) return;
    if (showSource) {
      editor.commands.setContent(sourceHtml, false);
      onUpdate(editor.getJSON());
      showSource = false;
    } else {
      sourceHtml = editor.getHTML();
      showSource = true;
    }
  }

  function onSourceBlur() {
    if (editor && showSource) {
      editor.commands.setContent(sourceHtml, false);
      onUpdate(editor.getJSON());
    }
  }

  // ---- Link dialog ----
  function openLinkDialog() {
    if (!editor) return;

    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link');
      linkUrl = attrs.href || '';
    } else {
      linkUrl = '';
    }

    const { from, to } = editor.state.selection;
    linkText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';

    if (linkTab !== 'media') linkTab = 'url';
    showLinkDialog = true;
  }

  function insertLink() {
    if (!editor || !linkUrl) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else if (linkText) {
      editor.chain().focus()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href: linkUrl } }],
        })
        .run();
    } else {
      editor.chain().focus()
        .insertContent({
          type: 'text',
          text: linkUrl,
          marks: [{ type: 'link', attrs: { href: linkUrl } }],
        })
        .run();
    }

    showLinkDialog = false;
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    showLinkDialog = false;
  }

  function onLinkMediaSelect(mediaId: number | null) {
    if (!mediaId) return;
    linkUrl = `/api/content/media/${mediaId}/original`;
  }

  function onLinkMediaSelectItem(item: any) {
    if (!linkText) {
      linkText = item.title || item.originalName || '';
    }
    linkTab = 'url';
  }

  // ---- Image picker (two-step: pick → confirm with alt text) ----
  function openImagePicker() {
    pendingImage = null;
    showImagePicker = true;
  }

  function onImageSelect(mediaId: number | null) {
    if (!mediaId) {
      showImagePicker = false;
      return;
    }
  }

  function onImageSelectItem(item: any) {
    pendingImage = {
      id: item.id,
      src: `/api/content/media/${item.id}/large`,
      alt: item.altText || '',
      title: item.title || item.originalName || '',
    };
  }

  function confirmImageInsert() {
    if (!editor || !pendingImage) return;
    editor.chain().focus().setImage({
      src: pendingImage.src,
      alt: pendingImage.alt,
    }).run();
    pendingImage = null;
    showImagePicker = false;
  }

  function backToImagePick() {
    pendingImage = null;
  }

  function closeImagePicker() {
    showImagePicker = false;
    pendingImage = null;
  }

  // ---- Image toolbar actions ----
  function setImageAttr(attr: string, value: any) {
    editor?.chain().focus().updateAttributes('image', { [attr]: value }).run();
  }

  function editImageAlt() {
    if (!editor) return;
    const attrs = editor.getAttributes('image');
    const alt = prompt('Alt text for this image:', attrs.alt || '');
    if (alt !== null) {
      editor.chain().focus().updateAttributes('image', { alt }).run();
    }
  }

  function editImageCaption() {
    if (!editor) return;
    const attrs = editor.getAttributes('image');
    const caption = prompt('Image caption:', attrs.caption || '');
    if (caption !== null) {
      editor.chain().focus().updateAttributes('image', { caption }).run();
    }
  }

  function insertTable() {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  type BtnDef = {
    label: string;
    action: () => void;
    isActive?: () => boolean;
    divider?: false;
  };

  type DividerDef = { divider: true };

  type ToolbarItem = BtnDef | DividerDef;

  const toolbarItems: ToolbarItem[] = [
    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), isActive: () => !!editor?.isActive('bold') },
    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), isActive: () => !!editor?.isActive('italic') },
    { label: 'U', action: () => editor?.chain().focus().toggleUnderline().run(), isActive: () => !!editor?.isActive('underline') },
    { label: 'S', action: () => editor?.chain().focus().toggleStrike().run(), isActive: () => !!editor?.isActive('strike') },
    { divider: true },
    { label: 'UL', action: () => editor?.chain().focus().toggleBulletList().run(), isActive: () => !!editor?.isActive('bulletList') },
    { label: 'OL', action: () => editor?.chain().focus().toggleOrderedList().run(), isActive: () => !!editor?.isActive('orderedList') },
    { label: 'BQ', action: () => editor?.chain().focus().toggleBlockquote().run(), isActive: () => !!editor?.isActive('blockquote') },
    { label: 'HR', action: () => editor?.chain().focus().setHorizontalRule().run() },
    { divider: true },
    { label: 'Link', action: () => openLinkDialog(), isActive: () => !!editor?.isActive('link') },
    { label: 'Img', action: openImagePicker },
    { label: 'Table', action: insertTable },
    { divider: true },
    { label: 'Undo', action: () => editor?.chain().focus().undo().run() },
    { label: 'Redo', action: () => editor?.chain().focus().redo().run() },
  ];
</script>

<div class="rte-wrap">
  <div class="rte-toolbar">
    {#if showSource}
      <button type="button" class="rte-btn active" onclick={toggleSource} title="Visual editor">&lt;/&gt;</button>
      <span class="rte-source-label">HTML Source — click &lt;/&gt; to return to visual editor</span>
    {:else}
      <select class="rte-format-select" value={currentBlockFormat}
        onchange={(e) => setBlockFormat((e.target as HTMLSelectElement).value)}
        aria-label="Block format">
        <option value="paragraph">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
      </select>
      <span class="rte-divider"></span>
      {#each toolbarItems as item}
        {#if item.divider}
          <span class="rte-divider"></span>
        {:else}
          <button
            type="button"
            class="rte-btn"
            class:active={item.isActive?.() ?? false}
            onclick={item.action}
            title={item.label}
          >
            {item.label}
          </button>
        {/if}
      {/each}
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" onclick={toggleSource} title="HTML source">&lt;/&gt;</button>
    {/if}
  </div>

  {#if isInTable && !showSource}
    <div class="rte-table-toolbar">
      <span class="rte-table-label">Table:</span>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addRowBefore().run()}>+ Row Above</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addRowAfter().run()}>+ Row Below</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addColumnBefore().run()}>+ Col Left</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addColumnAfter().run()}>+ Col Right</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteRow().run()}>Del Row</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteColumn().run()}>Del Col</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteTable().run()}>Del Table</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().toggleHeaderRow().run()}>Toggle Header</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().mergeCells().run()}>Merge</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().splitCell().run()}>Split</button>
    </div>
  {/if}

  {#if isImageSelected && !showSource}
    <div class="rte-image-toolbar">
      <span class="rte-image-label">Size:</span>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.width === '25%'} onclick={() => setImageAttr('width', '25%')}>S</button>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.width === '50%'} onclick={() => setImageAttr('width', '50%')}>M</button>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.width === '75%'} onclick={() => setImageAttr('width', '75%')}>L</button>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.width === '100%'} onclick={() => setImageAttr('width', '100%')}>Full</button>
      <span class="rte-divider"></span>
      <span class="rte-image-label">Wrap:</span>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.float === 'left'} onclick={() => setImageAttr('float', 'left')}>&larr; Left</button>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.float === 'none'} onclick={() => setImageAttr('float', 'none')}>None</button>
      <button type="button" class="rte-btn-sm" class:active={currentImageAttrs.float === 'right'} onclick={() => setImageAttr('float', 'right')}>Right &rarr;</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm" onclick={editImageAlt}>Alt</button>
      <button type="button" class="rte-btn-sm" onclick={editImageCaption}>Caption</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteSelection().run()}>Remove</button>
    </div>
    {#if currentImageAttrs.caption}
      <div class="rte-image-caption-bar">Caption: <em>{currentImageAttrs.caption}</em></div>
    {/if}
  {/if}

  {#if headingWarnings.length > 0 && !showSource}
    <div class="rte-heading-warn" role="status">
      {#each headingWarnings as warn}
        <span class="rte-heading-warn-item">{warn}</span>
      {/each}
    </div>
  {/if}

  <div class="rte-editor-wrap">
    {#if showSource}
      <textarea class="rte-source" bind:value={sourceHtml} onblur={onSourceBlur} spellcheck="false"></textarea>
    {:else}
      <div class="rte-editor" bind:this={editorEl}></div>

      {#if showSlashMenu}
        <div class="slash-menu-container" style="top: {slashMenuPos.top}px; left: {slashMenuPos.left}px;">
          <div class="slash-menu">
            {#each filteredSlashCommands as cmd, i}
              <button
                class="slash-menu-item"
                class:selected={i === slashSelectedIndex}
                onmousedown={(e) => { e.preventDefault(); executeSlashCommand(i); }}
                onmouseenter={() => { slashSelectedIndex = i; }}
              >
                <span class="slash-menu-label">{cmd.label}</span>
                <span class="slash-menu-desc">{cmd.description}</span>
              </button>
            {/each}
            {#if filteredSlashCommands.length === 0}
              <div class="slash-menu-empty">No matching commands</div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Image picker modal (two-step: browse → confirm with alt text) -->
{#if showImagePicker}
  <div class="modal-overlay" onclick={closeImagePicker} role="dialog" aria-modal="true" aria-labelledby="insert-image-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 700px;" use:focusTrap onescape={closeImagePicker}>
      <div class="modal-header">
        <h2 id="insert-image-title">{pendingImage ? 'Set Alt Text' : 'Insert Image'}</h2>
        <button class="btn-icon" onclick={closeImagePicker} aria-label="Close">&#10005;</button>
      </div>

      {#if pendingImage}
        <div class="image-confirm">
          <div class="image-confirm-preview-wrap">
            <img src={`/api/content/media/${pendingImage.id}/medium`} alt="" class="image-confirm-preview" />
          </div>
          <div class="image-confirm-form">
            <label class="link-label" for="image-alt-input">Alt Text</label>
            <input id="image-alt-input" type="text" class="link-input" bind:value={pendingImage.alt}
              placeholder="Describe this image for screen readers" />
            <p class="image-confirm-hint">Describes the image for screen readers and when images can't load.</p>
          </div>
          <div class="link-footer">
            <button class="btn btn-outline" onclick={backToImagePick}>&larr; Back</button>
            <div style="flex: 1;"></div>
            <button class="btn btn-primary" onclick={confirmImageInsert}>Insert Image</button>
          </div>
        </div>
      {:else}
        <MediaPicker inline allowUpload initialTypeFilter="image" value={null}
          onSelect={onImageSelect} onSelectItem={onImageSelectItem} />
      {/if}
    </div>
  </div>
{/if}

<!-- Link dialog modal -->
{#if showLinkDialog}
  <div class="modal-overlay" onclick={() => showLinkDialog = false} role="dialog" aria-modal="true" aria-labelledby="link-dialog-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 700px;" use:focusTrap onescape={() => showLinkDialog = false}>
      <div class="modal-header">
        <h2 id="link-dialog-title">{editor?.isActive('link') ? 'Edit Link' : 'Insert Link'}</h2>
        <button class="btn-icon" onclick={() => showLinkDialog = false} aria-label="Close">&#10005;</button>
      </div>

      <div class="link-tabs">
        <button class="link-tab" class:active={linkTab === 'url'} onclick={() => linkTab = 'url'}>URL</button>
        <button class="link-tab" class:active={linkTab === 'media'} onclick={() => linkTab = 'media'}>Media Library</button>
      </div>

      {#if linkTab === 'url'}
        <div class="link-form">
          <label class="link-label" for="link-url-input">URL</label>
          <input id="link-url-input" type="text" class="link-input" bind:value={linkUrl} placeholder="https://example.com or /page-slug" />

          <label class="link-label link-label-spaced" for="link-text-input">Display Text</label>
          <input id="link-text-input" type="text" class="link-input" bind:value={linkText} placeholder="Link text (uses URL if empty)" />
        </div>
      {:else}
        <MediaPicker
          inline
          allowUpload
          initialTypeFilter="document"
          value={null}
          onSelect={onLinkMediaSelect}
          onSelectItem={onLinkMediaSelectItem}
        />
      {/if}

      <div class="link-footer">
        {#if editor?.isActive('link')}
          <button class="btn btn-danger-outline" onclick={removeLink}>Remove Link</button>
        {/if}
        <div style="flex: 1;"></div>
        <button class="btn btn-outline" onclick={() => showLinkDialog = false}>Cancel</button>
        <button class="btn btn-primary" onclick={insertLink} disabled={!linkUrl}>
          {editor?.isActive('link') ? 'Update Link' : 'Insert Link'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rte-wrap {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    overflow: hidden;
    background: var(--c-surface, #ffffff);
  }

  .rte-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    background: var(--c-bg, #f7f8fa);
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .rte-format-select {
    height: 28px;
    padding: 0 4px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: var(--font, system-ui);
    color: var(--c-text, #2d3748);
    background: var(--c-surface, #fff);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    cursor: pointer;
    outline: none;
  }

  .rte-format-select:focus {
    border-color: var(--c-accent, #3182ce);
  }

  .rte-source-label {
    font-size: 0.75rem;
    color: var(--c-text-light, #64748b);
    margin-left: 0.5rem;
  }

  .rte-table-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    background: #eff6ff;
    border-bottom: 1px solid #bfdbfe;
  }

  .rte-table-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #2563eb;
    margin-right: 4px;
  }

  .rte-image-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    background: #f0fdf4;
    border-bottom: 1px solid #bbf7d0;
  }

  .rte-image-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #16a34a;
    margin-right: 2px;
    margin-left: 2px;
  }

  .rte-image-caption-bar {
    padding: 4px 10px;
    background: #f0fdf4;
    border-bottom: 1px solid #bbf7d0;
    font-size: 0.72rem;
    color: #166534;
  }

  .rte-btn-sm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 6px;
    font-size: 0.68rem;
    font-weight: 500;
    font-family: var(--font, system-ui);
    color: var(--c-text, #2d3748);
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.12s;
  }

  .rte-btn-sm:hover { background: #f1f5f9; }
  .rte-btn-sm.active { background: #16a34a; color: #fff; border-color: #16a34a; }

  .rte-btn-danger { color: #dc2626; }
  .rte-btn-danger:hover { background: #fef2f2; border-color: #fca5a5; }

  .rte-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: var(--font, system-ui);
    color: var(--c-text, #2d3748);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .rte-btn:hover {
    background: var(--c-border, #e2e8f0);
  }

  .rte-btn.active {
    background: var(--c-accent, #3182ce);
    color: #ffffff;
    border-color: var(--c-accent, #3182ce);
  }

  .rte-divider {
    display: inline-block;
    width: 1px;
    height: 20px;
    background: var(--c-border, #e2e8f0);
    margin: 0 4px;
  }

  .rte-heading-warn {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 4px 10px;
    background: #fef3c7;
    border-bottom: 1px solid #fcd34d;
    font-size: 0.72rem;
    color: #92400e;
  }

  .rte-heading-warn-item::before {
    content: '\26A0\FE0F ';
  }

  .rte-editor-wrap {
    position: relative;
  }

  .rte-editor {
    min-height: 200px;
    padding: 12px 16px;
    font-family: var(--font, system-ui);
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--c-text, #2d3748);
  }

  .rte-source {
    display: block;
    width: 100%;
    min-height: 300px;
    padding: 12px 16px;
    border: none;
    outline: none;
    resize: vertical;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--c-text, #2d3748);
    background: #fefce8;
    box-sizing: border-box;
    tab-size: 2;
  }

  /* Slash command menu */
  .slash-menu-container {
    position: absolute;
    z-index: 50;
  }

  .slash-menu {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow-y: auto;
    min-width: 220px;
    padding: 4px;
  }

  .slash-menu-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0.4rem 0.6rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    font-family: inherit;
    transition: background 0.1s;
  }

  .slash-menu-item:hover,
  .slash-menu-item.selected {
    background: var(--c-bg-alt, #f1f5f9);
  }

  .slash-menu-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text, #1e293b);
  }

  .slash-menu-desc {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
  }

  .slash-menu-empty {
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
    color: var(--c-text-light, #94a3b8);
    text-align: center;
  }

  /* Image confirm step */
  .image-confirm {
    padding: 1.25rem;
  }

  .image-confirm-preview-wrap {
    text-align: center;
    margin-bottom: 1rem;
    background: var(--c-bg, #f7f8fa);
    border-radius: var(--radius, 6px);
    padding: 0.75rem;
  }

  .image-confirm-preview {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 4px;
  }

  .image-confirm-form {
    margin-bottom: 0.5rem;
  }

  .image-confirm-hint {
    font-size: 0.75rem;
    color: var(--c-text-light, #94a3b8);
    margin-top: 0.35rem;
  }

  /* Link dialog */
  .link-tabs {
    display: flex;
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .link-tab {
    flex: 1;
    padding: 0.6rem 1rem;
    border: none;
    background: transparent;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--c-text-light, #64748b);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
  }

  .link-tab:hover {
    color: var(--c-text, #1e293b);
  }

  .link-tab.active {
    color: var(--c-accent, #3182ce);
    border-bottom-color: var(--c-accent, #3182ce);
  }

  .link-form {
    padding: 1rem 1.25rem;
  }

  .link-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.3rem;
    color: var(--c-text, #1e293b);
  }

  .link-label-spaced {
    margin-top: 0.75rem;
  }

  .link-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    font-size: 0.85rem;
    font-family: inherit;
    color: var(--c-text, #1e293b);
    background: var(--c-surface, #fff);
    box-sizing: border-box;
  }

  .link-input:focus {
    outline: none;
    border-color: var(--c-accent, #3182ce);
    box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.15);
  }

  .link-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  /* TipTap ProseMirror element styles */
  .rte-editor :global(.ProseMirror) {
    outline: none;
    min-height: 200px;
  }

  /* Clearfix for floated images */
  .rte-editor :global(.ProseMirror)::after {
    content: '';
    display: table;
    clear: both;
  }

  .rte-editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--c-text-light, #94a3b8);
    pointer-events: none;
    height: 0;
    font-style: italic;
  }

  .rte-editor :global(.ProseMirror p) {
    margin: 0 0 0.5em;
  }

  .rte-editor :global(.ProseMirror h2) { font-size: 1.4rem; font-weight: 700; margin: 1em 0 0.4em; }
  .rte-editor :global(.ProseMirror h3) { font-size: 1.15rem; font-weight: 600; margin: 0.8em 0 0.3em; }
  .rte-editor :global(.ProseMirror h4) { font-size: 1rem; font-weight: 600; margin: 0.6em 0 0.25em; }

  .rte-editor :global(.ProseMirror ul),
  .rte-editor :global(.ProseMirror ol) { padding-left: 1.5em; margin: 0.5em 0; }
  .rte-editor :global(.ProseMirror li) { margin: 0.15em 0; }
  .rte-editor :global(.ProseMirror blockquote) { border-left: 3px solid var(--c-border, #e2e8f0); padding-left: 1em; margin: 0.5em 0; color: var(--c-text-light, #718096); }
  .rte-editor :global(.ProseMirror hr) { border: none; border-top: 1px solid var(--c-border, #e2e8f0); margin: 1em 0; }

  .rte-editor :global(.ProseMirror code) {
    background: var(--c-bg, #f7f8fa);
    padding: 0.15em 0.35em;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .rte-editor :global(.ProseMirror pre) {
    background: var(--c-bg, #f7f8fa);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    padding: 0.75em 1em;
    margin: 0.5em 0;
    overflow-x: auto;
  }

  .rte-editor :global(.ProseMirror pre code) {
    background: none;
    padding: 0;
  }

  .rte-editor :global(.ProseMirror a) {
    color: var(--c-accent, #3182ce);
    text-decoration: underline;
  }

  .rte-editor :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius, 6px);
  }

  .rte-editor :global(.ProseMirror img.ProseMirror-selectednode) {
    outline: 2px solid var(--c-accent, #3182ce);
    outline-offset: 2px;
  }

  .rte-editor :global(.ProseMirror table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
  }

  .rte-editor :global(.ProseMirror th),
  .rte-editor :global(.ProseMirror td) {
    border: 1px solid var(--c-border, #e2e8f0);
    padding: 0.4em 0.6em;
    text-align: left;
    vertical-align: top;
  }

  .rte-editor :global(.ProseMirror th) {
    background: var(--c-bg, #f7f8fa);
    font-weight: 600;
  }

  .rte-editor :global(.ProseMirror-dropcursor) {
    border-color: #2563eb;
  }
</style>
