<script lang="ts">
  import DropZone from '../components/DropZone.svelte'
  import PrivacyPanel from '../components/PrivacyPanel.svelte'
  import { app } from '../lib/appState.svelte'
  import { t } from '../lib/i18n/index.svelte'

  /**
   * Palier 1 : on accepte le fichier et on bascule sur l'écran de lecture.
   * Le pipeline de parsing (worker + parsers) arrive au palier 2.
   */
  function handleFile(file: File) {
    app.pendingFile = file
    app.goto('parsing')
  }

  function startDemo() {
    app.pendingFile = null
    app.goto('parsing')
  }
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
  <header class="text-center">
    <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">{t('app.title')}</h1>
    <p class="mx-auto mt-3 max-w-md text-balance text-ink-300">{t('app.tagline')}</p>
  </header>

  <DropZone onfile={handleFile} />

  <div class="flex flex-wrap items-center justify-center gap-3">
    <button type="button" class="btn btn-ghost" onclick={startDemo}>
      {t('home.demo')}
    </button>
    <button type="button" class="btn btn-ghost" onclick={() => app.goto('help')}>
      {t('common.help')}
    </button>
  </div>

  <PrivacyPanel />
</div>
