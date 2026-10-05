import { useEffect } from "react";

const SITE_NAME = "363 Cooperative Society";

function setMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets document.title + meta description + robots for the current route.
 *
 * This is a pragmatic baseline for a client-rendered SPA, not a substitute
 * for real SSR/prerendering: it updates what the browser tab and in-app
 * sharing show, but most crawlers that don't execute JS will still only see
 * the static tags in index.html. If the public marketing pages ever need to
 * rank in search, render those specific routes separately (e.g. a
 * prerendered build, or a few static HTML pages) rather than relying on
 * this hook alone.
 *
 * `indexable` defaults to false (noindex) because almost every route here
 * is a signed-in member's financial dashboard and has no reason to be
 * crawled or linked from search results. Pass `indexable: true` only for
 * genuinely public routes (home/login/register).
 */
export function usePageMeta({ title, description, indexable = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("name", "robots", indexable ? "index, follow" : "noindex, nofollow");
  }, [title, description, indexable]);
}
