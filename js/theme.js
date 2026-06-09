(function () {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      menuButton.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const progress = document.querySelector(".reading-progress span");
  const updateProgress = function () {
    if (!progress) return;
    const doc = document.documentElement;
    const height = doc.scrollHeight - doc.clientHeight;
    const amount = height > 0 ? (doc.scrollTop / height) * 100 : 0;
    progress.style.width = amount + "%";
  };
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  const toc = document.getElementById("toc");
  const content = document.getElementById("article-content");
  if (toc && content) {
    const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
    if (headings.length) {
      const list = document.createElement("ol");
      headings.forEach(function (heading, index) {
        const id = heading.id || "heading-" + index;
        heading.id = id;

        const item = document.createElement("li");
        item.className = "toc-" + heading.tagName.toLowerCase();

        const link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = heading.textContent;
        item.appendChild(link);
        list.appendChild(item);
      });
      toc.appendChild(list);
    } else {
      const panel = toc.closest(".toc-panel");
      if (panel) panel.style.display = "none";
    }
  }

  const topButton = document.querySelector(".toc-top");
  if (topButton) {
    topButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const escapeHtml = function (value) {
    return value.replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
      }[char];
    });
  };

  if (input && results) {
    fetch("/search.json")
      .then(function (response) {
        return response.ok ? response.json() : [];
      })
      .then(function (items) {
        input.addEventListener("input", function () {
          const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
          results.innerHTML = "";
          if (!terms.length) return;

          const matches = items.filter(function (item) {
            const haystack = ((item.title || "") + " " + (item.content || "").replace(/<[^>]+>/g, " ")).toLowerCase();
            return terms.every(function (term) {
              return haystack.includes(term);
            });
          }).slice(0, 6);

          if (!matches.length) {
            results.innerHTML = "<p>No matching notes.</p>";
            return;
          }

          results.innerHTML = matches.map(function (item) {
            const title = escapeHtml(item.title || "Untitled");
            const url = item.url || "#";
            const content = escapeHtml((item.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90));
            return "<a class=\"search-result\" href=\"" + url + "\"><strong>" + title + "</strong><span>" + content + "...</span></a>";
          }).join("");
        });
      })
      .catch(function () {
        results.innerHTML = "";
      });
  }
})();
