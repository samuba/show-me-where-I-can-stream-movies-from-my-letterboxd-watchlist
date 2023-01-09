import * as cheerio from 'npm:cheerio@1.0.0-rc.12';
import type { LetterboxdFilm, LetterboxdList, Film } from './src/app';

console.time('finished after');
const startTime = new Date();
const fileName = './src/letterboxdLists.json';
const numberOfConcurrentFetches = 1;

const lists = Deno.readTextFileSync('letterboxdUrls.txt')
	.split('\n')
	.map((x) => ({ url: x.split('|')[1].trim(), name: x.split('|')[0].trim() }));

// const filledLists = await Promise.all(lists.map((x) => createEntry(x.name, x.url)));

const infoCache = new Map<string, Film>();

const filledLists = [] as LetterboxdList[];
for (const list of lists) {
	filledLists.push(await createEntry(list.name, list.url));
}

Deno.writeTextFileSync(fileName, JSON.stringify(filledLists, null, 2));
console.log('\nfinished after ' + timeTillNow(startTime));

/// functions
///

async function createEntry(listName: string, url: string) {
	console.log('fetching for ' + listName);
	const firstPage = 1;
	let currentPage = firstPage;
	let lastPage = 9999; // will be overriden

	// if (firstPage !== lastPage) {
	//   Deno.writeTextFileSync(fileName, "");
	// }

	const films = [] as Film[];
	while (currentPage <= lastPage) {
		console.log(`fetching page ${currentPage}`);
		console.time('page');
		try {
			const fetches = [];
			for (let i = 0; i < numberOfConcurrentFetches; i++) {
				fetches.push(fetchPageFromLetterboxd(url, currentPage + i));
			}
			const contents = await Promise.all(fetches);
			const cheerioContents = contents.map((x) => cheerio.load(x));

			for (const $ of cheerioContents) {
				if ($('.linked-film-poster img').length === 0) currentPage = lastPage;

				const letterboxdFilms: LetterboxdFilm[] = [];
				$('.linked-film-poster').each((_, el) => {
					const name = $(el).find('img').attr('alt')!;
					const letterboxdUrl = 'https://letterboxd.com' + $(el).attr('data-film-slug')!;
					letterboxdFilms.push({ name, letterboxdUrl });
				});

				const filmsWithInfo = await Promise.all(letterboxdFilms.map((x) => getFilmInfo(x)));
				filmsWithInfo.forEach((x) => films.push(x));
				// (await Promise.all(filmsWithInfo.map((x) => getFilmStreamInfo(x)))).forEach((x) =>
				// 	films.push(x)
				// );
			}

			currentPage += numberOfConcurrentFetches;
		} catch (err) {
			console.log('problem fetching for page ' + currentPage + '. Trying again...', err);
			continue;
		}
		console.timeEnd('page');
	}

	let streamProviders = [] as string[];
	films.forEach((x) => {
		streamProviders = [...new Set([...streamProviders, ...x.streamProviders])];
	});
	streamProviders.sort();

	return {
		name: listName,
		url,
		description: await fetchListDescription(url),
		entries: films,
		streamProviders: streamProviders.map((x) => ({ name: x, enabled: false }))
	} as LetterboxdList;
}

async function fetchListDescription(listUrl: string) {
	const page = await fetch(listUrl).then((x) => x.text());
	const $ = cheerio.load(page);
	// $('.block-flag-wrapper').remove();
	return $('.list-title-intro .body-text').toString();
}

async function fetchPageFromLetterboxd(listUrl: string, currentPage: number) {
	return await fetch(listUrl + `page/${currentPage}`).then((x) => x.text());
}

async function getFilmInfo(movie: LetterboxdFilm) {
	if (infoCache.has(movie.letterboxdUrl)) {
		return infoCache.get(movie.letterboxdUrl);
	}
	try {
		const res = await fetch(movie.letterboxdUrl).then((x) => x.text());
		const $ = cheerio.load(res);
		const found = $('#featured-film-header h1').text() ? true : false;
		if (!found) throw new Error('film not found in letterboxd' + movie.name);
		const year = $('#featured-film-header .number').text();
		const originalTitle =
			$('#featured-film-header em').text().replace('‘', '').replace('’', '') || movie.name;

		const filmWithInfo = await getFilmStreamInfo({ ...movie, year, originalTitle });
		infoCache.set(movie.letterboxdUrl, filmWithInfo);
		return filmWithInfo;
	} catch (error) {
		console.error(
			'error in getFilmInfo for ' + movie.letterboxdUrl + '. trying again...',
			error?.message
		);
		await sleep(1000);
		return await getFilmInfo(movie);
	}
}

async function getFilmStreamInfo(movie: LetterboxdFilm) {
	try {
		const res = await fetch(
			`https://www.justwatch.com/de/Suche?q=${encodeURIComponent(
				movie.originalTitle
			)}&content_type=movie`,
			{
				headers: {
					accept: '*/*',
					'cache-control': 'no-cache',
					'content-type': 'application/json',
					pragma: 'no-cache'
				},
				referrer: 'https://www.justwatch.com/',
				referrerPolicy: 'strict-origin-when-cross-origin',
				mode: 'no-cors',
				credentials: 'omit'
			}
		).then((x) => x.text());
		const $ = cheerio.load(res);

		if (res.length < 200) throw new Error(res);
		const firstMovie = $('.search-content .title-list-row__row ')
			.filter((_, el) => $(el).find('.header-year').text().includes(movie.year))
			.first();
		const imageUrl = firstMovie.find('.picture-comp__img').attr('src');
		const streamProviders = firstMovie
			.find('.price-comparison__grid__row--stream .provider-icon img')
			.map((_, el) => {
				return $(el).attr('alt');
			})
			.get();

		return { ...movie, streamProviders, imageUrl };
	} catch (error) {
		console.error(
			'error in getFilmStreamInfo for ' + movie.name + '. trying again...',
			error?.message
		);
		await sleep(7000);
		return await getFilmStreamInfo(movie);
	}
}

function consoleLogSameLine(msg: string) {
	return Deno.writeAllSync(Deno.stdout, new TextEncoder().encode(msg));
}

function timeTillNow(date: Date) {
	const remaining = new Date().getTime() - date.getTime();
	const remainingS = remaining / 1000;
	const remainingM = remainingS / 60;
	const remainingH = remainingM / 60;
	if (remainingS < 1) return `${remaining.toFixed(2)}ms`;
	if (remainingM < 1) return `${remainingS.toFixed(2)}s`;
	if (remainingH < 1) return `${remainingM.toFixed(2)}min`;
	return `${remainingM.toFixed(2)}h`;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
