<script lang="ts">
  import { app, DEFAULT_MESSAGE_CAP } from '../lib/appState.svelte'
  import { locale, t } from '../lib/i18n/index.svelte'

  /**
   * Sur une archive volumineuse, le choix revient à l'utilisateur : personne
   * d'autre ne sait s'il joue sur un vieux téléphone ou sur une tour de bureau.
   */
  const size = $derived(
    new Intl.NumberFormat(locale(), {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 0,
    }).format((app.pendingFile?.size ?? 0) / 1024 / 1024),
  )

  const cap = $derived(new Intl.NumberFormat(locale()).format(DEFAULT_MESSAGE_CAP))
</script>

<div class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16">
  <header>
    <h1 class="text-2xl font-bold">{t('archive.large.title')}</h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-300">
      {t('archive.large.description', { size })}
    </p>
  </header>

  <div class="flex flex-col gap-3">
    <button
      type="button"
      class="card flex flex-col gap-1 px-5 py-4 text-left transition-colors hover:border-mint-500"
      onclick={() => app.startParsing({ maxMessagesPerThread: DEFAULT_MESSAGE_CAP })}
    >
      <span class="flex items-center gap-2 font-semibold">
        {t('archive.large.limited', { count: cap })}
        <span class="rounded-full bg-mint-600/20 px-2 py-0.5 text-xs font-medium text-mint-400">
          {t('archive.large.recommended')}
        </span>
      </span>
      <span class="text-sm text-ink-500">{t('archive.large.limitedHint')}</span>
    </button>

    <button
      type="button"
      class="card flex flex-col gap-1 px-5 py-4 text-left transition-colors hover:border-mint-500"
      onclick={() => app.startParsing({})}
    >
      <span class="font-semibold">{t('archive.large.full')}</span>
      <span class="text-sm text-ink-500">{t('archive.large.fullHint')}</span>
    </button>
  </div>

  <div class="flex justify-center">
    <button type="button" class="btn btn-ghost" onclick={() => app.reset()}>
      {t('common.cancel')}
    </button>
  </div>
</div>
