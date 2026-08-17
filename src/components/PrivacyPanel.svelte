<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'

  const does = ['home.privacy.does.1', 'home.privacy.does.2', 'home.privacy.does.3'] as const
  const doesnt = [
    'home.privacy.doesnt.1',
    'home.privacy.doesnt.2',
    'home.privacy.doesnt.3',
  ] as const
</script>

<section class="card px-6 py-5">
  <h2 class="flex items-center gap-2 text-base font-semibold text-mint-400">
    <svg
      class="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
    {t('home.privacy.heading')}
  </h2>

  <!-- La CSP est citée telle quelle : c'est le seul argument qui se vérifie. -->
  <p class="mt-3 text-sm leading-relaxed text-ink-300 [&_code]:rounded [&_code]:bg-ink-850 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-mint-400">
    <!-- eslint-disable-next-line svelte/no-at-html-tags — chaîne de traduction locale, jamais de contenu utilisateur -->
    {@html t('home.privacy.enforced')}
  </p>

  <div class="mt-5 grid gap-5 sm:grid-cols-2">
    <ul class="space-y-2 text-sm text-ink-300">
      {#each does as key (key)}
        <li class="flex gap-2">
          <span class="mt-0.5 text-success" aria-hidden="true">✓</span>
          <span>{t(key)}</span>
        </li>
      {/each}
    </ul>
    <ul class="space-y-2 text-sm text-ink-300">
      {#each doesnt as key (key)}
        <li class="flex gap-2">
          <!-- Ton neutre plutôt que rouge : ces lignes sont rassurantes, pas des erreurs. -->
          <span class="mt-0.5 text-ink-500" aria-hidden="true">✕</span>
          <span>{t(key)}</span>
        </li>
      {/each}
    </ul>
  </div>

  <p class="mt-5 border-t border-ink-800 pt-4 text-xs text-ink-500">
    {t('home.privacy.ephemeral')}
  </p>
</section>
