<script lang="ts">
  import LanguageSwitch from './components/LanguageSwitch.svelte'
  import Placeholder from './components/Placeholder.svelte'
  import Home from './screens/Home.svelte'
  import Parsing from './screens/Parsing.svelte'
  import Help from './screens/Help.svelte'
  import { app } from './lib/appState.svelte'
  import { t } from './lib/i18n/index.svelte'
</script>

<div class="flex min-h-full flex-col">
  <nav class="flex items-center justify-between px-4 py-3">
    <button
      type="button"
      class="text-sm font-semibold text-ink-300 transition-colors hover:text-ink-100"
      onclick={() => app.reset()}
    >
      {t('app.title')}
    </button>
    <LanguageSwitch />
  </nav>

  <main class="flex-1">
    {#if app.screen === 'home'}
      <Home />
    {:else if app.screen === 'parsing'}
      <Parsing />
    {:else if app.screen === 'threads'}
      <Placeholder title={t('threads.title')} subtitle={t('threads.subtitle')} step={3} />
    {:else if app.screen === 'identities'}
      <Placeholder title={t('identities.title')} subtitle={t('identities.subtitle')} step={4} />
    {:else if app.screen === 'game'}
      <Placeholder title={t('game.question')} subtitle={t('app.tagline')} step={5} />
    {:else if app.screen === 'gameover'}
      <Placeholder title={t('gameover.title')} subtitle={t('gameover.missed')} step={6} />
    {:else if app.screen === 'help'}
      <Help />
    {/if}
  </main>

  <footer class="px-4 py-6 text-center text-xs text-ink-500">
    {t('home.privacy.ephemeral')}
  </footer>
</div>
