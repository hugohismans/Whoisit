<script lang="ts">
  import MessageBubble from '../components/MessageBubble.svelte'
  import { app } from '../lib/appState.svelte'
  import { t, type TranslationKey } from '../lib/i18n/index.svelte'
  import { displayName } from '../lib/format/participants'

  const game = $derived(app.game)
  let copied = $state(false)

  /**
   * Le texte partagé ne contient que des nombres — jamais un message, jamais un
   * nom. C'est la promesse d'accueil appliquée jusqu'au bout de la boucle.
   */
  async function copyScore() {
    if (!game) return
    const text = t('gameover.shareText', {
      streak: game.bestStreak,
      correct: game.correctCount,
      total: game.answeredCount,
    })
    try {
      await navigator.clipboard.writeText(text)
      copied = true
      setTimeout(() => (copied = false), 2000)
    } catch {
      // Presse-papiers refusé : rien de grave, le score reste affiché à l'écran.
    }
  }
</script>

{#if game}
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
    <header class="text-center">
      <h1 class="text-3xl font-bold">{t('gameover.title')}</h1>
      {#if game.ending}
        <p class="mt-2 text-sm text-ink-300">
          {t(`gameover.ending.${game.ending}` as TranslationKey)}
        </p>
      {/if}
    </header>

    <section class="card flex flex-col items-center gap-2 px-6 py-6 text-center">
      <p class="text-4xl font-bold text-mint-400">{game.bestStreak}</p>
      <p class="text-sm text-ink-300">{t('gameover.streak', { count: game.bestStreak })}</p>

      {#if game.brokeRecord}
        <p class="rounded-full bg-amber-glow/15 px-3 py-1 text-xs font-semibold text-amber-glow">
          {t('gameover.newBest')}
        </p>
      {/if}

      <p class="mt-1 text-sm text-ink-500">
        {t('gameover.score', { correct: game.correctCount, total: game.answeredCount })}
      </p>
    </section>

    <section>
      <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-500">
        {t('gameover.missed')}
      </h2>

      {#if game.missed.length === 0}
        <p class="card mt-3 px-6 py-8 text-center text-sm text-ink-500">
          {t('gameover.missedEmpty')}
        </p>
      {:else}
        <ul class="mt-3 flex flex-col gap-3">
          {#each game.missed as attempt (attempt.message.i)}
            <li>
              <button
                type="button"
                class="block w-full text-left"
                onclick={() => app.showContext(attempt.message)}
              >
                <MessageBubble message={attempt.message} author={attempt.author} compact />
              </button>
              <p class="mt-1 flex flex-wrap items-center gap-2 pl-1 text-xs">
                <span class="text-danger">
                  {t('gameover.youSaid', { answer: displayName(attempt.answer) })}
                </span>
                <button
                  type="button"
                  class="text-ink-500 underline hover:text-ink-300"
                  onclick={() => app.showContext(attempt.message)}
                >
                  {t('game.showContext')}
                </button>
              </p>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <div class="flex flex-wrap justify-center gap-3">
      <button type="button" class="btn btn-primary" onclick={() => app.replay()}>
        {t('gameover.replay')}
      </button>
      {#if app.conversations.length > 1}
        <button type="button" class="btn btn-ghost" onclick={() => app.backToThreads()}>
          {t('gameover.changeThread')}
        </button>
      {/if}
      <button type="button" class="btn btn-ghost" onclick={copyScore}>
        {copied ? t('gameover.copied') : t('gameover.copyScore')}
      </button>
    </div>

    <p class="text-center text-xs text-ink-500">{t('gameover.shareHint')}</p>
  </div>
{/if}
