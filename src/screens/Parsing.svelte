<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte'
  import { app } from '../lib/appState.svelte'
  import { t, type TranslationKey } from '../lib/i18n/index.svelte'

  const fileName = $derived(app.pendingFile?.name ?? 'demo')
  const fileSize = $derived(
    app.pendingFile ? `${(app.pendingFile.size / 1024 / 1024).toFixed(1)} Mo` : '',
  )

  // Palier 2 : la progression réelle sera poussée par le worker de parsing.
</script>

<div class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16">
  <header>
    <h1 class="text-2xl font-bold">{t('parsing.title')}</h1>
    <p class="mt-2 text-sm text-ink-300">{t('parsing.subtitle')}</p>
  </header>

  <section class="card px-6 py-6">
    <p class="truncate font-mono text-sm text-ink-300">{fileName} <span class="text-ink-500">{fileSize}</span></p>

    <div class="mt-4">
      <ProgressBar ratio={app.progress.ratio} label={t('parsing.title')} />
    </div>

    <p class="mt-3 text-sm text-ink-500">
      {t(app.progress.stepKey as TranslationKey)}
    </p>

    {#if app.error}
      <p class="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink-100">
        {app.error.message}
      </p>
    {/if}
  </section>

  <div class="flex justify-center">
    <button type="button" class="btn btn-ghost" onclick={() => app.reset()}>
      {t('common.cancel')}
    </button>
  </div>
</div>
