<script lang="ts">
  import { api } from '$lib/api.js';
  import RichTextEditor from './RichTextEditor.svelte';
  import SortableList from './SortableList.svelte';
  import MediaPicker from './MediaPicker.svelte';

  let {
    pageData,
    pageId,
    contentType,
    blockTypes,
    activeRegion = $bindable('content'),
    error = $bindable(''),
    onReload,
  }: {
    pageData: any;
    pageId: string;
    contentType: any;
    blockTypes: any[];
    activeRegion: string;
    error: string;
    onReload: () => void;
  } = $props();

  let showAddBlock = $state(false);
  let addBlockTab = $state<'new' | 'library'>('new');
  let libraryBlocks = $state<any[]>([]);
  let librarySearch = $state('');
  let libraryFilter = $state('');

  let filteredLibrary = $derived(
    libraryBlocks.filter((b) => {
      if (libraryFilter && b.typeSlug !== libraryFilter) return false;
      if (librarySearch && !b.title?.toLowerCase().includes(librarySearch.toLowerCase())) return false;
      return true;
    })
  );

  function getRegionBlocks(region: string): any[] {
    return pageData?.regions?.[region] || [];
  }

  function otherRegions(): { name: string; label: string }[] {
    return (contentType?.regions || []).filter((r: any) => r.name !== activeRegion);
  }

  function getFieldSchema(slug: string) {
    return blockTypes.find((t: any) => t.slug === slug)?.fieldsSchema || [];
  }

  function isFieldVisible(field: any, allFields: any[], blockFields: Record<string, any>): boolean {
    if (field.name === 'media' && allFields.some((f: any) => f.name === 'source'))
      return blockFields['source'] === 'upload' || !blockFields['source'];
    if (field.name === 'url' && allFields.some((f: any) => f.name === 'source'))
      return blockFields['source'] === 'youtube' || blockFields['source'] === 'vimeo';
    return true;
  }

  function sortableBlocks(region: string) {
    return getRegionBlocks(region).map((b: any) => ({ ...b, id: b.pb_id }));
  }

  async function addBlock(blockTypeId: number) {
    try {
      await api.post(`/pages/${pageId}/blocks`, { blockTypeId, region: activeRegion, fields: {} });
      showAddBlock = false;
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function addSharedBlock(blockId: number) {
    try {
      await api.post(`/pages/${pageId}/blocks`, { blockId, region: activeRegion, isShared: true });
      showAddBlock = false;
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function removeBlock(pbId: number) {
    if (!confirm('Remove this block?')) return;
    try { await api.del(`/pages/${pageId}/blocks/${pbId}`); onReload(); }
    catch (err: any) { error = err.message; }
  }

  async function moveBlock(pbId: number, targetRegion: string) {
    try {
      await api.put(`/pages/${pageId}/blocks/${pbId}`, { region: targetRegion, position: 999 });
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function updateBlockField(pbId: number, blockId: number, fieldName: string, value: unknown) {
    const regionBlocks = pageData.regions[activeRegion] || [];
    const block = regionBlocks.find((b: any) => b.pb_id === pbId);
    if (!block) return;
    block.fields[fieldName] = value;
    if (block.is_shared) {
      await api.put(`/pages/${pageId}/blocks/${pbId}`, { overrides: { [fieldName]: value } });
    } else {
      await api.put(`/blocks/${blockId}`, { fields: block.fields });
    }
  }

  async function reorderBlocks(reordered: any[]) {
    const order = reordered.map((b: any) => b.pb_id);
    pageData.regions[activeRegion] = reordered;
    try {
      await api.put(`/pages/${pageId}/blocks-order`, { region: activeRegion, order });
    } catch (err: any) { error = err.message; onReload(); }
  }

  async function openAddBlock() {
    showAddBlock = true;
    addBlockTab = 'new';
    librarySearch = '';
    libraryFilter = '';
    try {
      const res = await api.get<{ data: any[] }>('/blocks?reusable=true');
      libraryBlocks = res.data;
    } catch { libraryBlocks = []; }
  }
</script>

{#if contentType?.regions?.length > 0}
  <div class="tabs">
    {#each contentType.regions as region}
      <button class="tab" class:active={activeRegion === region.name} onclick={() => activeRegion = region.name}>
        {region.label} ({getRegionBlocks(region.name).length})
      </button>
    {/each}
  </div>
  <div class="card">
    <SortableList items={sortableBlocks(activeRegion)} onReorder={reorderBlocks}>
      {#snippet children(block, i)}
        <div class="block-editor" style="padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <strong style="font-size: 0.9rem;">
              {block.block_type}
              {#if block.is_shared}<span class="badge badge-published" style="margin-left: 0.5rem;">shared</span>{/if}
            </strong>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              {#if otherRegions().length > 0}
                <select class="form-control" style="font-size: 0.75rem; padding: 0.15rem 0.3rem; width: auto;"
                  onchange={(e) => { const val = (e.target as HTMLSelectElement).value; if (val) moveBlock(block.pb_id, val); (e.target as HTMLSelectElement).value = ''; }}>
                  <option value="">Move to...</option>
                  {#each otherRegions() as r}
                    <option value={r.name}>{r.label}</option>
                  {/each}
                </select>
              {/if}
              <button class="btn btn-sm btn-danger" onclick={() => removeBlock(block.pb_id)}>Remove</button>
            </div>
          </div>
          {#each getFieldSchema(block.block_type) as field}
            {#if isFieldVisible(field, getFieldSchema(block.block_type), block.fields)}
              <div class="form-group">
                <label style="font-size: 0.8rem;">{field.label || field.name}</label>
                {#if field.type === 'richtext'}
                  <RichTextEditor content={block.fields[field.name] || ''}
                    onUpdate={(json) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, json)} />
                {:else if field.type === 'media'}
                  <MediaPicker value={block.fields[field.name] || null}
                    onSelect={(mediaId) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, mediaId)} />
                {:else if field.type === 'select'}
                  <select class="form-control" value={block.fields[field.name] || field.default || ''}
                    onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLSelectElement).value)}>
                    {#each (field.settings?.options || field.options || []) as opt}
                      <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                    {/each}
                  </select>
                {:else if field.type === 'boolean'}
                  <input type="checkbox" checked={!!block.fields[field.name]}
                    onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).checked)} />
                {:else if field.type === 'number'}
                  <input type="number" class="form-control" value={block.fields[field.name] || ''}
                    oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, Number((e.target as HTMLInputElement).value))} />
                {:else if field.type === 'repeater'}
                  <textarea class="form-control" value={JSON.stringify(block.fields[field.name] || [], null, 2)}
                    onblur={(e) => { try { updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* ignore */ } }}
                    style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"></textarea>
                {:else if field.type === 'url'}
                  <input type="url" class="form-control" value={block.fields[field.name] || ''} placeholder="https://..."
                    oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                {:else}
                  <input class="form-control" value={block.fields[field.name] || ''}
                    oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {/snippet}
    </SortableList>
    <button class="btn btn-outline" style="width: 100%; margin-top: 0.75rem;" onclick={openAddBlock}>
      + Add Block to {activeRegion}
    </button>
  </div>
{/if}

{#if showAddBlock}
  <div class="modal-overlay" onclick={() => showAddBlock = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 600px;">
      <div class="modal-header">
        <h2>Add Block to "{activeRegion}"</h2>
        <button class="btn-icon" onclick={() => showAddBlock = false}>&#10005;</button>
      </div>
      <div class="modal-body">
        <div class="tabs" style="margin-bottom: 1rem;">
          <button class="tab" class:active={addBlockTab === 'new'} onclick={() => addBlockTab = 'new'}>New Block</button>
          <button class="tab" class:active={addBlockTab === 'library'} onclick={() => addBlockTab = 'library'}>From Library</button>
        </div>

        {#if addBlockTab === 'new'}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            {#each blockTypes as bt}
              <button class="card" style="cursor: pointer; text-align: left;" onclick={() => addBlock(bt.id)}>
                <strong style="font-size: 0.9rem;">{bt.name}</strong>
                {#if bt.description}<p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.25rem;">{bt.description}</p>{/if}
              </button>
            {/each}
          </div>
        {:else}
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <input class="form-control" placeholder="Search blocks..." bind:value={librarySearch} style="flex: 1;" />
            <select class="form-control" bind:value={libraryFilter} style="width: auto;">
              <option value="">All types</option>
              {#each blockTypes as bt}
                <option value={bt.slug}>{bt.name}</option>
              {/each}
            </select>
          </div>
          {#if filteredLibrary.length === 0}
            <p style="color: var(--c-text-light); font-size: 0.85rem; text-align: center; padding: 1rem;">
              {libraryBlocks.length === 0 ? 'No shared blocks in library yet.' : 'No blocks match your search.'}
            </p>
          {:else}
            <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              {#each filteredLibrary as block}
                <button class="card" style="cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center;"
                  onclick={() => addSharedBlock(block.id)}>
                  <div>
                    <strong style="font-size: 0.9rem;">{block.title || 'Untitled'}</strong>
                    <span style="font-size: 0.75rem; color: var(--c-text-light); margin-left: 0.5rem;">{block.typeSlug}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--c-text-light);">{block.usageCount} uses</span>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
