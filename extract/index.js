const url = "https://cse.iitkgp.ac.in/pds/notes/";
const cheerio = require("cheerio");
const fs = require("fs");

const htmlTemplate = (body, title) => `
<!DOCTYPE html>
<html>
  <head>
    <title>${title} | PDS Notes</title>
    <link rel="stylesheet" href="style.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/cpp.min.js"></script>


<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Roboto+Mono:ital@0;1&display=swap" rel="stylesheet">
  </head>
  <body>
    <main id="container">
      ${body}
    </main>
    <script>
      hljs.highlightAll();
    </script>
  </body>
</html>`;

async function main() {
  const html = await fetch(url).then((res) => res.text());

  const $ = cheerio.load(html);
  const links = [];
  $("blockquote")
    .first()
    .find("li > a")
    .each((i, el) => {
      links.push({
        link: $(el).attr("href"),
        title: $(el).text(),
      });
    });

  console.log(links);

  const pages = await Promise.all(
    links.map((x) => x.link).map((s) => getPage(s, links))
  );

  for (let i = 0; i < pages.length; i++) {
    const { title, content, link } = pages[i];

    fs.writeFileSync(`./output/${link}`, htmlTemplate(content, title));
  }

  const indexHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>PDS Notes</title>
      <link rel="stylesheet" href="style.css" />

      
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Roboto+Mono:ital@0;1&display=swap" rel="stylesheet">

    </head>
    <body>
      <main id="container">
      <h1>PDS Notes</h1>
      <ul class="links">
        ${pages
          .map(({ title, link }) => `<li><a href="${link}">${title}</a></li>`)
          .join("")}
      </ul>

      Courtesy of IIT Kharagpur
      </main>
    </body>
  </html>
  `;

  fs.writeFileSync("./output/index.html", indexHtml);
}

async function getPage(link, links) {
  const html = await fetch(url + link).then((res) => res.text());

  const $ = cheerio.load(html);

  // in the first blockquote on the page
  // there is one h1 which is the title of the page
  // the content of the page is starting from the h1 (after that) and upto the last hr on the page
  // we need the title, and "content" in html format

  const title = $("blockquote").first().find("h1").text();
  const b = $("blockquote");

  // b.find("h1").remove();
  b.find("hr").nextAll().remove();
  b.find("hr").remove();

  b.find("p").each((i, el) => {
    const p = $(el);
    if (p.text().trim() === "") {
      p.remove();
    }
  });

  b.find("blockquote").each((i, el) => {
    // replace with contents
    const blockquote = $(el);
    blockquote.replaceWith(blockquote.html());
  });

  b.find("pre").each((i, el) => {
    const pre = $(el);
    if (pre.children().length === 0) {
      pre.replaceWith(`<pre><code>${pre.html()}</code></pre>`);
    }
  });

  b.find("a").each((i, el) => {
    const a = $(el);
    a.attr("href", url + a.attr("href"));
    a.attr("target", "_blank");
  });

  b.find("img").each((i, el) => {
    const img = $(el);
    img.attr("src", url + img.attr("src"));
  });

  // b.remove("p")

  const previous = links.findIndex((x) => x.link === link) - 1;
  const next = links.findIndex((x) => x.link === link) + 1;

  const navigator = `
  <div class="navigator">
    <a href="${previous > 0 ? links[previous].link : "#"}">
      <div class="prev">
        <div class="name">Previous</div>
        <div class="title">${previous > -1 ? links[previous].title : ""}</div>
      </div>
    </a>
    <a href="./index.html">
      <div class="home">
        <div class="name">Home</div>
      </div>
    </a>
    <a href="${next < links.length ? links[next].link : "#"}">
      <div class="next">
        <div class="name">Next</div>
        <div class="title">${next < links.length ? links[next].title : ""}</div>
      </div>
    </a>
  </div>
  `;
  const content = b.html() + navigator;

  return { title, content, link };
}

main();
