<script lang="ts">
  import { STARTING_LIVES } from '../lib/game/engine.svelte'
  import { tCount } from '../lib/i18n/index.svelte'

  let { lives }: { lives: number } = $props()

  const slots = $derived(Array.from({ length: STARTING_LIVES }, (_, index) => index < lives))
</script>

<!-- Un seul libellé lisible par lecteur d'écran ; les cœurs restent décoratifs. -->
<p class="flex items-center gap-1" aria-label={tCount('game.livesLeft', lives)}>
  {#each slots as alive, index (index)}
    <svg
      class={['size-5 transition-colors', alive ? 'text-danger' : 'text-ink-800']}
      viewBox="0 0 24 24"
      fill={alive ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7.5-4.7-7.5-9.7a4.3 4.3 0 0 1 7.5-2.8 4.3 4.3 0 0 1 7.5 2.8c0 5-7.5 9.7-7.5 9.7z"
      />
    </svg>
  {/each}
</p>
