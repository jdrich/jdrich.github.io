#!/usr/bin/env node
/**
 * build-blog.mjs — tiny zero-dependency site generator for jdrich.github.io.
 *
 * Reads Markdown posts from blog/posts/*.md (frontmatter: title, date,
 * description) and emits:
 *   blog/<slug>.html          each post page (warm brownscale CSS via ../style.css)
 *   blog/index.html           the post index (header/footer/fonts shared)
 * Then deletes any other blog/*.html (orphans whose markdown was removed).
 *
 * Also reads index.md and emits the homepage (hero, newest 3 posts, repos).
 *
 * Blockquotes (`>`) render as amber-bordered insets. Consecutive `>` lines
 * (blank lines allowed between them) are one inset; each `>` line is a
 * paragraph. A non-quote paragraph between them splits into two insets.
 *
 * Usage: node scripts/build-blog.mjs
 *
 * Homepage (index.md): frontmatter title / pageTitle / description / bio / avatar.
 * About copy is markdown until the first ## heading (Repositories). Repo cards:
 *   - [name](url) (Language) one-line description
 *
 * Markdown subset supported (intentionally small — posts are short):
 *   headings (#..###), paragraphs, fenced code blocks (```), inline code,
 *   links, bold/italic, unordered lists, blockquotes (amber inset), horizontal rules.
 */
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const POSTS_DIR = join(ROOT, "blog", "posts");
const BLOG_DIR = join(ROOT, "blog");
const HOME_MD = join(ROOT, "index.md");
const HOME_RECENT = 3;

/* ---------------- markdown -> html (small subset) ---------------- */

function inline(text) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="prose-image" style="max-width:100%;height:auto;cursor:zoom-in;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.1);">')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function blockquote(lines) {
  // Each non-empty `>` line is its own paragraph. Blank `>` lines (or
  // unquoted blanks between quote lines) are separators, not text.
  const paras = [];
  for (const l of lines) {
    const text = l.replace(/^>\s?/, "").trim();
    if (!text) continue;
    paras.push(`<p>${inline(text)}</p>`);
  }
  return `<blockquote>${paras.join("")}</blockquote>`;
}

function renderMarkdown(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;

  const H_FENCE = /^```/;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (H_FENCE.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !H_FENCE.test(lines[i])) buf.push(lines[i++]);
      i++; // closing fence
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // blockquote — continues through blank lines as long as the next
    // non-blank line is still `>`. Put a normal paragraph between quotes
    // to split them into separate insets.
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length) {
        if (/^>\s?/.test(lines[i])) {
          buf.push(lines[i++]);
          continue;
        }
        if (!lines[i].trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^>\s?/.test(lines[j])) {
            buf.push(">");
            i = j;
            continue;
          }
        }
        break;
      }
      out.push(blockquote(buf));
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // paragraph (collect until blank line / block start)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(buf.join(" ").replace(/\s+/g, " ").trim())}</p>`);
  }

  return out.join("\n");
}

/* ---------------- frontmatter ---------------- */

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter");
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

function parsePost(src) {
  const { meta, body } = parseFrontmatter(src);
  if (!meta.title || !meta.date) throw new Error("frontmatter needs title + date");
  return { meta, body };
}

function parseHome(src) {
  const { meta, body } = parseFrontmatter(src);
  if (!meta.title) throw new Error("index.md needs title");
  const parts = body.split(/^##\s+(.*)$/m);
  const about = (parts[0] || "").trim();
  let reposTitle = "Repositories";
  let reposSub = "";
  const repos = [];
  if (parts.length >= 3) {
    reposTitle = parts[1].trim();
    for (const line of parts[2].split(/\r?\n/)) {
      const item = line.match(/^- \[([^\]]+)\]\(([^)]+)\)\s+\(([^)]+)\)\s+(.*)$/);
      if (item) {
        repos.push({ name: item[1], url: item[2], lang: item[3], desc: item[4] });
        continue;
      }
      if (line.trim() && !repos.length && !reposSub) reposSub = line.trim();
    }
  }
  return { meta, about, reposTitle, reposSub, repos };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- page shell ---------------- */

const HEAD = (title, desc, { styleHref, indexHref, banner = true } = {}) => {
  const bannerHtml = banner
    ? `  <header class="site-banner">
    <div class="container">
      <a href="${indexHref}">Jonathan&nbsp;Rich</a>
    </div>
  </header>

`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${styleHref}">
</head>
<body>
${bannerHtml}  <main class="container">
`;
};

const FOOT = `  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="footer-links">
        <a href="https://github.com/jdrich" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <a href="https://www.linkedin.com/in/jonathan-rich-a9324a171" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
        <a href="mailto:jdrich+github@gmail.com" aria-label="Email">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><path d="M0 3v18h24V3H0zm21.518 2L12 12.713 2.482 5h19.036zM2 19V7.183l10 8.104 10-8.104V19H2z"/></svg>
        </a>
      </p>
      <p class="footer-note">
        &copy; <span id="year"></span> Jonathan Rich &middot; Buffalo, NY
      </p>
    </div>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>

  <!-- super basic image modal for .prose-image -->
  <div id="img-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out;">
    <img id="modal-img" style="max-width:95vw;max-height:95vh;box-shadow:0 10px 40px rgba(0,0,0,.6);border-radius:6px;">
  </div>
  <script>
    (function(){
      const modal = document.getElementById('img-modal');
      const mimg = document.getElementById('modal-img');
      document.querySelectorAll('.prose .prose-image').forEach(function(img){
        img.addEventListener('click', function(){
          mimg.src = img.src;
          modal.style.display = 'flex';
        });
      });
      modal.addEventListener('click', function(){ modal.style.display = 'none'; });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.style.display === 'flex') modal.style.display = 'none'; });
    })();
  </script>
</body>
</html>`;

/* ---------------- build ---------------- */

mkdirSync(POSTS_DIR, { recursive: true });

const posts = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const src = readFileSync(join(POSTS_DIR, f), "utf8");
    const { meta, body } = parsePost(src);
    const slug = basename(f, ".md");
    return { slug, meta, body };
  })
  .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));

const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// per-post pages
for (const { slug, meta, body } of posts) {
  const rendered = renderMarkdown(body);
  const content = `    <article class="post">
      <p class="post-meta"><a href="index.html">&#8592; Blog</a> &middot; ${fmtDate(meta.date)}</p>
      <h1 class="post-title">${meta.title}</h1>
      <div class="prose">\n${rendered
  .split("\n")
  .map((l) => `        ${l}`)
  .join("\n")}\n      </div>\n    </article>`;

  writeFileSync(
    join(BLOG_DIR, `${slug}.html`),
    HEAD(`${esc(meta.title)} — Jonathan Rich`, esc(meta.description ?? meta.title), {
      styleHref: "../style.css",
      indexHref: "../index.html",
    }) +
      content +
      FOOT,
  );
  console.log(`wrote blog/${slug}.html`);
}

// index
const list = posts
  .map(
    (p) => `        <a class="post-entry" href="${p.slug}.html">
          <span class="post-entry-date">${fmtDate(p.meta.date)}</span>
          <h3 class="post-entry-title">${p.meta.title}</h3>
          ${p.meta.description ? `<p class="post-entry-desc">${p.meta.description}</p>` : ""}
        </a>`,
  )
  .join("\n");

const indexContent = `    <section class="page-head">
      <h1>Blog</h1>
      <p>Notes from the trade: software, clients, and getting things shipped.</p>
    </section>

    <section class="blog-index">
${list
  .split("\n")
  .map((l) => `      ${l}`)
  .join("\n")}
    </section>`;

writeFileSync(
  join(BLOG_DIR, "index.html"),
  HEAD("Blog — Jonathan Rich", "Writing from Jonathan Rich on software, clients, and the trade of shipping things.", {
    styleHref: "../style.css",
    indexHref: "../index.html",
  }) +
    indexContent +
    FOOT,
);
console.log("wrote blog/index.html");

// markdown is source of truth — drop generated pages whose .md is gone
const keep = new Set(["index.html", ...posts.map((p) => `${p.slug}.html`)]);
for (const f of readdirSync(BLOG_DIR)) {
  if (!f.endsWith(".html") || keep.has(f)) continue;
  unlinkSync(join(BLOG_DIR, f));
  console.log(`removed orphan blog/${f}`);
}

// homepage from index.md
{
  const home = parseHome(readFileSync(HOME_MD, "utf8"));
  const { meta, about, reposTitle, reposSub, repos } = home;
  const aboutHtml = about
    ? `<div class="hero-about">\n${renderMarkdown(about)}\n        </div>`
    : "";
  const recent = posts.slice(0, HOME_RECENT)
    .map(
      (p) => `      <a class="post-entry" href="blog/${p.slug}.html">
        <span class="post-entry-date">${fmtDate(p.meta.date)}</span>
        <h3 class="post-entry-title">${esc(p.meta.title)}</h3>
        ${p.meta.description ? `<p class="post-entry-desc">${esc(p.meta.description)}</p>` : ""}
      </a>`,
    )
    .join("\n");
  const repoCards = repos
    .map(
      (r) => `        <li class="project-card">
          <h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></h3>
          <p>${esc(r.desc)}</p>
          <span class="lang">${esc(r.lang)}</span>
        </li>`,
    )
    .join("\n");

  const homeContent = `    <section class="hero">
      <div class="hero-text">
        <h1>${esc(meta.title)}</h1>
        ${meta.bio ? `<p class="hero-bio">${esc(meta.bio)}</p>` : ""}
        ${aboutHtml}
      </div>
      <div class="hero-avatar">
        <img src="${esc(meta.avatar || "https://avatars.githubusercontent.com/u/1329233?v=4&s=400")}" alt="${esc(meta.title)}" width="256" height="256">
      </div>
    </section>

    <section class="recent">
${recent}
      <p class="projects-more">All posts on the <a href="blog/index.html">blog</a>.</p>
    </section>

    <section class="projects">
      <div class="section-head">
        <h2>${esc(reposTitle)}</h2>
        ${reposSub ? `<p class="sub">${esc(reposSub)}</p>` : ""}
      </div>
      <ul class="project-list">
${repoCards}
      </ul>
    </section>`;

  writeFileSync(
    join(ROOT, "index.html"),
    HEAD(esc(meta.pageTitle || meta.title), esc(meta.description || meta.title), {
      styleHref: "style.css",
      indexHref: "index.html",
      banner: false,
    }) +
      homeContent +
      FOOT,
  );
  console.log("wrote index.html");
}