import * as cheerio from "npm:cheerio@1.0.0-rc.12";

console.time("finished after");
const startTime = new Date();
const fileName = "watchlist.json";
const numberOfConcurrentFetches = 1;

const firstPage = 1;
let currentPage = firstPage;
let lastPage = 9999; // will be overriden

type LetterboxdFilm = { name: string; imageUrl: string };
type Film = LetterboxdFilm & { streamer: string[] };

if (firstPage !== lastPage) {
  Deno.writeTextFileSync(fileName, "");
}

while (currentPage <= lastPage) {
  const films = [] as Film[];
  console.log(`fetching pages ${currentPage} - ${currentPage + (numberOfConcurrentFetches - 1)}`);
  try {
    const fetches = [];
    for (let i = 0; i < numberOfConcurrentFetches; i++) {
      fetches.push(fetchContent(currentPage + i, lastPage));
    }
    const contents = await Promise.all(fetches);
    const cheerioContents = contents.map((x) => cheerio.load(x));

    for (const $ of cheerioContents) {
      if ($(".linked-film-poster img").length === 0) currentPage = lastPage;

      const letterboxdFilms: LetterboxdFilm[] = $(".linked-film-poster img")
        .map((_, el) => ({ name: $(el).attr("alt")!, imageUrl: $(el).attr("src")! }))
        .get();

      (await Promise.all(letterboxdFilms.map((x) => getFilmStreamInfo(x)))).forEach((x) => films.push(x));
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
console.log(`fetched manga pages ${firstPage}-${lastPage}`);

saveAsHtml(JSON.parse(Deno.readTextFileSync(fileName)));

function saveAsHtml(films: Film[]) {
  let streamProviders = [] as string[];
  films.forEach((x) => {
    streamProviders = [...new Set([...streamProviders, ...x.streamer])];
  });

  console.log({ streamProviders });

  streamProviders.sort();

  const html = Deno.readTextFileSync("index.html");
  Deno.writeTextFileSync(
    "index.html",
    html.replace(
      /<script>(\s*|.*)*<\/script>/,
      `<script> function app() { return ${JSON.stringify(
        { films, streamProviders: streamProviders.map((x) => ({ name: x, enabled: false })) },
        null,
        2
      )} }</script>`
    )
  );
}

// const allFilms = JSON.parse(Deno.readTextFileSync(fileName));
// console.log(`fetched ${allFilms.length} films overall`);
// const availableFilms = allFilms.filter((x) => interstingStreamers.some((y) => x.streamer.includes(y)));
// console.log(`fetched ${availableFilms.length} availableFilms films`);
// Deno.writeTextFileSync(fileName, JSON.stringify(availableFilms, null, 2));

async function fetchContent(currentPage: number, lastPage: number) {
  const fetchStart = new Date();
  try {
    const data = await fetch(`https://letterboxd.com/samuba/watchlist/page/${currentPage}`, {
      mode: "no-cors",
    });
    return await data.text();
  } finally {
    consoleLogSameLine(" fetch took " + timeTillNow(fetchStart));
  }
}

async function getFilmStreamInfo(movie: LetterboxdFilm) {
  console.log("fetching info for " + movie.name);
  const res = await fetch(`https://www.justwatch.com/de/Suche?q=${movie.name}`, {
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

  const imageUrl = firstMovie.find(".picture-comp__img").attr("src");
  const streamer = firstMovie
    .find(".price-comparison__grid__row--stream .provider-icon img")
    .map((_, el) => {
      return $(el).attr("alt");
    })
    .get();
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
