import { politeFetch } from "./fetcher.js";

const ROBOTS_URL = "https://books.toscrape.com/robots.txt";

/**
 * Request robots.txt once (cached after that, like any other page) and
 * report what it says. A missing file is not permission — it's just a
 * missing file — so we say so explicitly rather than assuming "allowed".
 */
export async function checkRobots() {
  const { html, status } = await politeFetch(ROBOTS_URL, "robots");

  if (html === null) {
    console.log(
      `Stage 0: robots.txt returned status ${status} -> "no robots file found"`
    );
    return { status, body: null, note: "no robots file found" };
  }

  console.log("Stage 0: robots.txt contents:");
  console.log(html.trim().length ? html : "(empty file)");
  return { status, body: html, note: null };
}