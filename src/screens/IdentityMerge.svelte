<script lang="ts">
  import { app } from '../lib/appState.svelte'
  import { t, tCount, type TranslationKey } from '../lib/i18n/index.svelte'
  import { displayName, isPhoneNumber } from '../lib/format/participants'
  import { authorColor, authorTint, initials } from '../lib/format/authorColor'
  import {
    initialGroups,
    mergeGroups,
    suggestMerges,
    resolvedName,
    toIdentityMap,
    type IdentityGroup,
  } from '../lib/identity/merge'

  const conversation = $derived(app.selected!)

  let groups = $state<IdentityGroup[]>(initialGroups(app.selected!))
  let selected = $state<Set<string>>(new Set())
  /**
   * Les numéros sont masqués partout ailleurs. Ici, et ici seulement, on peut
   * les révéler : c'est le seul écran où l'utilisateur en a besoin pour
   * reconnaître la personne et lui donner un nom.
   */
  let reveal = $state(false)
  let dismissed = $state<Set<string>>(new Set())

  const suggestions = $derived(
    suggestMerges(groups.map((group) => group.name)).filter(
      (suggestion) => !dismissed.has(suggestion.names.join('→')),
    ),
  )

  const hasPhoneNumbers = $derived(
    groups.some((group) => group.members.some((member) => isPhoneNumber(member))),
  )

  const touched = $derived(
    groups.length !== conversation.participants.length ||
      groups.some((group) => group.renamed !== null),
  )

  function show(name: string): string {
    return displayName(name, reveal)
  }

  function toggle(name: string) {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    selected = next
  }

  function mergeSelection() {
    // Le groupe le plus bavard absorbe les autres : son nom est le plus
    // susceptible d'être celui que l'utilisateur reconnaît.
    const chosen = groups.filter((group) => selected.has(group.name))
    if (chosen.length < 2) return
    groups = mergeGroups(
      groups,
      chosen[0].name,
      chosen.slice(1).map((group) => group.name),
    )
    selected = new Set()
  }

  function acceptSuggestion(a: string, b: string) {
    const first = groups.find((group) => group.name === a)
    const second = groups.find((group) => group.name === b)
    if (!first || !second) return
    const [target, source] = first.count >= second.count ? [first, second] : [second, first]
    groups = mergeGroups(groups, target.name, [source.name])
  }

  function rename(group: IdentityGroup, value: string) {
    const renamed = value.trim() === '' ? null : value
    groups = groups.map((other) => (other === group ? { ...other, renamed } : other))
  }

  function reset() {
    groups = initialGroups(conversation)
    selected = new Set()
    dismissed = new Set()
  }
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10">
  <header>
    <p class="text-xs font-semibold uppercase tracking-widest text-mint-400">
      {conversation.title}
    </p>
    <h1 class="mt-2 text-2xl font-bold">{t('identities.title')}</h1>
    <p class="mt-2 text-sm leading-relaxed text-ink-300">{t('identities.subtitle')}</p>
    <p class="mt-1 text-xs text-ink-500">{t('identities.skipHint')}</p>
  </header>

  {#if suggestions.length > 0}
    <section class="card px-5 py-4">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t('identities.suggestions')}
      </h2>
      <ul class="mt-3 flex flex-col gap-2">
        {#each suggestions as suggestion (suggestion.names.join('→'))}
          <li class="flex flex-wrap items-center gap-3 text-sm">
            <span class="flex-1 text-ink-300">
              {t(`identities.suggestion.${suggestion.reason}` as TranslationKey, {
                a: show(suggestion.names[0]),
                b: show(suggestion.names[1]),
              })}
            </span>
            <button
              type="button"
              class="btn btn-primary px-3 py-1 text-xs"
              onclick={() => acceptSuggestion(suggestion.names[0], suggestion.names[1])}
            >
              {t('identities.merge')}
            </button>
            <button
              type="button"
              class="btn btn-ghost px-3 py-1 text-xs"
              onclick={() =>
                (dismissed = new Set([...dismissed, suggestion.names.join('→')]))}
            >
              {t('identities.dismiss')}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-xs text-ink-500">{t('identities.selectHint')}</p>
    {#if hasPhoneNumbers}
      <button
        type="button"
        class="btn btn-ghost px-3 py-1 text-xs"
        aria-pressed={reveal}
        onclick={() => (reveal = !reveal)}
      >
        {reveal ? t('identities.hide') : t('identities.reveal')}
      </button>
    {/if}
  </div>

  <ul class="flex flex-col gap-2">
    {#each groups as group (group.members.join('|'))}
      <li class="card flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          class="size-4 shrink-0 accent-mint-500"
          checked={selected.has(group.name)}
          aria-label={t('identities.selectLabel', { name: show(group.name) })}
          onchange={() => toggle(group.name)}
        />

        <span
          class="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
          style:color={authorColor(group.members[0])}
          style:background={authorTint(group.members[0])}
          aria-hidden="true"
        >
          {initials(show(resolvedName(group)))}
        </span>

        <div class="min-w-0 flex-1">
          <!-- Le champ reste vide tant que rien n'a été saisi : l'identité
               d'origine n'est qu'un indice de saisie, ce qui évite d'afficher
               un numéro complet et de le transformer en nom par inadvertance. -->
          <input
            type="text"
            value={group.renamed ?? ''}
            placeholder={show(group.name)}
            aria-label={t('identities.renameLabel', { name: show(group.name) })}
            class="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold outline-none placeholder:font-semibold placeholder:text-ink-100 hover:border-ink-800 focus:border-mint-500"
            oninput={(event) => rename(group, event.currentTarget.value)}
          />
          <p class="px-2 text-xs text-ink-500">
            {tCount('threads.messageCount', group.count)}
            {#if group.members.length > 1}
              · {tCount('identities.grouped', group.members.length)}
            {/if}
          </p>
        </div>
      </li>
    {/each}
  </ul>

  <div class="flex flex-wrap items-center justify-center gap-3">
    <button
      type="button"
      class="btn btn-ghost"
      disabled={selected.size < 2}
      class:opacity-40={selected.size < 2}
      onclick={mergeSelection}
    >
      {t('identities.mergeSelected')}
    </button>
    {#if touched}
      <button type="button" class="btn btn-ghost" onclick={reset}>
        {t('identities.reset')}
      </button>
    {/if}
  </div>

  <div class="flex flex-wrap justify-center gap-3 border-t border-ink-800 pt-5">
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => app.startGame(toIdentityMap(groups))}
    >
      {t('identities.start')}
    </button>
    <button type="button" class="btn btn-ghost" onclick={() => app.backToThreads()}>
      {t('common.back')}
    </button>
  </div>
</div>
