<script lang="ts">
  import { app } from '../lib/appState.svelte'
  import { locale, t, tCount } from '../lib/i18n/index.svelte'
  import { displayName } from '../lib/format/participants'
  import type { Conversation } from '../lib/types'

  let query = $state('')

  const numbers = $derived(new Intl.NumberFormat(locale()))
  const dates = $derived(
    new Intl.DateTimeFormat(locale(), { month: 'short', year: 'numeric' }),
  )

  const filtered = $derived(
    query.trim() === ''
      ? app.conversations
      : app.conversations.filter((conversation) =>
          conversation.title.toLowerCase().includes(query.trim().toLowerCase()),
        ),
  )

  /** Aperçu des participants : les plus bavards d'abord, numéros masqués. */
  function preview(conversation: Conversation): string {
    const authors = conversation.participants.slice(0, 3).map((name) => displayName(name))
    const rest = conversation.participants.length - authors.length
    return rest > 0 ? `${authors.join(', ')} +${rest}` : authors.join(', ')
  }

  function span(conversation: Conversation): string {
    const first = conversation.messages[0]?.ts
    const last = conversation.messages.at(-1)?.ts
    if (!first || !last) return ''
    const from = dates.format(first)
    const to = dates.format(last)
    return from === to ? from : `${from} → ${to}`
  }

  /**
   * Le plafond n'est signalé que s'il a réellement rogné une conversation :
   * l'annoncer sur un fil de six messages serait au mieux du bruit, au pire
   * inquiétant.
   */
  const truncated = $derived(
    app.messageCap !== undefined &&
      app.conversations.some((conversation) => conversation.messages.length >= app.messageCap!),
  )

  const sourceLabel: Record<Conversation['source'], string> = {
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    instagram: 'Instagram',
    demo: 'Demo',
  }
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-12">
  <header>
    <h1 class="text-2xl font-bold">{t('threads.title')}</h1>
    <p class="mt-2 text-sm text-ink-300">{t('threads.subtitle')}</p>
  </header>

  {#if app.conversations.length > 6}
    <input
      type="search"
      bind:value={query}
      placeholder={t('threads.search')}
      class="w-full rounded-xl border border-ink-800 bg-ink-900/60 px-4 py-2.5 text-sm outline-none placeholder:text-ink-500 focus:border-mint-500"
    />
  {/if}

  {#if filtered.length === 0}
    <p class="card px-6 py-10 text-center text-sm text-ink-500">{t('threads.empty')}</p>
  {/if}

  <ul class="flex flex-col gap-2">
    {#each filtered as conversation (conversation.title + conversation.messages.length)}
      <li>
        <button
          type="button"
          class="card group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:border-mint-500"
          onclick={() => app.select(conversation)}
        >
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2">
              <span class="truncate font-semibold">{conversation.title}</span>
              <span
                class="shrink-0 rounded-full border border-ink-800 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-ink-500"
              >
                {sourceLabel[conversation.source]}
              </span>
            </p>
            <p class="mt-1 truncate text-sm text-ink-500">{preview(conversation)}</p>
            <p class="mt-1 text-xs text-ink-500">
              {tCount('threads.messageCount', conversation.messages.length, {
                count: numbers.format(conversation.messages.length),
              })}
              · {tCount('threads.participantCount', conversation.participants.length)}
              {#if span(conversation)}· {span(conversation)}{/if}
            </p>
          </div>
          <span class="shrink-0 text-sm font-semibold text-mint-400 opacity-0 transition-opacity group-hover:opacity-100">
            {t('threads.play')} →
          </span>
        </button>
      </li>
    {/each}
  </ul>

  {#if app.skippedOneToOne > 0}
    <p class="text-xs text-ink-500">
      {tCount('threads.hiddenOneToOne', app.skippedOneToOne)}
    </p>
  {/if}
  {#if truncated && app.messageCap !== undefined}
    <p class="text-xs text-ink-500">
      {t('threads.truncated', { count: numbers.format(app.messageCap) })}
    </p>
  {/if}

  <div class="flex justify-center pt-2">
    <button type="button" class="btn btn-ghost" onclick={() => app.reset()}>
      {t('common.back')}
    </button>
  </div>
</div>
