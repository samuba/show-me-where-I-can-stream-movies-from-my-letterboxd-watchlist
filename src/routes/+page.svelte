<script lang="ts">
	import '@picocss/pico/css/pico.min.css';
	import type { LetterboxdList, LetterboxdListFile, StreamProvider } from 'src/app';
	import { onMount } from 'svelte';
	import letterboxdListsWrongType from '../letterboxdLists.json';

	let letterboxdListFiles = letterboxdListsWrongType as unknown as LetterboxdListFile[];
	let selectedListFile: LetterboxdListFile | undefined = letterboxdListFiles[0];
	let selectedList: LetterboxdList = { name: '', description: '', entries: [], streamProviders: [], url: '' };
	let streamProviders = [] as StreamProvider[];
	let loading = true;

	onMount(() => {
		const selectedListFromUrl = new URL(document.location as unknown as string).searchParams.get('list');
		if (selectedListFromUrl) {
			selectedListFile = letterboxdListFiles.find((x) => x.nameUrl === selectedListFromUrl);
		} else {
			selectedListFile = letterboxdListFiles.find((x) => x.name === localStorage.getItem('selectedList'));
		}
		selectedListFile ??= letterboxdListFiles[0];
		listChanged();
	});

	async function listChanged() {
		console.log(selectedListFile?.name.replaceAll(' ', '_'));
		loading = true;
		try {
			selectedList = await fetch(selectedListFile!.filePath).then((x) => x.json());
			streamProviders = selectedList.streamProviders.map((x) => ({ ...x, enabled: readIsProviderEnabled(x.name) }));
			localStorage.setItem('selectedList', selectedListFile!.name);
			setSearchParam('list', selectedListFile?.nameUrl ?? '');
		} finally {
			loading = false;
		}
	}

	function setSearchParam(key: string, value: string) {
		const url = new URL(document.location as unknown as string);
		url.searchParams.set(key, value);
		window.history.pushState(null, '', url.toString());
	}

	function saveProviderEnabled(provider: string, enabled: boolean) {
		localStorage.setItem(`provider: ${provider}`, enabled + '');
	}

	function readIsProviderEnabled(provider: string) {
		return localStorage.getItem(`provider: ${provider}`) === 'true' ? true : false;
	}
</script>

<svelte:head>
	<title>Letterboxd List Streams</title>
</svelte:head>

<div class="container" style="margin-top: 3rem">
	<h1>Who Streams My Letterboxd List</h1>

	{#if loading}
		<h5 aria-busy="true">Loading {selectedListFile?.name ?? ''}...</h5>
	{:else}
		<select id="lists-select" bind:value={selectedListFile} on:change={listChanged}>
			{#each letterboxdListFiles as list}
				<option value={list}>{list.name}</option>
			{/each}
		</select>

		<details style="margin-top: 2rem">
			<summary>Stream Providers</summary>
			<div style="margin-bottom: 3rem">
				{#each streamProviders as provider}
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
			{#each streamProviders.filter((x) => x.enabled) as provider}
				<section>
					<h2 style="margin-bottom: 1rem">{provider.name}</h2>
					<div>
						{#each selectedList.entries.filter((x) => x.streamProviders.includes(provider.name)) as movie}
							<div style="display: inline-block; margin-left: 1rem; margin-bottom: 1rem">
								<a href={movie.letterboxdUrl}>
									<div style="display: relative;">
										<img
											src={movie.imageUrl}
											style="max-height: 15rem; max-width: 9.2rem;"
											title={movie.name}
											alt={`${movie.name}`}
										/>

										<div style="display: flex; justify-content: space-between; font-size: 8.5pt;">
											{#if movie.listPosition}
												<div
													style="padding-right: 0.2rem; padding-left: 0.1rem; padding-top: 0; transform: translateY(-100%); border-top-right-radius: 0.3rem; width: fit-content; background-color: rgba(0 14 0 / 75%);"
												>
													#{movie.listPosition}
												</div>
											{:else}
												<div />
											{/if}
											<div
												style="padding-left: 0.2rem; padding-top: 0; transform: translateY(-100%); border-top-left-radius: 0.3rem; width: fit-content; background-color: rgba(0 14 0 / 75%);"
											>
												{movie.rating}★
											</div>
										</div>
										{#if movie.streamProvidersOriginalTitle && movie.originalTitle != movie.streamProvidersOriginalTitle}
											<div
												style="font-size: 12pt; color: white;  transform: translateY(-600%); background: red;display: flex; justify-content: center;"
											>
												probably not correct
											</div>
										{:else}
											<!-- cuz otherwise position of the other changes -->
											<div style="font-size: 12pt;">&nbsp;</div>
										{/if}
									</div>
								</a>
							</div>
						{:else}
							Nothing found
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
