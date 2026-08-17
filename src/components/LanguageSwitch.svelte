<script lang="ts">
  import { locale, setLocale, t, type Locale } from '../lib/i18n/index.svelte'

  const locales: { code: Locale; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
  ]
</script>

<div
  class="flex items-center gap-0.5 rounded-lg border border-ink-800 p-0.5"
  role="group"
  aria-label={t('common.language')}
>
  {#each locales as { code, label } (code)}
    <button
      type="button"
      class="rounded-md px-2 py-1 text-xs font-semibold transition-colors"
      class:bg-mint-500={locale() === code}
      class:text-ink-950={locale() === code}
      class:text-ink-500={locale() !== code}
      aria-pressed={locale() === code}
      onclick={() => setLocale(code)}
    >
      {label}
    </button>
  {/each}
</div>
