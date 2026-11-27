(() => {
  const pageCount = 66;
  const base = new URL(".", document.currentScript.src);
  const pageSrc = page => new URL(
    `product_guide_assets/original-pages/page_${String(page).padStart(2,"0")}.webp`, base
  ).href;
  const printUrl = page => new URL(`ProductGuidePrint.html?print=${page}`,base).href;
  let indexRequest;

  function loadIndex() {
    indexRequest ||= fetch(new URL("product-guide-index.json",base)).then(response => {
      if (!response.ok) throw Error("Cannot load the catalogue text.");
      return response.json();
    }).catch(error => {
      indexRequest = null;
      throw error;
    });
    return indexRequest;
  }

  const widthUnit = points => points / 6.12 + "cqw";

  function documentPage(data, eager, goToPage) {
    const article = document.createElement("article");
    article.id = "guide-page-" + data.page;
    article.className = "guide-sheet";
    article.setAttribute("aria-label", `Page ${data.page}${data.title ? " · " + data.title : ""}`);
    const image = new Image(1836, 3024);
    image.className = "guide-artwork";
    image.alt = "";
    image.loading = eager ? "eager" : "lazy";
    image.decoding = "async";
    image.src = pageSrc(data.page);
    article.append(image);

    for (const [x, y, size, , , rotated, , label, advances] of data.runs || []) {
      const line = document.createElement("div");
      line.className = "guide-line";
      line.style.left = widthUnit(x);
      line.style.top = widthUnit(y);
      line.style.fontSize = widthUnit(size);
      if (rotated) line.classList.add("guide-rotated");

      const text = document.createElement("span");
      text.className = "guide-run";
      const chars = [...label];
      let offset = 0;
      chars.forEach((character, index) => {
        const glyph = document.createElement("span");
        glyph.style.left = widthUnit(offset);
        glyph.textContent = character;
        offset += advances[index];
        text.append(glyph);
      });
      text.style.width = widthUnit(Math.max(size / 2, offset));
      line.append(text);
      article.append(line);
    }

    for (const [[x1, y1, x2, y2], target] of data.links || []) {
      const link = document.createElement("a");
      link.className = "guide-page-link";
      link.href = "#guide-page-" + target;
      link.setAttribute("aria-label", "Go to catalogue page " + target);
      Object.assign(link.style, {left: widthUnit(x1), top: widthUnit(y1),
        width: widthUnit(x2 - x1), height: widthUnit(y2 - y1)});
      link.addEventListener("click", event => {
        event.preventDefault();
        goToPage(target);
      });
      article.append(link);
    }
    return article;
  }

  class RetinaProductGuide extends HTMLElement {
    connectedCallback() {
      if (this.childElementCount) return;
      this.innerHTML=`<div class="guide-workspace">
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
          <label>Go to page <select aria-label="Page number"></select> / ${pageCount}</label>
          <button type="button" class="guide-fit" aria-pressed="false">Fit width</button>
          <a class="guide-print-page" target="_blank" rel="noopener">Print page 1</a>
        </div>
        <div class="guide-reader"></div>
      </div>`;

      const get=selector=>this.querySelector(selector);
      const reader=get(".guide-reader"),select=get("select");
      const results=get(".guide-results"),contents=get(".guide-contents ol");
      const output=get(".guide-search-output"),status=get(".guide-search-status");
      const printMode=document.body.classList.contains("guide-standalone")
        ? new URLSearchParams(window.location.search).get("print") : null;
      let selected=1;
      let pages=[];
      let visible;

      function showCurrent(page){
        selected=page;
        select.value=String(page);
        const link=get(".guide-print-page");
        link.href=printUrl(page);
        link.textContent="Print page "+page;
      }
      function goToPage(number) {
        const page=pages.find(item=>item.id==="guide-page-"+number);
        if(!page)return;
        showCurrent(number);
        page.scrollIntoView({block:"start"});
      }
      function pageLink(list,number,label,preview){
        const li=document.createElement("li"),button=document.createElement("button");
        button.type="button";
        button.textContent=label;
        button.addEventListener("click",()=>goToPage(number));
        li.append(button);
        if(preview){
          const p=document.createElement("p");
          p.textContent=preview;
          li.append(p);
        }
        list.append(li);
      }

      for(let number=1;number<=pageCount;number++)select.add(new Option(number,number));
      select.addEventListener("change",()=>goToPage(select.value));
      get(".guide-fit").addEventListener("click",event=>{
        const wide=reader.classList.toggle("guide-wide");
        event.currentTarget.setAttribute("aria-pressed",String(wide));
        event.currentTarget.textContent=wide?"Original width":"Fit width";
      });
      showCurrent(1);

      // Render the cover immediately while the selectable text and remaining pages load.
      reader.append(documentPage({page:1,title:"Cover"},true));
      const ready=loadIndex().then(data=>{
        const printPage=Math.min(pageCount,Math.max(1,Number(printMode)||1));
        const records=printMode&&printMode!=="book"?[data.pages[printPage-1]]:data.pages;
        pages=records.map((page,i)=>documentPage(page,Boolean(printMode)||i<2,goToPage));
        reader.replaceChildren(...pages);
        for(const entry of data.contents)pageLink(contents,entry.page,`${entry.title} · ${entry.page}`);
        showCurrent(printMode&&printMode!=="book"?printPage:1);
        if(!printMode){
          visible=new IntersectionObserver(entries=>{
            const first=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
            if(first)showCurrent(Number(first.target.id.replace("guide-page-","")));
          },{rootMargin:"-18% 0px -65% 0px"});
          pages.forEach(page=>visible.observe(page));
        }
        return data;
      });
      ready.catch(error=>{output.hidden=false;status.textContent=error.message;});
      this.cleanup=()=>{visible?.disconnect();};

      const form=get(".guide-search");
      form.addEventListener("submit",async event=>{
        event.preventDefault();
        const query=form.elements.query.value.trim();
        if(!query){output.hidden=true;return;}
        output.hidden=false;
        results.replaceChildren();
        status.textContent="Searching…";
        try{
          const data=await ready;
          if(form.elements.query.value.trim()!==query)return;
          const words=query.toLowerCase().split(/\s+/);
          const matches=data.pages.filter(item=>{
            const text=`${item.title} ${item.text} ${item.aliases} ${item.runs.map(run=>run[7]).join(" ")}`.toLowerCase();
            return words.every(word=>text.includes(word));
          });
          status.textContent=matches.length?`${matches.length} matching pages`:"No matching pages.";
          for(const item of matches){
            const main=item.text.replace(/\s+/g," ");
            const alternate=item.aliases.replace(/\s+/g," ");
            const excerpt=main.toLowerCase().includes(words[0])?main:alternate || main;
            const at=excerpt.toLowerCase().indexOf(words[0]),start=Math.max(0,at-35);
            pageLink(results,item.page,`Page ${item.page}${item.title?" · "+item.title:""}`,
              excerpt?(start?"…":"")+excerpt.slice(start,start+150)+(start+150<excerpt.length?"…":""):"");
          }
        }catch(error){status.textContent=error.message;}
      });

      if(printMode) {
        output.hidden=false;
        status.textContent="Preparing print preview…";
        ready.then(async()=>{
          await Promise.all(pages.map(page=>page.querySelector("img").decode()));
          await document.fonts?.ready;
          status.textContent="";
          window.print();
        }).catch(()=>{status.textContent="Some pages could not load. Reload before printing.";});
      }
    }

    disconnectedCallback(){this.cleanup?.();}
  }

  customElements.define("retina-product-guide",RetinaProductGuide);
})();
