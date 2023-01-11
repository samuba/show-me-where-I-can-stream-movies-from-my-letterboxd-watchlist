<script lang="ts">
	import { browser } from '$app/environment';
	import '@picocss/pico/css/pico.min.css';
	import type { LetterboxdList } from 'src/app';
	import letterboxdListsWrongType from '../letterboxdLists.json';

	let letterboxdLists: LetterboxdList[];

	if (browser) {
		// read enabled providers from localstorage
		letterboxdLists = (letterboxdListsWrongType as unknown as LetterboxdList[]).map((list) => {
			return {
				...list,
				streamProviders: list.streamProviders.map((provider) => {
					return { ...provider, enabled: readIsProviderEnabled(provider.name) };
				})
			};
		});
	} else {
		letterboxdLists = [
			{ name: 'loading...', entries: [], streamProviders: [], url: '', description: '' }
		];
	}

	const selectedListNameFromLocalstorage = browser
		? letterboxdLists.find((x) => x.name === localStorage.getItem('selectedList'))
			? localStorage.getItem('selectedList')
			: undefined
		: undefined;
	let selectedListName = selectedListNameFromLocalstorage ?? letterboxdLists[0]?.name;
	console.log(selectedListName);
	$: selectedList = letterboxdLists.find((x) => x.name === selectedListName)!;
	$: selectedStreamProviders = selectedList.streamProviders.filter((x) => x.enabled);

	function saveProviderEnabled(provider: string, enabled: boolean) {
		localStorage.setItem(`provider: ${provider}`, enabled + '');
	}

	function readIsProviderEnabled(provider: string) {
		return localStorage.getItem(`provider: ${provider}`) === 'true' ? true : false;
	}

	function saveSelectedList(listName: string) {
		localStorage.setItem('selectedList', listName);
	}
</script>

<svelte:head>
	<title>Letterboxd List Streams</title>
</svelte:head>

<div class="container" style="margin-top: 3rem">
	<h1>Who Streams My Letterboxd List</h1>

	<select
		id="lists-select"
		bind:value={selectedListName}
		on:change={(e) => saveSelectedList(e?.target?.value)}
	>
		{#each letterboxdLists as list}
			<option value={list.name}>{list.name}</option>
		{/each}
	</select>

	<details style="margin-top: 2rem">
		<summary>Stream Providers</summary>
		<div style="margin-bottom: 3rem">
			{#each selectedList.streamProviders as provider}
				<div style="display: inline-block">
					<input
						bind:checked={provider.enabled}
						on:change={(e) => saveProviderEnabled(provider.name, e?.target?.checked)}
						type="checkbox"
						id={provider.name}
					/>
					<label
						for={provider.name}
						title={provider.name}
						style="font-size: 14pt; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; width: 16rem"
					>
						{provider.name}
					</label>
				</div>
			{/each}
		</div>
	</details>

	<div style="margin-top: 3rem; ">
		{@html selectedList.description}
		<a href={selectedList.url} target="_blank" rel="noreferrer">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				style="height: 1.1rem; width: 1.1rem;"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
				/>
			</svg>
			Open in Letterboxd: "{selectedList.name}"
		</a>
	</div>

	<div style="margin-top: 3rem;">
		{#each selectedStreamProviders as provider}
			<section>
				<h2 style="margin-bottom: 1rem">{provider.name}</h2>
				<div>
					{#each selectedList.entries.filter( (x) => x.streamProviders.includes(provider.name) ) as movie}
						<div style="display: inline-block; margin-left: 1rem; margin-bottom: 1rem">
							<!-- <h5 x-text="film.name"></h5> -->
							<a href={movie.letterboxdUrl}>
								<img
									src={movie.imageUrl}
									style="max-height: 15rem; max-width: 9.5rem;"
									title={movie.name}
									alt={`${movie.name}`}
								/>
							</a>
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</div>
