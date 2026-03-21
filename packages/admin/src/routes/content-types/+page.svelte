<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let types = $state<any[]>([]);
  let error = $state('');
  let showCreate = $state(false);
  let editType = $state<any>(null);
  let newType = $state({ name: '', slug: '', description: '', fieldsSchema: '[]', regions: '[]', defaultBlocks: '[]' });
  let blockTypesList = $state<any[]>([]);

  async function loadBlockTypes() {
    try {
      const res = await api.get<{ data: any[] }>('/block-types');
      blockTypesList = res.data;
    } catch (_) { /* non-critical */ }
  }

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/content-types');
      types = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(() => { load(); loadBlockTypes(); });

  async function createType() {
    try {
      await api.post('/content-types', {
        ...newType,
        fieldsSchema: JSON.parse(newType.fieldsSchema),
        regions: JSON.parse(newType.regions),
        defaultBlocks: JSON.parse(newType.defaultBlocks),
      });
      showCreate = false;
      newType = { name: '', slug: '', description: '', fieldsSchema: '[]', regions: '[]', defaultBlocks: '[]' };
      load();
    } catch (err: any) { error = err.message; }
  }

  function startEdit(t: any) {
    editType = {
      ...t,
      fieldsSchema: JSON.stringify(t.fieldsSchema || [], null, 2),
      regions: JSON.stringify(t.regions || [], null, 2),
      defaultBlocks: JSON.stringify(t.defaultBlocks || [], null, 2),
    };
  }

  async function saveEdit() {
    if (!editType) return;
    try {
      await api.put(`/content-types/${editType.id}`, {
        name: editType.name,
        slug: editType.slug,
        description: editType.description,
        fieldsSchema: JSON.parse(editType.fieldsSchema),
        regions: JSON.parse(editType.regions),
        defaultBlocks: JSON.parse(editType.defaultBlocks),
      });
      editType = null;
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteType(id: number) {
    if (!confirm('Delete this content type?')) return;
    try { await api.del(`/content-types/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }
</script>

<div class="page-header">
  <h1>Content Types ({types.length})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Type</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="table-wrap">
  <table>
    <thead><tr><th>Name</th><th>Slug</th><th>Fields</th><th>Regions</th><th>Default Blocks</th><th></th></tr></thead>
    <tbody>
      {#each types as t}
        <tr>
          <td><strong>{t.name}</strong></td>
          <td style="color: var(--c-text-light);">{t.slug}</td>
          <td>{t.fieldsSchema?.length || 0}</td>
          <td>{t.regions?.length || 0}</td>
          <td>{t.defaultBlocks?.length || 0}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick={() => startEdit(t)}>Edit</button>
            <button class="btn btn-sm btn-danger" onclick={() => deleteType(t.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate || editType}
  {@const isEdit = !!editType}
  {@const item = editType || newType}
  <div class="modal-overlay" onclick={() => { showCreate = false; editType = null; }} role="dialog" aria-modal="true" aria-labelledby="content-type-modal-title">
    <div class="modal" style="max-width: 700px;" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => { showCreate = false; editType = null; }}>
      <div class="modal-header"><h2 id="content-type-modal-title">{isEdit ? 'Edit' : 'New'} Content Type</h2><button class="btn-icon" onclick={() => { showCreate = false; editType = null; }} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); isEdit ? saveEdit() : createType(); }}>
        <div class="form-grid">
          <div class="form-group"><label>Name</label><input class="form-control" bind:value={item.name} required /></div>
          <div class="form-group"><label>Slug</label><input class="form-control" bind:value={item.slug} required /></div>
        </div>
        <div class="form-group"><label>Description</label><input class="form-control" bind:value={item.description} /></div>
        <div class="form-group">
          <label>Fields Schema (JSON)</label>
          <textarea class="form-control" bind:value={item.fieldsSchema} style="min-height: 120px; font-family: monospace; font-size: 0.8rem;"></textarea>
        </div>
        <div class="form-group">
          <label>Regions (JSON)</label>
          <textarea class="form-control" bind:value={item.regions} style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"></textarea>
        </div>
        <div class="form-group">
          <label>Default Blocks</label>
          <p style="font-size: 0.8rem; color: var(--c-text-light); margin: 0 0 0.5rem;">Blocks automatically added when a new page of this type is created. Users can still remove, reorder, or add more.</p>
          {@const parsedDefaults = (() => { try { return JSON.parse(item.defaultBlocks || '[]'); } catch { return []; } })()}
          {@const parsedRegions = (() => { try { return JSON.parse(item.regions || '[]'); } catch { return []; } })()}
          {#each parsedDefaults as block, i}
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; padding: 0.35rem 0.5rem; background: var(--c-bg-alt, #f8fafc); border-radius: var(--radius, 6px); border: 1px solid var(--c-border, #e2e8f0);">
              <select class="form-control" style="max-width: 140px; font-size: 0.8rem;" value={block.region} onchange={(e) => {
                const arr = JSON.parse(item.defaultBlocks || '[]');
                arr[i].region = (e.target as HTMLSelectElement).value;
                item.defaultBlocks = JSON.stringify(arr, null, 2);
              }}>
                {#each parsedRegions as r}
                  <option value={r.name}>{r.label || r.name}</option>
                {/each}
              </select>
              <select class="form-control" style="flex: 1; font-size: 0.8rem;" value={block.blockTypeSlug} onchange={(e) => {
                const arr = JSON.parse(item.defaultBlocks || '[]');
                arr[i].blockTypeSlug = (e.target as HTMLSelectElement).value;
                item.defaultBlocks = JSON.stringify(arr, null, 2);
              }}>
                <option value="">Select block type...</option>
                {#each blockTypesList as bt}
                  <option value={bt.slug}>{bt.name}</option>
                {/each}
              </select>
              <span style="font-size: 0.75rem; color: var(--c-text-light); min-width: 20px; text-align: center;">#{block.position}</span>
              <button type="button" class="btn-icon" style="font-size: 0.85rem;" aria-label="Move up" disabled={i === 0} onclick={() => {
                const arr = JSON.parse(item.defaultBlocks || '[]');
                [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                arr.forEach((b: any, idx: number) => b.position = idx);
                item.defaultBlocks = JSON.stringify(arr, null, 2);
              }}>&#8593;</button>
              <button type="button" class="btn-icon" style="font-size: 0.85rem;" aria-label="Move down" disabled={i === parsedDefaults.length - 1} onclick={() => {
                const arr = JSON.parse(item.defaultBlocks || '[]');
                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                arr.forEach((b: any, idx: number) => b.position = idx);
                item.defaultBlocks = JSON.stringify(arr, null, 2);
              }}>&#8595;</button>
              <button type="button" class="btn-icon" style="color: var(--c-danger, #e53e3e); font-size: 0.85rem;" aria-label="Remove default block" onclick={() => {
                const arr = JSON.parse(item.defaultBlocks || '[]');
                arr.splice(i, 1);
                arr.forEach((b: any, idx: number) => b.position = idx);
                item.defaultBlocks = JSON.stringify(arr, null, 2);
              }}>&#10005;</button>
            </div>
          {/each}
          <button type="button" class="btn btn-sm btn-outline" style="margin-top: 0.25rem;" onclick={() => {
            const arr = JSON.parse(item.defaultBlocks || '[]');
            const regions = (() => { try { return JSON.parse(item.regions || '[]'); } catch { return []; } })();
            arr.push({ region: regions[0]?.name || 'content', blockTypeSlug: blockTypesList[0]?.slug || '', position: arr.length });
            item.defaultBlocks = JSON.stringify(arr, null, 2);
          }}>+ Add Default Block</button>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => { showCreate = false; editType = null; }}>Cancel</button>
          <button type="submit" class="btn btn-primary">{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
