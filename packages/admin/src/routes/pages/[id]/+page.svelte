<script lang="ts">
  import { onMount } from 'svelte';
  import { page as routePage } from '$app/stores';
  import { beforeNavigate } from '$app/navigation';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import Breadcrumb from '$lib/components/Breadcrumb.svelte';
  import MediaPicker from '$lib/components/MediaPicker.svelte';
  import PageEditorSidebar from '$lib/components/PageEditorSidebar.svelte';
  import BlockEditorRegion from '$lib/components/BlockEditorRegion.svelte';
  import PreviewPanel from '$lib/components/PreviewPanel.svelte';
  import PresenceIndicator from '$lib/components/PresenceIndicator.svelte';

  let pageData = $state<any>(null);
  let contentType = $state<any>(null);
  let blockTypes = $state<any[]>([]);
  let error = $state('');
  let success = $state('');
  let activeRegion = $state('content');
  let saving = $state(false);
  let showPreview = $state(false);
  let dirty = $state(false);

  let allMenus = $state<any[]>([]);
  let menuDetails = $state<Record<number, any>>({});
  let revisions = $state<any[]>([]);
  let previewPanel = $state<PreviewPanel | null>(null);
  let blockEditor = $state<BlockEditorRegion | null>(null);

  // Snapshot of clean state for dirty tracking
  let cleanSnapshot = $state('');

  const id = $derived($routePage.params.id ?? '');

  const breadcrumbs = $derived([
    { label: 'Dashboard', href: '/' },
    { label: 'Pages', href: '/pages' },
    { label: pageData?.title || 'Loading...' },
  ]);

  function takeSnapshot() {
    if (!pageData) return;
    cleanSnapshot = JSON.stringify({
      title: pageData.title, slug: pageData.slug,
      status: pageData.status, fields: pageData.fields,
    });
  }

  function checkDirty() {
    if (!pageData || !cleanSnapshot) return;
    const current = JSON.stringify({
      title: pageData.title, slug: pageData.slug,
      status: pageData.status, fields: pageData.fields,
    });
    dirty = current !== cleanSnapshot;
  }

  // Watch for changes to mark dirty
  $effect(() => {
    if (pageData) {
      // Access reactive properties to trigger tracking
      void pageData.title;
      void pageData.slug;
      void pageData.status;
      void JSON.stringify(pageData.fields);
      checkDirty();
    }
  });

  // Warn before navigating away with unsaved changes
  beforeNavigate(({ cancel }) => {
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel();
    }
  });

  // Warn before closing tab with unsaved changes
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty) {
      e.preventDefault();
    }
  }

  async function load() {
    try {
      const [pageRes, btRes, menusRes] = await Promise.all([
        api.get<{ data: any }>(`/pages/${id}`),
        api.get<{ data: any[] }>('/block-types'),
        api.get<{ data: any[] }>('/menus'),
      ]);
      pageData = pageRes.data;
      blockTypes = btRes.data;
      allMenus = menusRes.data;
      if (pageData.typeId) {
        const ctRes = await api.get<{ data: any }>(`/content-types/${pageData.typeId}`);
        contentType = ctRes.data;
        if (contentType.regions?.length > 0) activeRegion = contentType.regions[0].name;
      }
      await loadMenuDetails();
      takeSnapshot();
      dirty = false;
    } catch (err: any) { error = err.message; }
  }

  async function loadMenuDetails() {
    const details: Record<number, any> = {};
    for (const menu of allMenus) {
      const res = await api.get<{ data: any }>(`/menus/${menu.id}`);
      details[menu.id] = res.data;
    }
    menuDetails = details;
  }

  async function loadRevisions() {
    try {
      const res = await api.get<{ data: any[] }>(`/pages/${id}/revisions`);
      revisions = res.data;
    } catch { revisions = []; }
  }

  onMount(load);

  async function save() {
    saving = true;
    error = '';
    success = '';
    if (!pageData.title?.trim()) { error = 'Title cannot be empty.'; saving = false; return; }
    if (!pageData.slug?.trim()) { error = 'Slug cannot be empty.'; saving = false; return; }
    try {
      await api.put(`/pages/${id}`, {
        title: pageData.title, slug: pageData.slug, status: pageData.status,
        fields: pageData.fields || {}, scheduledAt: pageData.scheduledAt || null,
      });
      toast.success('Page saved.');
      takeSnapshot();
      dirty = false;
      if (showPreview) previewPanel?.refresh();
    } catch (err: any) {
      const msg = err.message?.includes('Slug already exists')
        ? 'A page with this slug already exists.' : err.message;
      toast.error(msg);
    } finally { saving = false; }
  }

  async function setStatus(status: string) {
    try {
      await api.put(`/pages/${id}`, { status });
      pageData.status = status;
      toast.success(status === 'published' ? 'Page published.' : 'Page unpublished.');
      takeSnapshot();
      dirty = false;
      if (showPreview) previewPanel?.refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (pageData && !saving) save();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      showPreview = !showPreview;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={handleBeforeUnload} />

{#if !pageData}
  <div class="loading">Loading page...</div>
{:else}
  <div class="page-header">
    <div>
      <Breadcrumb crumbs={breadcrumbs} />
      <h1 style="margin-top: 0.25rem;">Edit: {pageData.title}</h1>
    </div>
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <button class="btn" class:btn-primary={!showPreview} class:btn-outline={showPreview}
        onclick={() => showPreview = !showPreview}>
        {showPreview ? 'Hide Preview' : 'Preview'}
      </button>
      {#if pageData.status === 'draft'}
        <button class="btn btn-primary" onclick={() => setStatus('published')}>Publish</button>
      {:else}
        <button class="btn btn-outline" onclick={() => setStatus('draft')}>Unpublish</button>
      {/if}
      <button class="btn btn-primary save-btn" class:dirty onclick={save} disabled={saving}>
        {#if dirty}<span class="dirty-dot"></span>{/if}
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>

  <PresenceIndicator pageId={id} />

  {#if error}<div class="alert alert-error">{error}</div>{/if}

  <div class="editor-layout" class:with-preview={showPreview}>
    <div class="editor-main">
      <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem;">
        <div>
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="form-group">
              <label for="pe-title">Title</label>
              <input id="pe-title" class="form-control" bind:value={pageData.title} oninput={() => checkDirty()} />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="pe-slug">Slug</label>
                <input id="pe-slug" class="form-control mono" bind:value={pageData.slug} oninput={() => checkDirty()} />
              </div>
              <div class="form-group">
                <label for="pe-status">Status</label>
                <select id="pe-status" class="form-control" bind:value={pageData.status}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            {#if contentType?.fieldsSchema?.length > 0}
              <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--c-border);" />
              <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Fields</h3>
              {#each contentType.fieldsSchema as field}
                <div class="form-group">
                  <label>{field.label || field.name}</label>
                  {#if field.type === 'media'}
                    <MediaPicker value={pageData.fields?.[field.name] || null}
                      onSelect={(mediaId) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = mediaId; }} />
                  {:else if field.type === 'url'}
                    <input type="url" class="form-control" value={pageData.fields?.[field.name] || ''} placeholder="https://..."
                      oninput={(e) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = (e.target as HTMLInputElement).value; }} />
                  {:else}
                    <input class="form-control" value={pageData.fields?.[field.name] || ''}
                      oninput={(e) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = (e.target as HTMLInputElement).value; }} />
                  {/if}
                </div>
              {/each}
            {/if}
          </div>

          <BlockEditorRegion bind:this={blockEditor} {pageData} pageId={id} {contentType} {blockTypes}
            bind:activeRegion bind:error onReload={load}
            onBlockExpand={(pbId) => { if (showPreview) previewPanel?.highlightBlock(pbId); }} />
        </div>

        <PageEditorSidebar
          {pageData} {id} {allMenus} {menuDetails} {revisions}
          bind:success bind:error
          onMenuDetailsReload={loadMenuDetails}
          onRevisionsReload={loadRevisions}
          onPageReload={load}
        />
      </div>
    </div>

    <PreviewPanel bind:this={previewPanel} slug={pageData.slug} visible={showPreview}
      onBlockSelect={(pbId, region) => { blockEditor?.scrollToBlock(pbId); }} />
  </div>
{/if}

<style>
  .editor-layout {
    display: flex;
    gap: 0;
  }
  .editor-main {
    flex: 1;
    min-width: 0;
  }
  .editor-layout.with-preview {
    height: calc(100vh - 140px);
  }
  .editor-layout.with-preview .editor-main {
    flex: 1;
    overflow-y: auto;
  }
  .editor-layout.with-preview :global(.preview-panel) {
    flex: 1;
    min-width: 400px;
    max-width: 50%;
    height: 100%;
  }

  .save-btn {
    position: relative;
  }

  .dirty-dot {
    width: 7px;
    height: 7px;
    background: #fbbf24;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.15rem;
    animation: pulse-dot 2s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
