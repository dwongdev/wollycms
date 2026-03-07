<script lang="ts">
  const API_BASE = '/api/admin';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSetup(e: Event) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        error = json.errors?.[0]?.message || 'Setup failed';
        return;
      }
      window.location.href = '/admin/login';
    } catch (err: any) {
      error = err.message || 'Setup failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="setup-page">
  <form class="setup-form card" onsubmit={handleSetup}>
    <h1>WollyCMS</h1>
    <p class="setup-subtitle">Create your admin account to get started</p>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <div class="form-group">
      <label for="name">Name</label>
      <input id="name" type="text" class="form-control" bind:value={name} required autocomplete="name" />
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" class="form-control" bind:value={email} required autocomplete="email" />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input id="password" type="password" class="form-control" bind:value={password} required minlength="8" autocomplete="new-password" />
    </div>

    <div class="form-group">
      <label for="confirm-password">Confirm Password</label>
      <input id="confirm-password" type="password" class="form-control" bind:value={confirmPassword} required minlength="8" autocomplete="new-password" />
    </div>

    <button type="submit" class="btn btn-primary setup-btn" disabled={loading}>
      {loading ? 'Creating account...' : 'Create Admin Account'}
    </button>
  </form>
</div>

<style>
  .setup-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--c-bg);
  }

  .setup-form {
    width: 100%;
    max-width: 440px;
    padding: 2.5rem;
  }

  .setup-form h1 {
    font-size: 1.5rem;
    text-align: center;
    margin-bottom: 0.25rem;
  }

  .setup-subtitle {
    text-align: center;
    color: var(--c-text-light);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .setup-btn {
    width: 100%;
    justify-content: center;
    padding: 0.65rem;
    margin-top: 0.5rem;
  }
</style>
