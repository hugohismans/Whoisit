<script lang="ts">
  import type { Conversation, Message } from '../lib/types'
  import { CONTEXT_RADIUS, CONTEXT_STEP, contextWindow, toTranscript } from '../lib/game/context'
  import { authorColor, authorTint, initials } from '../lib/format/authorColor'
  import { displayName } from '../lib/format/participants'
  import { locale, t } from '../lib/i18n/index.svelte'

  let {
    conversation,
    message,
    onclose,
  }: { conversation: Conversation; message: Message; onclose: () => void } = $props()

  let radius = $state(CONTEXT_RADIUS)
  let dialog: HTMLDialogElement

  /** Identifiant du message deviné, pour le retrouver et le faire défiler. */
  const TARGET_ID = 'context-target'

  const window_ = $derived(contextWindow(conversation.messages, message.i, radius))
  const rows = $derived(toTranscript(window_.messages))

  const dayFormat = $derived(
    new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  )
  const timeFormat = $derived(
    new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }),
  )

  /**
   * `showModal` plutôt qu'un div en superposition : le navigateur se charge du
   * piège à focus, de la touche Échap et du fond inerte. Rien à réimplémenter.
   */
  $effect(() => {
    dialog.showModal()
    return () => dialog.close()
  })

  // Le message deviné doit être visible à l'ouverture, et le rester quand on
  // élargit la fenêtre vers le haut — sans quoi ajouter vingt messages
  // au-dessus le ferait disparaître de l'écran.
  $effect(() => {
    void radius
    dialog.querySelector(`#${TARGET_ID}`)?.scrollIntoView({ block: 'center' })
  })
</script>

<dialog
  bind:this={dialog}
  onclose={onclose}
  aria-label={t('context.title')}
  class="m-auto max-h-[90vh] w-[min(46rem,92vw)] rounded-2xl border border-ink-800 bg-ink-950 p-0 text-ink-100 backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
>
  <header
    class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-800 bg-ink-950/95 px-5 py-4 backdrop-blur"
  >
    <div>
      <h2 class="font-semibold">{conversation.title}</h2>
      <p class="mt-0.5 text-xs text-ink-500">{t('context.subtitle')}</p>
    </div>
    <button
      type="button"
      class="btn btn-ghost shrink-0 px-3 py-1.5 text-sm"
      onclick={() => dialog.close()}
    >
      {t('common.close')}
    </button>
  </header>

  <div class="px-5 py-4">
    {#if window_.atStart}
      <p class="pb-4 text-center text-xs text-ink-500">{t('context.start')}</p>
    {:else}
      <div class="flex justify-center pb-4">
        <button
          type="button"
          class="btn btn-ghost px-3 py-1.5 text-xs"
          onclick={() => (radius += CONTEXT_STEP)}
        >
          ↑ {t('context.loadMore')}
        </button>
      </div>
    {/if}

    <ol class="flex flex-col gap-1">
      {#each rows as row, index (row.message.i)}
        {@const isTarget = index === window_.targetIndex}

        {#if row.showDateBreak}
          <li class="py-3 text-center text-xs text-ink-500">
            {dayFormat.format(row.message.ts)}
          </li>
        {/if}

        <li class="flex gap-3" id={isTarget ? TARGET_ID : undefined}>
          <!-- Pastille d'initiale : présente une seule fois par groupe de
               messages, comme dans une vraie appli de messagerie. -->
          <div class="w-9 shrink-0">
            {#if row.showAuthor}
              <span
                class="grid size-9 place-items-center rounded-full text-xs font-semibold"
                style:color={authorColor(row.message.author)}
                style:background={authorTint(row.message.author)}
                aria-hidden="true"
              >
                {initials(displayName(row.message.author))}
              </span>
            {/if}
          </div>

          <div class="min-w-0 flex-1">
            {#if row.showAuthor}
              <p class="mb-0.5 text-sm font-semibold" style:color={authorColor(row.message.author)}>
                {displayName(row.message.author)}
              </p>
            {/if}

            <div
              class={[
                'rounded-bubble border px-4 py-2.5 transition-colors',
                isTarget
                  ? 'border-mint-500 bg-mint-600/12 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-mint-500)_18%,transparent)]'
                  : 'border-transparent bg-ink-900/70',
              ]}
            >
              {#if isTarget}
                <p class="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-mint-400">
                  {t('context.guessed')}
                </p>
              {/if}
              <p class="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
                {row.message.text}
              </p>
              <p class="mt-1 text-[0.7rem] text-ink-500">
                <time datetime={new Date(row.message.ts).toISOString()}>
                  {timeFormat.format(row.message.ts)}
                </time>
              </p>
            </div>
          </div>
        </li>
      {/each}
    </ol>

    {#if window_.atEnd}
      <p class="pt-4 text-center text-xs text-ink-500">{t('context.end')}</p>
    {:else}
      <div class="flex justify-center pt-4">
        <button
          type="button"
          class="btn btn-ghost px-3 py-1.5 text-xs"
          onclick={() => (radius += CONTEXT_STEP)}
        >
          ↓ {t('context.loadMore')}
        </button>
      </div>
    {/if}
  </div>
</dialog>
