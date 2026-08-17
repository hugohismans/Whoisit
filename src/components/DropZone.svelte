<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'

  let { onfile }: { onfile: (file: File) => void } = $props()

  let dragging = $state(false)
  let input: HTMLInputElement

  /** Compteur de dragenter/dragleave : les enfants génèrent des événements parasites. */
  let depth = 0

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    depth += 1
    dragging = true
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault()
    depth -= 1
    if (depth <= 0) {
      depth = 0
      dragging = false
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    depth = 0
    dragging = false
    const file = event.dataTransfer?.files?.[0]
    if (file) onfile(file)
  }

  function onPick(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (file) onfile(file)
    // Permet de re-sélectionner le même fichier après un retour en arrière.
    input.value = ''
  }
</script>

<div
  class={[
    'card relative flex flex-col items-center gap-3 px-6 py-12 text-center transition-colors',
    dragging && 'border-mint-500 bg-mint-600/10',
  ]}
  ondragenter={onDragEnter}
  ondragover={(e) => e.preventDefault()}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  role="region"
  aria-label={t('home.dropzone.title')}
>
  <svg
    class="size-10 text-mint-400"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>

  <p class="text-lg font-semibold">
    {dragging ? t('home.dropzone.dropNow') : t('home.dropzone.title')}
  </p>
  <p class="max-w-sm text-sm text-ink-500">{t('home.dropzone.hint')}</p>

  <button type="button" class="btn btn-primary mt-2" onclick={() => input.click()}>
    {t('home.dropzone.browse')}
  </button>

  <input
    bind:this={input}
    type="file"
    class="sr-only"
    accept=".zip,.txt,.json,application/zip,text/plain,application/json"
    onchange={onPick}
  />
</div>
