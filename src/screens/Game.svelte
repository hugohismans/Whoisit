<script lang="ts">
  import Lives from '../components/Lives.svelte'
  import MessageBubble from '../components/MessageBubble.svelte'
  import { app } from '../lib/appState.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { displayName } from '../lib/format/participants'

  const game = $derived(app.game)

  /**
   * Raccourcis clavier : chiffres pour répondre, Entrée / Espace pour enchaîner.
   * Jouer au clavier change complètement le rythme d'une partie.
   */
  function onKeyDown(event: KeyboardEvent) {
    if (!game || game.over) return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    // La vue contexte a ses propres raccourcis (Échap) : on lui laisse la main.
    if (app.contextMessage) return

    if (!game.answered) {
      const index = Number.parseInt(event.key, 10) - 1
      const choice = game.round?.options[index]
      if (choice !== undefined) {
        event.preventDefault()
        game.submit(choice)
      }
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      app.nextRound()
    }
  }

  /** Habillage d'un bouton de réponse une fois la réponse donnée. */
  function optionClass(option: string): string {
    if (!game?.answered) return 'border-ink-700 hover:border-mint-500 hover:bg-ink-850'
    if (option === game.round?.author) return 'border-success bg-success/15 text-ink-100'
    if (option === game.answer) return 'border-danger bg-danger/15 text-ink-100'
    return 'border-ink-800 text-ink-500'
  }
</script>

<svelte:window onkeydown={onKeyDown} />

{#if !game}
  <div class="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16">
    <header>
      <h1 class="text-2xl font-bold">{t('game.unplayable')}</h1>
      <p class="mt-2 text-sm leading-relaxed text-ink-300">{t('game.unplayable.hint')}</p>
    </header>
    <div class="flex justify-center">
      <button type="button" class="btn btn-primary" onclick={() => app.backToThreads()}>
        {t('gameover.changeThread')}
      </button>
    </div>
  </div>
{:else if game.round}
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
    <header class="flex items-center justify-between gap-4">
      <Lives lives={game.lives} />
      <p class="flex items-center gap-4 text-sm text-ink-300">
        <span>{t('game.streak')} <strong class="text-ink-100">{game.streak}</strong></span>
        <span class="text-ink-500">{t('game.best')} <strong>{game.record}</strong></span>
      </p>
    </header>

    <h1 class="text-center text-xl font-bold sm:text-2xl">{t('game.question')}</h1>

    <MessageBubble
      message={game.round.message}
      author={game.answered ? game.round.author : null}
    />

    <!-- aria-live : le résultat est annoncé sans déplacer le focus. -->
    <div class="min-h-6 text-center text-sm font-semibold" aria-live="polite">
      {#if game.answered}
        {#if game.lastAttemptCorrect}
          <span class="text-success">{t('game.correct')}</span>
        {:else}
          <span class="text-danger">
            {t('game.wrong', { author: displayName(game.round.author) })}
          </span>
        {/if}
      {/if}
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      {#each game.round.options as option, index (option)}
        <button
          type="button"
          class={['btn justify-start border text-left transition-colors', optionClass(option)]}
          disabled={game.answered}
          onclick={() => game.submit(option)}
        >
          <span
            class="grid size-6 shrink-0 place-items-center rounded-md bg-ink-850 text-xs font-semibold text-ink-500"
            aria-hidden="true">{index + 1}</span
          >
          <span class="truncate">{displayName(option)}</span>
        </button>
      {/each}
    </div>

    {#if game.answered}
      <div class="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => app.showContext(game.round!.message)}
        >
          {t('game.showContext')}
        </button>
        <button type="button" class="btn btn-primary" onclick={() => app.nextRound()}>
          {t('game.next')} →
        </button>
      </div>
    {/if}

    <footer class="flex items-center justify-between gap-4 pt-2 text-xs text-ink-500">
      <span class="hidden sm:inline">
        {t('game.keyboardHint', { max: game.round.options.length })}
      </span>
      <span>{t('game.progress', { correct: game.correctCount, total: game.answeredCount })}</span>
      <button type="button" class="underline hover:text-ink-300" onclick={() => app.endGame()}>
        {t('game.quit')}
      </button>
    </footer>
  </div>
{/if}
