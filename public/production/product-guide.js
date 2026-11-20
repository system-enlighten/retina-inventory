(() => {
  const pageCount = 66;
  const base = new URL(".", document.currentScript.src);
  const pageSrc = page => new URL(`product_guide_assets/pages/page_${String(page).padStart(2, "0")}.png`, base).href;
  const printUrl = page => new URL(`ProductGuidePrint.html?print=${page}`, base).href;
  let indexRequest;

  function loadIndex() {
    indexRequest ||= fetch(new URL("product-guide-index.json", base)).then(response => {
      if (!response.ok) throw Error("Cannot load the catalogue text.");
      return response.json();
    }).catch(error => {
      indexRequest = null;
      throw error;
    });
    return indexRequest;
  }

  class RetinaProductGuide extends HTMLElement {
    connectedCallback() {
      if (this.childElementCount) return;
      this.innerHTML = `<div class="guide-workspace">
        <header><h1>Retina Product Guide</h1><a href="${printUrl("book")}" target="_blank" rel="noopener">Print / Save catalogue PDF</a></header>
        <form class="guide-search" role="search">
          <input name="query" type="search" aria-label="Search the catalogue" placeholder="Search the catalogue">
          <button type="submit">Search</button>
        </form>
        <div class="guide-search-output" hidden>
          <p class="guide-search-status" role="status"></p><ol class="guide-results"></ol>
        </div>
        <details class="guide-contents"><summary>Table of contents</summary><ol></ol></details>
        <div class="guide-toolbar">
          <button type="button" data-step="-1">Previous</button>
          <label>Page <select aria-label="Page number"></select> / ${pageCount}</label>
          <button type="button" data-step="1">Next</button>
          <button type="button" class="guide-fit" aria-pressed="false">Fit width</button>
          <a class="guide-print-page" target="_blank" rel="noopener">Print page</a>
        </div>
        <figure class="guide-stage">
          <img class="guide-original" src="${pageSrc(1)}" width="612" height="1008" alt="Retina Product Guide cover" fetchpriority="high" decoding="async">
        </figure>
        <details class="guide-transcript"><summary>Read page text</summary><p></p></details>
      </div><div class="guide-print-pages" aria-hidden="true"></div>`;

      const get = selector => this.querySelector(selector);
      const controls = get(".guide-toolbar");
      const selector = get("select");
      const original = get(".guide-original");
      const transcript = get(".guide-transcript p");
      const results = get(".guide-results");
      const contents = get(".guide-contents ol");
      const output = get(".guide-search-output");
      const status = get(".guide-search-status");
      const printMode = document.body.classList.contains("guide-standalone")
        ? new URLSearchParams(window.location.search).get("print") : null;
      let index = null;
      let page = 1;

      function showPage(next) {
        page = Math.max(1, Math.min(pageCount, Number(next) || 1));
        selector.value = String(page);
        get('[data-step="-1"]').disabled = page === 1;
        get('[data-step="1"]').disabled = page === pageCount;
        const data = index?.pages[page - 1];
        original.alt = page === 1 ? "Retina Product Guide cover" : `Page ${page}${data?.title ? " · " + data.title : ""}`;
        if (original.src !== pageSrc(page)) original.src = pageSrc(page);
        transcript.textContent = data ? data.text || "This page has no extracted text." : "Loading page text…";
        get(".guide-print-page").href = printUrl(page);
      }

      function pageLink(list, number, label, preview) {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", () => {
          showPage(number);
          controls.scrollIntoView({block:"start", behavior:"smooth"});
          selector.focus({preventScroll:true});
        });
        li.append(button);
        if (preview) {
          const p = document.createElement("p");
          p.textContent = preview;
          li.append(p);
        }
        list.append(li);
      }

      for (let number = 1; number <= pageCount; number++) selector.add(new Option(number, number));
      selector.addEventListener("change", () => showPage(selector.value));
      for (const button of controls.querySelectorAll("[data-step]")) {
        button.addEventListener("click", () => showPage(page + Number(button.dataset.step)));
      }
      get(".guide-fit").addEventListener("click", event => {
        const wide = get(".guide-stage").classList.toggle("guide-wide");
        event.currentTarget.setAttribute("aria-pressed", String(wide));
        event.currentTarget.textContent = wide ? "Original width" : "Fit width";
      });
      original.addEventListener("load", () => {
        // Request only the adjacent page after the current page has arrived.
        if (page < pageCount && !printMode) {
          const next = new Image();
          next.fetchPriority = "low";
          next.src = pageSrc(page + 1);
        }
      });
      showPage(printMode === "book" ? 1 : printMode);

      const ready = loadIndex().then(data => {
        index = data;
        for (const entry of index.contents) pageLink(contents, entry.page, `${entry.title} · ${entry.page}`);
        showPage(page);
        return data;
      });
      ready.catch(() => { transcript.textContent = "Page text is temporarily unavailable."; });

      const form = get(".guide-search");
      form.addEventListener("submit", async event => {
        event.preventDefault();
        const query = form.elements.query.value.trim();
        if (!query) { output.hidden = true; return; }
        output.hidden = false;
        results.replaceChildren();
        status.textContent = "Searching…";
        try {
          const data = await ready;
          if (form.elements.query.value.trim() !== query) return;
          const words = query.toLowerCase().split(/\s+/);
          const matches = data.pages.filter(item => {
            const text = `${item.title} ${item.text}`.toLowerCase();
            return words.every(word => text.includes(word));
          });
          status.textContent = matches.length ? `${matches.length} matching pages` : "No matching pages.";
          for (const item of matches) {
            const excerpt = item.text.replace(/\s+/g, " ");
            const hit = excerpt.toLowerCase().indexOf(words[0]);
            const start = Math.max(0,hit-35);
            pageLink(results, item.page, `Page ${item.page}${item.title ? " · " + item.title : ""}`,
              excerpt ? (start ? "…" : "") + excerpt.slice(start,start+150) + (start+150 < excerpt.length ? "…" : "") : "");
          }
        } catch (error) { status.textContent = error.message; }
      });

      if (printMode) {
        const pages = printMode === "book" ? Array.from({length:pageCount}, (_,i) => i + 1) : [page];
        this.preparePrint(pages, true);
      } else if (document.body.classList.contains("guide-standalone")) {
        window.addEventListener("beforeprint", () => this.preparePrint([page], false));
      }
    }

    async preparePrint(pages, autoPrint) {
      const area = this.querySelector(".guide-print-pages");
      const images = pages.map(page => {
        const image = new Image(612,1008);
        image.alt = `Catalogue page ${page}`;
        image.src = pageSrc(page);
        return image;
      });
      area.replaceChildren(...images);
      if (!autoPrint) return;
      const status = this.querySelector(".guide-search-status");
      status.parentElement.hidden = false;
      status.textContent = "Preparing print preview…";
      try {
        await Promise.all(images.map(image => image.decode()));
        status.textContent = "";
        window.print();
      } catch {
        status.textContent = "Some pages could not load. Reload this page before printing.";
      }
    }
  }

  customElements.define("retina-product-guide", RetinaProductGuide);
})();
