// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Error {}
	// interface Locals {}
	// interface PageData {}
	// interface Platform {}
}

export type LetterboxdFilm = {
	name: string;
	letterboxdUrl: string;
	year: string;
	originalTitle: string;
	imageUrl: string;
	rating: number;
};

export type Film = LetterboxdFilm & { streamProviders: string[] };

export type LetterboxdList = {
	name: string;
	url: string;
	description: string;
	entries: Film[];
	streamProviders: StreamProvider[];
};

export type LetterboxdListFile = {
	name: string;
	filePath: string;
};

export type StreamProvider = {
	name: string;
	enabled: boolean;
};
