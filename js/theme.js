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
    const bodyHeadings = Array.from(content.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const headings = bodyHeadings.slice();
    const articleTitle = document.querySelector(".article-header h1");

    if (!bodyHeadings.some(function (heading) { return heading.tagName === "H1"; }) && articleTitle) {
      headings.unshift(articleTitle);
    }

    const ensureHeadingId = function (heading, index) {
      const currentOwner = heading.id ? document.getElementById(heading.id) : null;
      if (heading.id && currentOwner === heading) return heading.id;

      const base = heading === articleTitle ? "article-title" : "heading-" + (index + 1);
      let id = base;
      let suffix = 2;
      while (document.getElementById(id)) {
        id = base + "-" + suffix;
        suffix += 1;
      }
      heading.id = id;
      return id;
    };

    const root = { level: 0, children: [] };
    const branch = [root];
    const entries = headings.map(function (heading, index) {
      return {
        heading: heading,
        id: ensureHeadingId(heading, index),
        label: heading.textContent.trim() || "未命名章节",
        level: Number(heading.tagName.slice(1))
      };
    });

    entries.forEach(function (entry) {
      while (branch.length > 1 && branch[branch.length - 1].level >= entry.level) {
        branch.pop();
      }

      const node = {
        entry: entry,
        level: entry.level,
        children: []
      };
      branch[branch.length - 1].children.push(node);
      branch.push(node);
    });

    const links = [];
    const renderTree = function (nodes, nested) {
      const list = document.createElement("ol");
      list.className = nested ? "toc-list toc-list--nested" : "toc-list";

      nodes.forEach(function (node) {
        const item = document.createElement("li");
        item.className = "toc-item toc-level-" + node.level;

        const link = document.createElement("a");
        link.href = "#" + encodeURIComponent(node.entry.id);
        link.textContent = node.entry.label;
        links.push({ heading: node.entry.heading, link: link });
        item.appendChild(link);

        if (node.children.length) item.appendChild(renderTree(node.children, true));
        list.appendChild(item);
      });

      return list;
    };

    toc.replaceChildren();
    if (root.children.length) {
      toc.appendChild(renderTree(root.children, false));
    } else {
      const empty = document.createElement("p");
      empty.className = "toc-empty";
      empty.textContent = "本文暂无章节标题";
      toc.appendChild(empty);
    }

    if (links.length && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(function (observedEntries) {
        observedEntries.forEach(function (observedEntry) {
          if (!observedEntry.isIntersecting) return;
          links.forEach(function (item) {
            const active = item.heading === observedEntry.target;
            item.link.classList.toggle("is-active", active);
            if (active) {
              item.link.setAttribute("aria-current", "location");
            } else {
              item.link.removeAttribute("aria-current");
            }
          });
        });
      }, { rootMargin: "-18% 0px -68% 0px" });

      links.forEach(function (item) {
        observer.observe(item.heading);
      });
    }
  }

  const topButton = document.querySelector(".toc-top");
  if (topButton) {
    topButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (content) {
    const legacyCopy = function (text) {
      return new Promise(function (resolve, reject) {
        const textarea = document.createElement("textarea");
        const previousFocus = document.activeElement;
        textarea.value = text;
        textarea.readOnly = true;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        let copied = false;
        try {
          copied = Boolean(document.execCommand && document.execCommand("copy"));
        } catch (error) {
          copied = false;
        }

        textarea.remove();
        if (previousFocus && previousFocus.focus) previousFocus.focus({ preventScroll: true });
        if (copied) {
          resolve();
        } else {
          reject(new Error("Clipboard is unavailable"));
        }
      });
    };

    const copyText = function (text) {
      if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(function () {
          return legacyCopy(text);
        });
      }
      return legacyCopy(text);
    };

    const extractCode = function (block) {
      let source;
      if (block.matches("figure.highlight, div.highlight")) {
        const codeCell = block.querySelector(".code");
        source = codeCell && (codeCell.querySelector("code") || codeCell.querySelector("pre"));
        source = source || block.querySelector("code") || block.querySelector("pre");
      } else {
        source = block.querySelector("code") || block;
      }

      if (!source) return "";
      const clone = source.cloneNode(true);
      Array.from(clone.querySelectorAll("br")).forEach(function (lineBreak) {
        lineBreak.replaceWith(document.createTextNode("\n"));
      });
      return clone.textContent;
    };

    const codeBlocks = Array.from(content.querySelectorAll("figure.highlight, div.highlight, pre")).filter(function (block) {
      return !block.parentElement || !block.parentElement.closest("figure.highlight, div.highlight");
    });

    codeBlocks.forEach(function (block) {
      const shell = document.createElement("div");
      shell.className = "code-block-shell";

      const toolbar = document.createElement("div");
      toolbar.className = "code-block-toolbar";

      const button = document.createElement("button");
      button.className = "code-copy-button";
      button.type = "button";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      button.setAttribute("aria-live", "polite");

      block.parentNode.insertBefore(shell, block);
      shell.appendChild(toolbar);
      shell.appendChild(block);
      toolbar.appendChild(button);

      let resetTimer;
      button.addEventListener("click", function () {
        window.clearTimeout(resetTimer);
        button.disabled = true;
        copyText(extractCode(block)).then(function () {
          button.textContent = "已复制";
          button.setAttribute("aria-label", "代码已复制");
          button.classList.add("is-copied");
        }).catch(function () {
          button.textContent = "复制失败";
          button.setAttribute("aria-label", "代码复制失败");
          button.classList.remove("is-copied");
        }).finally(function () {
          button.disabled = false;
          resetTimer = window.setTimeout(function () {
            button.textContent = "复制";
            button.setAttribute("aria-label", "复制代码");
            button.classList.remove("is-copied");
          }, 1800);
        });
      });
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
      categories: commandConsole.dataset.categoriesUrl,
      category: commandConsole.dataset.categoriesUrl,
      tags: commandConsole.dataset.tagsUrl,
      tag: commandConsole.dataset.tagsUrl,
      about: commandConsole.dataset.aboutUrl,
      links: commandConsole.dataset.linksUrl
    };

    const aliases = {
      "首页": "home",
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
          appendMessage("history              查看命令历史");
          appendMessage("clear / exit         清屏或退出控制台");
          return Promise.resolve();
        case "ls": {
          const pages = ["home/", "categories/", "tags/", "about/", "links/"];
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
          appendMessage("/home/haoo/blog" + window.location.pathname, "command-message--accent");
          return Promise.resolve();
        case "whoami":
          appendMessage("visitor", "command-message--accent");
          return Promise.resolve();
        case "uname":
          appendMessage("Startrace 1.0 x86_64 GNU/Linux", "command-message--accent");
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
