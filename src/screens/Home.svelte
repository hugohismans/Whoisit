<script lang="ts">
  import DropZone from '../components/DropZone.svelte'
  import PrivacyPanel from '../components/PrivacyPanel.svelte'
  import { app } from '../lib/appState.svelte'
  import { t, tCount } from '../lib/i18n/index.svelte'
  import { readBestStreak } from '../lib/game/storage'

  // Lu une fois à l'affichage : le record ne bouge pas tant qu'on est ici.
  const record = readBestStreak()

  const handleFile = (file: File) => app.submitFile(file)
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
  <header class="text-center">
    <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">{t('app.title')}</h1>
    <p class="mx-auto mt-3 max-w-md text-balance text-ink-300">{t('app.tagline')}</p>
  </header>

  <DropZone onfile={handleFile} />

  <div class="flex flex-wrap items-center justify-center gap-3">
    <button type="button" class="btn btn-ghost" onclick={() => app.startDemo()}>
      {t('home.demo')}
    </button>
    <button type="button" class="btn btn-ghost" onclick={() => app.goto('help')}>
      {t('common.help')}
    </button>
  </div>

  {#if record > 0}
    <p class="text-center text-sm text-ink-500">{tCount('home.record', record)}</p>
  {/if}

  <PrivacyPanel />
</div>
