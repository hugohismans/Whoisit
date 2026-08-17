<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte'
  import { app } from '../lib/appState.svelte'
  import { locale, t, type TranslationKey } from '../lib/i18n/index.svelte'

  const fileName = $derived(app.pendingFile?.name ?? '')
  const fileSize = $derived(
    app.pendingFile
      ? new Intl.NumberFormat(locale(), {
          style: 'unit',
          unit: 'megabyte',
          maximumFractionDigits: 1,
        }).format(app.pendingFile.size / 1024 / 1024)
      : '',
  )

  // Les codes d'erreur alimentent directement les clés de traduction, ce qui
  // force chaque cause à avoir son explication propre.
  const errorTitle = $derived(
    app.error ? (`parsing.error.${app.error.code}` as TranslationKey) : null,
  )
  const errorHint = $derived(
    app.error ? (`parsing.error.${app.error.code}.hint` as TranslationKey) : null,
  )
</script>

<div class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16">
  {#if app.error && errorTitle && errorHint}
    <header>
      <h1 class="text-2xl font-bold">{t(errorTitle)}</h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-300">{t(errorHint)}</p>
    </header>

    <div class="flex flex-wrap justify-center gap-3">
      <button type="button" class="btn btn-primary" onclick={() => app.reset()}>
        {t('parsing.retry')}
      </button>
      <button type="button" class="btn btn-ghost" onclick={() => app.goto('help')}>
        {t('common.help')}
      </button>
    </div>
  {:else}
    <header>
      <h1 class="text-2xl font-bold">{t('parsing.title')}</h1>
      <p class="mt-2 text-sm text-ink-300">{t('parsing.subtitle')}</p>
    </header>

    <section class="card px-6 py-6">
      {#if fileName}
        <p class="truncate font-mono text-sm text-ink-300">
          {fileName}
          <span class="text-ink-500">{fileSize}</span>
        </p>
      {/if}

      <div class="mt-4">
        <ProgressBar ratio={app.progress.ratio} label={t('parsing.title')} />
      </div>

      <p class="mt-3 text-sm text-ink-500">{t(app.progress.stepKey as TranslationKey)}</p>
    </section>

    <div class="flex justify-center">
      <button type="button" class="btn btn-ghost" onclick={() => app.reset()}>
        {t('common.cancel')}
      </button>
    </div>
  {/if}
</div>
