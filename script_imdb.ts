import csvToJson from 'https://esm.sh/csvjson';
import { Film, ImdbEntry } from './src/app.d.ts';

await processImdbList('Watchlist', 'https://www.imdb.com/list/ls054301730/export');

async function processImdbList(listName: string, url: string) {
	const csv = (await (await fetch(url)).text()) as string;
	const jsonn = csvToJson.toObject(csv, { delimiter: ',', quote: '"' }) as ImdbEntry[];

	const entries = jsonn.map((x) => ({
		name: x.Title,
		originalTitle: x.Title,
		year: x.Year === '' ? undefined : parseInt(x.Year as string) + '',
		rating: x['IMDb Rating'] === '' ? undefined : parseFloat(x['IMDb Rating'] as string),
		listPosition: x.Position,
		numberOfEpisodes: undefined,
		letterboxdUrl: undefined,
		type: x['Title Type']
	}));

	console.log(entries);
	return entries;

	const html = (await (await fetch(url)).text()) as string;
	const json = html.substring(
		html.indexOf('IMDbReactInitialState.push(') + 'IMDbReactInitialState.push('.length,
		html.indexOf(`});
    </script>`) + 1
	);
	const data = JSON.parse(json);

	// data.map(
	// 	(x) =>
	// 		({
	// 			name: x.Title,
	// 			originalTitle: x.Title,
	// 			year: parseInt(x.Year as string) + ''
	// 		} satisfies Film)
	// );

	const items: Film[] = Object.values(data.titles).map((x: any) => ({
		name: x.primary?.title as string,
		originalTitle: x.original?.title as string,
		year: x.primary?.year as string,
		imageUrl: x.poster?.url as string,
		rating: x.ratings?.rating as number,
		numberOfEpisodes: x.metadata?.numberOfEpisodes as number,
		listPosition: undefined as unknown as number,
		letterboxdUrl: x.URL as string
	}));

	console.log(items);
	console.log(items.length);

	interface ImdbEntry {
		Position: number;
		Const: string;
		Created: Date;
		Modified: Date;
		Description: string;
		Title: string;
		URL: string;
		'Title Type': ImdbTitleType;
		'IMDb Rating': number | string;
		'Runtime (mins)': number | string;
		Year: number | string;
		Genres: string;
		'Num Votes': number | string;
		'Release Date': string;
		Directors: string;
		'Your Rating': number | string;
		'Date Rated': string;
	}

	enum ImdbTitleType {
		Movie = 'movie',
		Short = 'short',
		TvEpisode = 'tvEpisode',
		TvMiniSeries = 'tvMiniSeries',
		TvMovie = 'tvMovie',
		TvSeries = 'tvSeries',
		Video = 'video',
		VideoGame = 'videoGame'
	}
}
