<script lang="ts">
  import type { Message } from '../lib/types'
  import { locale } from '../lib/i18n/index.svelte'
  import { displayName } from '../lib/format/participants'

  let {
    message,
    author = null,
    highlighted = false,
    compact = false,
  }: {
    message: Message
    /** Nom affiché en en-tête. `null` tant que la réponse n'est pas connue. */
    author?: string | null
    highlighted?: boolean
    compact?: boolean
  } = $props()

  const stamp = $derived(
    new Intl.DateTimeFormat(locale(), {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(message.ts),
  )
</script>

<article
  class={[
    'rounded-bubble border px-5 py-4 transition-colors',
    highlighted
      ? 'border-mint-500 bg-mint-600/10'
      : 'border-ink-800 bg-ink-900/80',
    compact && 'px-4 py-3',
  ]}
>
  {#if author}
    <p class="mb-1 text-sm font-semibold text-mint-400">{displayName(author)}</p>
  {/if}

  <!-- `white-space: pre-wrap` : les messages multi-lignes gardent leur forme. -->
  <p class={['whitespace-pre-wrap break-words', compact ? 'text-sm' : 'text-lg leading-relaxed']}>
    {message.text}
  </p>

  <p class="mt-2 text-xs text-ink-500">
    <time datetime={new Date(message.ts).toISOString()}>{stamp}</time>
  </p>
</article>
