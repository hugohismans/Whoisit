<script lang="ts">
  import { app } from '../lib/appState.svelte'
  import { locale, t } from '../lib/i18n/index.svelte'
  import { helpContent } from '../lib/i18n/help'

  const sections = $derived(helpContent[locale()])
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
  <header>
    <h1 class="text-2xl font-bold">{t('help.title')}</h1>
    <p class="mt-2 text-sm text-ink-300">{t('help.note')}</p>
  </header>

  {#each sections as section (section.platform)}
    <section class="card px-6 py-5">
      <h2 class="text-lg font-semibold text-mint-400">{section.platform}</h2>
      <ol class="mt-3 space-y-2 text-sm leading-relaxed text-ink-300">
        {#each section.steps as step, index (index)}
          <li class="flex gap-3">
            <span
              class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink-850 text-xs font-semibold text-ink-300"
              aria-hidden="true">{index + 1}</span
            >
            <span>{step}</span>
          </li>
        {/each}
      </ol>
      {#if section.note}
        <p class="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-500">{section.note}</p>
      {/if}
    </section>
  {/each}

  <div class="flex justify-center">
    <button type="button" class="btn btn-ghost" onclick={() => app.leaveHelp()}>
      {t('common.back')}
    </button>
  </div>
</div>
