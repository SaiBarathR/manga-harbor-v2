import { http, HttpResponse } from "msw";
import {
  aggregateResponse,
  atHomeResponse,
  chapterEntity,
  listResponse,
  mangaEntity,
  statsResponse,
  tagsResponse,
} from "../fixtures";

const API = "https://api.mangadex.org";

export const handlers = [
  http.get(`${API}/manga`, () => HttpResponse.json(listResponse)),
  http.get(`${API}/statistics/manga`, () => HttpResponse.json(statsResponse)),
  http.get(`${API}/manga/:id/aggregate`, () =>
    HttpResponse.json(aggregateResponse),
  ),
  http.get(`${API}/manga/:id`, () =>
    HttpResponse.json({ result: "ok", data: mangaEntity }),
  ),
  http.get(`${API}/chapter/:id`, () => HttpResponse.json(chapterEntity)),
  http.get(`${API}/at-home/server/:id`, () =>
    HttpResponse.json(atHomeResponse),
  ),
  http.get(`${API}/manga/tag`, () => HttpResponse.json(tagsResponse)),
  http.post("https://api.mangadex.network/report", () =>
    HttpResponse.json({ result: "ok" }),
  ),
];
