<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let scripts = $state<any[]>([]);
  let availablePages = $state<Array<{ slug: string; title: string }>>([]);
  let showModal = $state(false);
  let editId = $state<number | null>(null);
  let pageSearch = $state('');
  let form = $state({
    name: '',
    code: '',
    position: 'head' as 'head' | 'body',
    priority: 0,
    isActive: true,
    scope: 'global' as 'global' | 'targeted',
    targetPages: [] as string[],
  });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/tracking-scripts');
      scripts = res.data;
    } catch (err: any) { toast.error(err.message); }
  }

  async function loadPages() {
    try {
      const res = await api.get<{ data: any[]; meta: any }>('/pages?limit=500');
      availablePages = res.data.map((p: any) => ({ slug: p.slug, title: p.title }));
    } catch { /* non-critical */ }
  }

  onMount(() => { load(); loadPages(); });

  function resetForm() {
    form = { name: '', code: '', position: 'head', priority: 0, isActive: true, scope: 'global', targetPages: [] };
    editId = null;
    pageSearch = '';
  }

  async function save() {
    try {
      if (editId) {
        await api.put(`/tracking-scripts/${editId}`, form);
        toast.success('Tracking script updated.');
      } else {
        await api.post('/tracking-scripts', form);
        toast.success('Tracking script created.');
      }
      showModal = false;
      resetForm();
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  function startEdit(script: any) {
    form = {
      name: script.name,
      code: script.code,
      position: script.position,
      priority: script.priority,
      isActive: script.isActive,
      scope: script.scope,
      targetPages: script.targetPages || [],
    };
    editId = script.id;
    showModal = true;
  }

  async function deleteScript(id: number) {
    if (!confirm('Delete this tracking script?')) return;
    try {
      await api.del(`/tracking-scripts/${id}`);
      toast.success('Tracking script deleted.');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  function togglePage(slug: string) {
    if (form.targetPages.includes(slug)) {
      form.targetPages = form.targetPages.filter((s) => s !== slug);
    } else {
      form.targetPages = [...form.targetPages, slug];
    }
  }

  let filteredPages = $derived(
    pageSearch
      ? availablePages.filter((p) =>
          p.title.toLowerCase().includes(pageSearch.toLowerCase()) ||
          p.slug.toLowerCase().includes(pageSearch.toLowerCase()))
      : availablePages,
  );
</script>

<div class="page-header">
  <h1>Tracking Scripts</h1>
  <button class="btn btn-primary" onclick={() => { resetForm(); showModal = true; }}>+ New Script</button>
</div>

{#if scripts.length === 0}
  <div class="card"><div class="empty-state"><p>No tracking scripts configured. Add analytics or marketing scripts (GA4, Facebook Pixel, etc.) to inject on your site.</p></div></div>
{:else}
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Scope</th>
          <th>Priority</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each scripts as script}
          <tr>
            <td><strong>{script.name}</strong></td>
            <td>
              <span class="badge" class:badge-draft={script.position === 'head'} class:badge-archived={script.position === 'body'}>
                &lt;{script.position}&gt;
              </span>
            </td>
            <td>
              {#if script.scope === 'global'}
                <span class="badge badge-published">All pages</span>
              {:else}
                <span class="badge badge-draft" title={script.targetPages?.join(', ')}>
                  {script.targetPages?.length || 0} page{script.targetPages?.length === 1 ? '' : 's'}
                </span>
              {/if}
            </td>
            <td>{script.priority}</td>
            <td>
              <span class="badge" class:badge-published={script.isActive} class:badge-archived={!script.isActive}>
                {script.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-sm btn-outline" onclick={() => startEdit(script)}>Edit</button>
              <button class="btn btn-sm btn-danger" onclick={() => deleteScript(script.id)}>Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if showModal}
  <div class="modal-overlay" onclick={() => { showModal = false; resetForm(); }} role="dialog" aria-labelledby="ts-modal-title" aria-modal="true">
    <div class="modal" style="max-width: 640px;" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => { showModal = false; resetForm(); }}>
      <div class="modal-header">
        <h2 id="ts-modal-title">{editId ? 'Edit' : 'New'} Tracking Script</h2>
        <button class="btn-icon" onclick={() => { showModal = false; resetForm(); }} aria-label="Close">&#10005;</button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); save(); }}>
        <div class="form-group">
          <label>Name</label>
          <input class="form-control" bind:value={form.name} placeholder="e.g. GA4, Facebook Pixel, HubSpot" required />
        </div>

        <div class="form-group">
          <label>Script Code</label>
          <textarea class="form-control mono" bind:value={form.code} rows="8"
            placeholder="<script>...</script>" required
            style="font-size: 0.85rem; font-family: 'JetBrains Mono', 'Fira Code', monospace;"
          ></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label>Position</label>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-sm" class:btn-primary={form.position === 'head'} class:btn-outline={form.position !== 'head'} onclick={() => form.position = 'head'}>
                &lt;head&gt;
              </button>
              <button type="button" class="btn btn-sm" class:btn-primary={form.position === 'body'} class:btn-outline={form.position !== 'body'} onclick={() => form.position = 'body'}>
                &lt;/body&gt;
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Priority <span style="color: var(--c-text-light); font-weight: normal;">(lower = first)</span></label>
            <input class="form-control" type="number" bind:value={form.priority} min="-100" max="100" />
          </div>
        </div>

        <div class="form-group">
          <label>Scope</label>
          <div style="display: flex; gap: 0.35rem;">
            <button type="button" class="btn btn-sm" class:btn-primary={form.scope === 'global'} class:btn-outline={form.scope !== 'global'} onclick={() => form.scope = 'global'}>
              All Pages
            </button>
            <button type="button" class="btn btn-sm" class:btn-primary={form.scope === 'targeted'} class:btn-outline={form.scope !== 'targeted'} onclick={() => form.scope = 'targeted'}>
              Specific Pages
            </button>
          </div>
        </div>

        {#if form.scope === 'targeted'}
          <div class="form-group">
            <label>Target Pages</label>
            <input class="form-control" bind:value={pageSearch} placeholder="Search pages..." style="margin-bottom: 0.5rem;" />
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--c-border); border-radius: 6px; padding: 0.5rem;">
              {#each filteredPages as pg}
                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; cursor: pointer;">
                  <input type="checkbox" checked={form.targetPages.includes(pg.slug)} onchange={() => togglePage(pg.slug)} />
                  <span>{pg.title}</span>
                  <span class="mono" style="color: var(--c-text-light); font-size: 0.8rem;">/{pg.slug}</span>
                </label>
              {/each}
              {#if filteredPages.length === 0}
                <p style="color: var(--c-text-light); margin: 0.5rem 0; font-size: 0.85rem;">No pages found.</p>
              {/if}
            </div>
            {#if form.targetPages.length > 0}
              <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--c-text-light);">
                Selected: {form.targetPages.join(', ')}
              </div>
            {/if}
          </div>
        {/if}

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" bind:checked={form.isActive} /> Active
          </label>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => { showModal = false; resetForm(); }}>Cancel</button>
          <button type="submit" class="btn btn-primary">{editId ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
