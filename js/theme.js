(function () {
  const paletteButton = document.querySelector("[data-palette-toggle]");
  const paletteLabel = document.querySelector("[data-palette-label]");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const palettes = [
    { id: "green", label: "绿色", color: "#090c0b" },
    { id: "cyan", label: "青蓝", color: "#071014" },
    { id: "amber", label: "琥珀", color: "#100d08" }
  ];

  if (paletteButton) {
    const applyPalette = function (palette, persist) {
      document.documentElement.dataset.palette = palette.id;
      if (paletteLabel) paletteLabel.textContent = palette.label;
      if (themeColor) themeColor.setAttribute("content", palette.color);

      const nextIndex = (palettes.indexOf(palette) + 1) % palettes.length;
      paletteButton.setAttribute("aria-label", "当前为" + palette.label + "配色，切换为" + palettes[nextIndex].label + "配色");
      paletteButton.setAttribute("title", "切换为" + palettes[nextIndex].label + "配色");

      if (persist) {
        try {
          localStorage.setItem("startrace-palette", palette.id);
        } catch (error) {}
      }
    };

    const initialPalette = palettes.find(function (palette) {
      return palette.id === document.documentElement.dataset.palette;
    }) || palettes[0];

    applyPalette(initialPalette, false);
    paletteButton.addEventListener("click", function () {
      const currentIndex = palettes.findIndex(function (palette) {
        return palette.id === document.documentElement.dataset.palette;
      });
      applyPalette(palettes[(currentIndex + 1) % palettes.length], true);
    });
  }

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");

  if (menuButton && nav) {
    const closeMenu = function () {
      nav.classList.remove("is-open");
      menuButton.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "打开导航");
    };

    menuButton.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      menuButton.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
      menuButton.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
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
      const links = [];
      headings.forEach(function (heading, index) {
        const id = heading.id || "heading-" + index;
        heading.id = id;

        const item = document.createElement("li");
        item.className = "toc-" + heading.tagName.toLowerCase();

        const link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = heading.textContent;
        links.push(link);
        item.appendChild(link);
        list.appendChild(item);
      });
      toc.appendChild(list);

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (link) {
              link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
            });
          });
        }, { rootMargin: "-18% 0px -68% 0px" });

        headings.forEach(function (heading) {
          observer.observe(heading);
        });
      }
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
    const searchUrl = input.dataset.searchUrl || "/search.json";
    fetch(searchUrl)
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
            results.innerHTML = "<p>没有找到匹配内容。</p>";
            return;
          }

          const searchOrigin = new URL(searchUrl, window.location.href).origin;
          results.innerHTML = matches.map(function (item) {
            const title = escapeHtml(item.title || "Untitled");
            const rawUrl = item.url || "#";
            let url = "#";
            try {
              const parsedUrl = new URL(rawUrl, window.location.href);
              if (parsedUrl.origin === searchOrigin && ["http:", "https:"].includes(parsedUrl.protocol)) {
                url = parsedUrl.href;
              }
            } catch (error) {
              url = "#";
            }
            const content = escapeHtml((item.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90));
            return "<a class=\"search-result\" href=\"" + escapeHtml(url) + "\"><strong>" + title + "</strong><span>" + content + (content ? "..." : "") + "</span></a>";
          }).join("");
        });
      })
      .catch(function () {
        results.innerHTML = "";
      });
  }

  const commandConsole = document.getElementById("command-console");
  const commandForm = document.getElementById("command-form");
  const commandInput = document.getElementById("command-input");
  const commandOutput = document.getElementById("command-output");
  const commandOpeners = document.querySelectorAll("[data-command-open]");
  const commandCloser = document.querySelector("[data-command-close]");

  if (commandConsole && commandForm && commandInput && commandOutput) {
    const commandHistory = [];
    let historyIndex = 0;
    let searchItemsPromise;

    const paths = {
      home: commandConsole.dataset.homeUrl,
      archives: commandConsole.dataset.archivesUrl,
      archive: commandConsole.dataset.archivesUrl,
      categories: commandConsole.dataset.categoriesUrl,
      category: commandConsole.dataset.categoriesUrl,
      tags: commandConsole.dataset.tagsUrl,
      tag: commandConsole.dataset.tagsUrl,
      about: commandConsole.dataset.aboutUrl,
      links: commandConsole.dataset.linksUrl
    };

    const aliases = {
      "首页": "home",
      "归档": "archives",
      "分类": "categories",
      "标签": "tags",
      "关于": "about",
      "链接": "links"
    };

    const appendMessage = function (text, className) {
      const line = document.createElement("div");
      line.className = "command-message" + (className ? " " + className : "");
      line.textContent = text;
      commandOutput.appendChild(line);
      commandOutput.scrollTop = commandOutput.scrollHeight;
      return line;
    };

    const appendLinks = function (items) {
      const list = document.createElement("div");
      list.className = "command-result-list";
      items.forEach(function (item) {
        const link = document.createElement("a");
        try {
          const parsedUrl = new URL(item.url, window.location.href);
          link.href = parsedUrl.origin === window.location.origin && ["http:", "https:"].includes(parsedUrl.protocol) ? parsedUrl.href : "#";
        } catch (error) {
          link.href = "#";
        }
        link.textContent = item.title;
        list.appendChild(link);
      });
      commandOutput.appendChild(list);
      commandOutput.scrollTop = commandOutput.scrollHeight;
    };

    const openConsole = function () {
      if (!commandConsole.open) commandConsole.showModal();
      window.setTimeout(function () {
        commandInput.focus();
      }, 0);
    };

    const closeConsole = function () {
      if (commandConsole.open) commandConsole.close();
    };

    commandOpeners.forEach(function (button) {
      button.addEventListener("click", openConsole);
    });

    if (commandCloser) commandCloser.addEventListener("click", closeConsole);

    commandConsole.addEventListener("click", function (event) {
      if (event.target === commandConsole) closeConsole();
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        commandConsole.open ? closeConsole() : openConsole();
      }
    });

    commandInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        commandForm.requestSubmit();
        return;
      }

      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      if (!commandHistory.length) return;

      if (event.key === "ArrowUp") {
        historyIndex = Math.max(0, historyIndex - 1);
      } else {
        historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      }

      commandInput.value = historyIndex === commandHistory.length ? "" : commandHistory[historyIndex];
    });

    const loadSearchItems = function () {
      if (!searchItemsPromise) {
        searchItemsPromise = fetch(commandConsole.dataset.searchUrl)
          .then(function (response) {
            if (!response.ok) throw new Error("search index unavailable");
            return response.json();
          });
      }
      return searchItemsPromise;
    };

    const runSearch = function (query) {
      if (!query) {
        appendMessage("usage: search <关键词>", "command-message--muted");
        return Promise.resolve();
      }

      return loadSearchItems().then(function (items) {
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const matches = items.filter(function (item) {
          const text = ((item.title || "") + " " + (item.content || "").replace(/<[^>]+>/g, " ")).toLowerCase();
          return terms.every(function (term) {
            return text.includes(term);
          });
        }).slice(0, 8).map(function (item) {
          return {
            title: item.title || "Untitled",
            url: item.url || "#"
          };
        });

        if (!matches.length) {
          appendMessage("search: 没有找到匹配的文章。", "command-message--muted");
          return;
        }

        appendMessage("found " + matches.length + " result(s):", "command-message--accent");
        appendLinks(matches);
      }).catch(function () {
        appendMessage("search: 无法读取站内索引。", "command-message--error");
      });
    };

    const resolvePageTarget = function (value) {
      const raw = value.trim();
      const lower = raw.toLowerCase();

      if (!raw || ["~", "~/", "/", "home", "/home", "/home/"].includes(lower)) return "home";
      if ([".", "./"].includes(raw)) return "current";
      if (["..", "../"].includes(raw)) return "home";

      const normalized = raw
        .replace(/\\/g, "/")
        .replace(/^~\//, "")
        .replace(/^\.\//, "")
        .replace(/^\//, "")
        .replace(/\/+$/, "")
        .toLowerCase();

      return aliases[normalized] || normalized;
    };

    const navigateToPage = function (value, sourceCommand) {
      const target = resolvePageTarget(value);

      if (target === "current") {
        appendMessage(window.location.pathname, "command-message--accent");
        return Promise.resolve();
      }

      if (!target || !paths[target]) {
        const displayTarget = value || "~";
        const message = sourceCommand === "cd"
          ? "cd: " + displayTarget + ": no such file or directory"
          : "open: 未知页面。试试 ls。";
        appendMessage(message, "command-message--error");
        return Promise.resolve();
      }

      if (["archive", "archives"].includes(target) && commandConsole.dataset.hasPosts !== "true") {
        appendMessage(sourceCommand + ": 当前还没有可归档的文章。", "command-message--muted");
        return Promise.resolve();
      }

      const destination = new URL(paths[target], window.location.href);
      const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
      const destinationPath = destination.pathname.replace(/\/+$/, "") || "/";

      if (currentPath === destinationPath) {
        appendMessage("already in " + destination.pathname, "command-message--muted");
        return Promise.resolve();
      }

      appendMessage((sourceCommand === "cd" ? "entering " : "opening ") + destination.pathname + " ...", "command-message--accent");
      window.location.assign(destination.href);
      return Promise.resolve();
    };

    const runCommand = function (value) {
      const parts = value.trim().split(/\s+/);
      const command = (parts.shift() || "").toLowerCase();
      const argument = parts.join(" ").trim();

      switch (command) {
        case "help":
          appendMessage("可用命令:", "command-message--accent");
          appendMessage("help                 显示命令帮助");
          appendMessage("ls                   列出站点目录");
          appendMessage("cd <dir>             进入目录，例如 cd tags");
          appendMessage("open <name>          打开页面，例如 open tags");
          appendMessage("search <keyword>     搜索文章内容");
          appendMessage("pwd / whoami / uname 查看当前环境");
          appendMessage("date / history       时间与命令历史");
          appendMessage("clear / exit         清屏或退出控制台");
          return Promise.resolve();
        case "ls": {
          const pages = ["home/", "categories/", "tags/", "about/", "links/"];
          if (commandConsole.dataset.hasPosts === "true") pages.splice(1, 0, "archives/");
          appendMessage(pages.join("  "), "command-message--accent");
          return Promise.resolve();
        }
        case "cd":
          return navigateToPage(argument, "cd");
        case "open":
          return navigateToPage(argument, "open");
        case "search":
        case "grep":
          return runSearch(argument);
        case "pwd":
          appendMessage("/home/haoo/pwn-house" + window.location.pathname, "command-message--accent");
          return Promise.resolve();
        case "whoami":
          appendMessage("visitor (binary security learner)", "command-message--accent");
          return Promise.resolve();
        case "uname":
          appendMessage("Startrace 1.0 x86_64 GNU/Linux", "command-message--accent");
          return Promise.resolve();
        case "date":
          appendMessage(new Date().toLocaleString("zh-CN", { hour12: false }));
          return Promise.resolve();
        case "history":
          commandHistory.forEach(function (item, index) {
            appendMessage(String(index + 1).padStart(3, " ") + "  " + item);
          });
          return Promise.resolve();
        case "clear":
          commandOutput.replaceChildren();
          return Promise.resolve();
        case "exit":
        case "quit":
          closeConsole();
          return Promise.resolve();
        case "":
          return Promise.resolve();
        default:
          appendMessage(command + ": command not found. 输入 help 查看帮助。", "command-message--error");
          return Promise.resolve();
      }
    };

    commandForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const value = commandInput.value.trim();
      if (!value) return;

      appendMessage(value, "command-message--input");
      commandHistory.push(value);
      historyIndex = commandHistory.length;
      commandInput.value = "";
      runCommand(value).finally(function () {
        if (commandConsole.open) commandInput.focus();
      });
    });
  }
})();
