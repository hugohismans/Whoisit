<script lang="ts">
  import { app } from '../lib/appState.svelte'
  import { t } from '../lib/i18n/index.svelte'

  /**
   * Écran de chantier : présent pour que la navigation soit complète dès le
   * palier 1. Chaque écran sera remplacé par sa vraie implémentation.
   */
  let {
    title,
    subtitle,
    step,
  }: { title: string; subtitle: string; step: number } = $props()
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
  <header>
    <p class="text-xs font-semibold uppercase tracking-widest text-mint-400">
      {t('common.stepOf', { current: step, total: 6 })}
    </p>
    <h1 class="mt-2 text-2xl font-bold">{title}</h1>
    <p class="mt-2 text-sm text-ink-300">{subtitle}</p>
  </header>

  <section
    class="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center text-ink-500"
  >
    <span class="text-2xl" aria-hidden="true">🚧</span>
    <p class="text-sm">{t('common.soon')}</p>
  </section>

  <div class="flex justify-center">
    <button type="button" class="btn btn-ghost" onclick={() => app.reset()}>
      {t('common.back')}
    </button>
  </div>
</div>
