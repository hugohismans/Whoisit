<script lang="ts">
  /** `ratio` à null = progression indéterminée (on affiche une barre en mouvement). */
  let { ratio, label }: { ratio: number | null; label?: string } = $props()

  const percent = $derived(ratio === null ? null : Math.round(Math.min(1, Math.max(0, ratio)) * 100))
</script>

<div
  class="h-2 w-full overflow-hidden rounded-full bg-ink-850"
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={percent ?? undefined}
>
  {#if percent === null}
    <div class="h-full w-1/3 animate-pulse rounded-full bg-mint-500"></div>
  {:else}
    <div
      class="h-full rounded-full bg-mint-500 transition-[width] duration-200 ease-out"
      style:width="{percent}%"
    ></div>
  {/if}
</div>
