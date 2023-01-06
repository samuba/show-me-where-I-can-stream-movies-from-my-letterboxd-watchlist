import * as cheerio from "npm:cheerio@1.0.0-rc.12";
import { open } from "https://deno.land/x/opener@v1.0.1/mod.ts";

console.time("finished after");
const startTime = new Date();
const fileName = "watchlist.json";
const numberOfConcurrentFetches = 1;

const firstPage = 1;
let currentPage = firstPage;
let lastPage = 9999; // will be overriden

type LetterboxdFilm = { name: string; letterboxdUrl: string; year: string; originalTitle: string };
type Film = LetterboxdFilm & { streamer: string[] };

if (firstPage !== lastPage) {
  Deno.writeTextFileSync(fileName, "");
}

while (currentPage <= lastPage) {
  const films = [] as Film[];
  console.log(`fetching page ${currentPage}`);
  try {
    const fetches = [];
    for (let i = 0; i < numberOfConcurrentFetches; i++) {
      fetches.push(fetchContent(currentPage + i, lastPage));
    }
    const contents = await Promise.all(fetches);
    const cheerioContents = contents.map((x) => cheerio.load(x));

    for (const $ of cheerioContents) {
      if ($(".linked-film-poster img").length === 0) currentPage = lastPage;

      const letterboxdFilms: LetterboxdFilm[] = [];

      $(".linked-film-poster").each((_, el) => {
        const name = $(el).find("img").attr("alt")!;
        const letterboxdUrl = "https://letterboxd.com" + $(el).attr("data-film-slug")!;
        letterboxdFilms.push({ name, letterboxdUrl });
      });

      const filmsWithInfo = await Promise.all(letterboxdFilms.map((x) => getFilmInfo(x)));
      (await Promise.all(filmsWithInfo.map((x) => getFilmStreamInfo(x)))).forEach((x) => films.push(x));

      // console.log(JSON.stringify(films, null, 2));
      // Deno.exit(1);
    }
    const previousContent = Deno.readTextFileSync(fileName);
    const previosJson = JSON.parse(previousContent ? previousContent : "[]");
    Deno.writeTextFileSync(fileName, JSON.stringify([...previosJson, ...films], null, 2));
    currentPage += numberOfConcurrentFetches;
  } catch (err) {
    console.log("problem fetching for page " + currentPage + ". Trying again...", err);
    continue;
  }
}
console.log("\nfinished after " + timeTillNow(startTime));

saveAsHtml(JSON.parse(Deno.readTextFileSync(fileName)));

function saveAsHtml(films: Film[]) {
  const htmlFilename = "index.html";
  let streamProviders = [] as string[];
  films.forEach((x) => {
    streamProviders = [...new Set([...streamProviders, ...x.streamer])];
  });

  streamProviders.sort();

  const html = Deno.readTextFileSync(htmlFilename);
  Deno.writeTextFileSync(
    htmlFilename,
    html.replace(
      /<script>(\s*|.*)*<\/script>/,
      `<script> function app() { return ${JSON.stringify(
        { films, streamProviders: streamProviders.map((x) => ({ name: x, enabled: false })) },
        null,
        2
      )} }</script>`
    )
  );

  open(htmlFilename);
}

// const allFilms = JSON.parse(Deno.readTextFileSync(fileName));
// console.log(`fetched ${allFilms.length} films overall`);
// const availableFilms = allFilms.filter((x) => interstingStreamers.some((y) => x.streamer.includes(y)));
// console.log(`fetched ${availableFilms.length} availableFilms films`);
// Deno.writeTextFileSync(fileName, JSON.stringify(availableFilms, null, 2));

async function fetchContent(currentPage: number, lastPage: number) {
  const data = await fetch(`https://letterboxd.com/${Deno.args[0]}/watchlist/page/${currentPage}`);
  return await data.text();
}

async function getFilmInfo(movie: LetterboxdFilm) {
  const res = await fetch(movie.letterboxdUrl).then((x) => x.text());
  const $ = cheerio.load(res);
  const year = $("#featured-film-header .number").text();
  const originalTitle = $("#featured-film-header em").text().replace("‘", "").replace("’", "") || movie.name;
  return { ...movie, year, originalTitle };
}

async function getFilmStreamInfo(movie: LetterboxdFilm) {
  const res = await fetch(`https://www.justwatch.com/de/Suche?q=${encodeURIComponent(movie.originalTitle)}`, {
    headers: {
      accept: "*/*",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
    },
    referrer: "https://www.justwatch.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    mode: "no-cors",
    credentials: "omit",
  }).then((x) => x.text());

  const $ = cheerio.load(res);
  const firstMovie = $(".search-content .title-list-row__row ").first();

  const isMovie = !firstMovie.find(".price-comparison__grid__row__price").toString().toLowerCase().includes("staffel");

  const imageUrl = isMovie ? firstMovie.find(".picture-comp__img").attr("src") : undefined;
  const streamer = isMovie
    ? firstMovie
        .find(".price-comparison__grid__row--stream .provider-icon img")
        .map((_, el) => {
          return $(el).attr("alt");
        })
        .get()
    : [];
  return { ...movie, streamer, imageUrl };
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
