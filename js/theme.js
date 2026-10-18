(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var mobileQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 1023px)")
    : { matches: window.innerWidth <= 1023 };

  var raf = window.requestAnimationFrame || function (fn) {
    return window.setTimeout(fn, 16);
  };

  /* ------------------------------------------------------------------
   * 配色
   * ---------------------------------------------------------------- */
  var paletteButton = document.querySelector("[data-palette-toggle]");
  var paletteLabel = document.querySelector("[data-palette-label]");
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var palettes = [
    { id: "green", label: "绿色", color: "#080a09" },
    { id: "cyan", label: "青蓝", color: "#070b0d" },
    { id: "amber", label: "琥珀", color: "#0c0906" }
  ];

  if (paletteButton) {
    var applyPalette = function (palette, persist) {
      root.dataset.palette = palette.id;
      if (paletteLabel) paletteLabel.textContent = palette.label;
      if (themeColor) themeColor.setAttribute("content", palette.color);

      var next = palettes[(palettes.indexOf(palette) + 1) % palettes.length];
      paletteButton.setAttribute("aria-label", "当前" + palette.label + "配色，切换为" + next.label);
      paletteButton.setAttribute("title", "切换为" + next.label + "配色");

      if (persist) {
        try {
          localStorage.setItem("startrace-palette", palette.id);
        } catch (error) {}
      }
    };

    var currentPalette = palettes.filter(function (item) {
      return item.id === root.dataset.palette;
    })[0] || palettes[0];

    applyPalette(currentPalette, false);

    paletteButton.addEventListener("click", function () {
      var index = palettes.map(function (item) { return item.id; }).indexOf(root.dataset.palette);
      applyPalette(palettes[(index + 1) % palettes.length], true);
    });
  }

  /* ------------------------------------------------------------------
   * 移动端工作区抽屉
   * ---------------------------------------------------------------- */
  var drawerToggle = document.querySelector("[data-drawer-toggle]");
  var backdrop = document.querySelector("[data-drawer-close]");

  var setDrawer = function (open) {
    body.classList.toggle("drawer-open", open);
    if (backdrop) backdrop.hidden = !open;
    if (drawerToggle) {
      drawerToggle.setAttribute("aria-expanded", open ? "true" : "false");
      drawerToggle.setAttribute("aria-label", open ? "关闭工作区" : "打开工作区");
    }
  };

  if (drawerToggle) {
    drawerToggle.addEventListener("click", function () {
      setDrawer(!body.classList.contains("drawer-open"));
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setDrawer(false);
    });
  }

  window.addEventListener("resize", function () {
    if (!mobileQuery.matches) setDrawer(false);
  });

  /* ------------------------------------------------------------------
   * 目录树：记住展开状态 + 全部展开
   * ---------------------------------------------------------------- */
  var folders = Array.prototype.slice.call(document.querySelectorAll("[data-tree-key]"));
  var storedTree = {};

  try {
    storedTree = JSON.parse(localStorage.getItem("startrace-tree") || "{}") || {};
  } catch (error) {
    storedTree = {};
  }

  var saveTree = function () {
    try {
      localStorage.setItem("startrace-tree", JSON.stringify(storedTree));
    } catch (error) {}
  };

  folders.forEach(function (folder) {
    var key = folder.dataset.treeKey;
    var isActive = folder.hasAttribute("data-tree-active");

    // 当前页面所在目录始终展开，其余目录恢复上次的展开状态
    if (isActive) {
      folder.open = true;
    } else if (Object.prototype.hasOwnProperty.call(storedTree, key)) {
      folder.open = Boolean(storedTree[key]);
    }

    folder.addEventListener("toggle", function () {
      storedTree[key] = folder.open;
      saveTree();
    });
  });

  var expandButton = document.querySelector("[data-tree-expand]");
  if (expandButton) {
    expandButton.addEventListener("click", function () {
      var shouldOpen = folders.some(function (folder) { return !folder.open; });
      folders.forEach(function (folder) {
        folder.open = shouldOpen;
        storedTree[folder.dataset.treeKey] = shouldOpen;
      });
      saveTree();
      expandButton.setAttribute("aria-label", shouldOpen ? "收起全部目录" : "展开全部目录");
    });
  }

  /* ------------------------------------------------------------------
   * 阅读进度
   * ---------------------------------------------------------------- */
  var pane = document.getElementById("pane-scroll");
  var progressBar = document.querySelector("[data-progress-bar]");
  var progressText = document.querySelector("[data-reading-progress]");
  var progressPending = false;

  var updateProgress = function () {
    progressPending = false;

    var scroller = mobileQuery.matches ? null : pane;
    var max = scroller
      ? scroller.scrollHeight - scroller.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;
    var top = scroller ? scroller.scrollTop : window.scrollY;
    var amount = max > 8 ? Math.min(100, Math.max(0, Math.round((top / max) * 100))) : 100;

    if (progressBar) progressBar.style.width = amount + "%";
    if (progressText) progressText.textContent = "阅读 " + amount + "%";
  };

  var queueProgress = function () {
    if (progressPending) return;
    progressPending = true;
    raf(updateProgress);
  };

  window.addEventListener("scroll", queueProgress, { passive: true });
  if (pane) pane.addEventListener("scroll", queueProgress, { passive: true });
  updateProgress();

  /* ------------------------------------------------------------------
   * 大纲跟随滚动
   * ---------------------------------------------------------------- */
  var outline = document.getElementById("outline");
  var article = document.getElementById("article-content");

  if (outline && article && "IntersectionObserver" in window) {
    var outlineLinks = Array.prototype.slice.call(outline.querySelectorAll('a[href^="#"]'));
    var headingMap = new Map();

    outlineLinks.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      try {
        id = decodeURIComponent(id);
      } catch (error) {}
      var target = document.getElementById(id);
      if (target) headingMap.set(target, link);
    });

    if (headingMap.size) {
      var setActive = function (activeLink) {
        outlineLinks.forEach(function (link) {
          var active = link === activeLink;
          link.classList.toggle("is-active", active);
          if (active) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      };

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(headingMap.get(entry.target));
        });
      }, { rootMargin: "-10% 0px -74% 0px", threshold: 0 });

      headingMap.forEach(function (link, heading) {
        observer.observe(heading);
      });
    }
  }

  /* ------------------------------------------------------------------
   * 复制
   * ---------------------------------------------------------------- */
  var copyText = function (text) {
    var legacy = function () {
      return new Promise(function (resolve, reject) {
        var area = document.createElement("textarea");
        var previous = document.activeElement;
        area.value = text;
        area.readOnly = true;
        area.style.position = "fixed";
        area.style.opacity = "0";
        area.style.pointerEvents = "none";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, area.value.length);

        var copied = false;
        try {
          copied = Boolean(document.execCommand && document.execCommand("copy"));
        } catch (error) {
          copied = false;
        }

        area.remove();
        if (previous && previous.focus) previous.focus({ preventScroll: true });
        if (copied) resolve();
        else reject(new Error("clipboard unavailable"));
      });
    };

    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(legacy);
    }
    return legacy();
  };

  if (article) {
    var extractCode = function (block) {
      var source = block.querySelector("td.code pre code") ||
        block.querySelector("td.code pre") ||
        block.querySelector("code") ||
        block.querySelector("pre") ||
        block;

      var clone = source.cloneNode(true);
      Array.prototype.forEach.call(clone.querySelectorAll("br"), function (lineBreak) {
        lineBreak.replaceWith(document.createTextNode("\n"));
      });
      return clone.textContent.replace(/\n$/, "");
    };

    Array.prototype.forEach.call(article.querySelectorAll("figure.highlight"), function (figure) {
      if (figure.querySelector(".code-tools")) return;

      var language = "code";
      Array.prototype.some.call(figure.classList, function (name) {
        if (name !== "highlight") {
          language = name;
          return true;
        }
        return false;
      });

      var tools = document.createElement("div");
      tools.className = "code-tools";

      var lang = document.createElement("span");
      lang.className = "code-tools__lang";
      lang.textContent = language;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "code-tools__copy";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制这段代码");

      var resetTimer;
      button.addEventListener("click", function () {
        window.clearTimeout(resetTimer);
        copyText(extractCode(figure)).then(function () {
          button.textContent = "已复制";
          button.classList.add("is-copied");
        }).catch(function () {
          button.textContent = "复制失败";
        }).finally(function () {
          resetTimer = window.setTimeout(function () {
            button.textContent = "复制";
            button.classList.remove("is-copied");
          }, 1600);
        });
      });

      tools.appendChild(lang);
      tools.appendChild(button);
      figure.appendChild(tools);
    });
  }

  var copyLinkButton = document.querySelector("[data-copy-link]");
  if (copyLinkButton) {
    var copyIcon = copyLinkButton.querySelector("use");
    var restoreTimer;
    copyLinkButton.addEventListener("click", function () {
      copyText(window.location.href).then(function () {
        copyLinkButton.classList.add("is-copied");
        copyLinkButton.setAttribute("title", "已复制链接");
        if (copyIcon) copyIcon.setAttribute("href", "#i-check");
        window.clearTimeout(restoreTimer);
        restoreTimer = window.setTimeout(function () {
          copyLinkButton.classList.remove("is-copied");
          copyLinkButton.setAttribute("title", "复制本页链接");
          if (copyIcon) copyIcon.setAttribute("href", "#i-copy");
        }, 1600);
      }).catch(function () {
        copyLinkButton.setAttribute("title", "复制失败");
      });
    });
  }

  /* ------------------------------------------------------------------
   * 命令面板
   * ---------------------------------------------------------------- */
  var palette = document.getElementById("command-palette");
  var paletteForm = document.getElementById("cmd-form");
  var paletteInput = document.getElementById("cmd-input");
  var paletteResults = document.getElementById("cmd-results");
  var paletteOpeners = document.querySelectorAll("[data-command-open]");
  var paletteCloser = document.querySelector("[data-command-close]");

  if (palette && paletteForm && paletteInput && paletteResults) {
    var urlFor = function (key) {
      return palette.dataset[key] || "#";
    };

    var commands = [
      { title: "打开概览", sub: "index.md", meta: "页面", icon: "home", url: urlFor("homeUrl") },
      { title: "打开知识库", sub: "categories.md", meta: "页面", icon: "folders", url: urlFor("categoriesUrl") },
      { title: "打开标签页", sub: "tags.md", meta: "页面", icon: "tag", url: urlFor("tagsUrl") },
      { title: "打开关于", sub: "about.md", meta: "页面", icon: "user", url: urlFor("aboutUrl") },
      { title: "打开链接", sub: "links.md", meta: "页面", icon: "link", url: urlFor("linksUrl") },
      { title: "订阅 RSS", sub: "rss.xml", meta: "订阅", icon: "rss", url: urlFor("rssUrl"), external: true }
    ];

    var searchIndex = null;
    var searchPromise = null;
    var activeIndex = -1;
    var items = [];

    var loadSearch = function () {
      if (!searchPromise) {
        searchPromise = fetch(palette.dataset.searchUrl || "/search.json")
          .then(function (response) {
            if (!response.ok) throw new Error("search index unavailable");
            return response.json();
          })
          .then(function (list) {
            searchIndex = list;
            return list;
          })
          .catch(function () {
            searchIndex = [];
            return searchIndex;
          });
      }
      return searchPromise;
    };

    var safeUrl = function (value) {
      try {
        var parsed = new URL(value, window.location.href);
        if (parsed.origin === window.location.origin && /^https?:$/.test(parsed.protocol)) {
          return parsed.href;
        }
        return "#";
      } catch (error) {
        return "#";
      }
    };

    var go = function (item) {
      if (!item) return;
      var href = item.external ? item.url : safeUrl(item.url);
      if (href === "#") return;
      if (item.external) {
        window.open(href, "_blank", "noopener");
        return;
      }
      window.location.assign(href);
    };

    var clearResults = function () {
      while (paletteResults.firstChild) paletteResults.removeChild(paletteResults.firstChild);
    };

    var addGroup = function (label) {
      var group = document.createElement("div");
      group.className = "cmd__group";
      group.textContent = label;
      paletteResults.appendChild(group);
    };

    var addItem = function (item, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cmd-item";
      button.dataset.index = String(index);
      button.setAttribute("role", "option");

      var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "icon icon-13");
      icon.setAttribute("aria-hidden", "true");
      var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", "#i-" + (item.icon || "file"));
      icon.appendChild(use);

      var labelWrap = document.createElement("span");
      labelWrap.className = "cmd-item__label";

      var title = document.createElement("span");
      title.className = "cmd-item__title";
      title.textContent = item.title;

      labelWrap.appendChild(title);

      if (item.sub) {
        var sub = document.createElement("span");
        sub.className = "cmd-item__sub";
        sub.textContent = item.sub;
        labelWrap.appendChild(sub);
      }

      var meta = document.createElement("span");
      meta.className = "cmd-item__meta";
      meta.textContent = item.meta || "";

      button.appendChild(icon);
      button.appendChild(labelWrap);
      button.appendChild(meta);

      button.addEventListener("mouseenter", function () {
        setActive(index);
      });
      button.addEventListener("click", function (event) {
        event.preventDefault();
        go(item);
      });

      paletteResults.appendChild(button);
    };

    var renderEmpty = function (message) {
      var empty = document.createElement("div");
      empty.className = "cmd-empty";
      empty.textContent = message;
      paletteResults.appendChild(empty);
    };

    var setActive = function (index) {
      activeIndex = index;
      var buttons = paletteResults.querySelectorAll(".cmd-item");
      Array.prototype.forEach.call(buttons, function (button) {
        var active = Number(button.dataset.index) === index;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
        if (active && button.scrollIntoView) {
          button.scrollIntoView({ block: "nearest" });
        }
      });
    };

    var render = function (query) {
      clearResults();
      items = [];
      activeIndex = -1;

      var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      var matchedCommands = commands.filter(function (command) {
        if (!terms.length) return true;
        var haystack = (command.title + " " + (command.sub || "")).toLowerCase();
        return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
      });

      if (matchedCommands.length) {
        addGroup("跳转");
        matchedCommands.forEach(function (command) {
          addItem(command, items.length);
          items.push(command);
        });
      }

      if (!terms.length) {
        renderEmpty("输入关键词检索文章，或选择上面的页面。");
        return;
      }

      var renderPosts = function () {
        var list = searchIndex || [];
        var matchedPosts = list.filter(function (post) {
          var haystack = ((post.title || "") + " " + (post.content || "").replace(/<[^>]+>/g, " "))
            .toLowerCase();
          return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
        }).slice(0, 12);

        if (matchedPosts.length) {
          addGroup("文章");
          matchedPosts.forEach(function (post) {
            var item = {
              title: post.title || "Untitled",
              sub: (post.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
              meta: "post",
              icon: "file",
              url: post.url
            };
            addItem(item, items.length);
            items.push(item);
          });
        }

        if (!items.length) {
          renderEmpty("没有匹配结果。");
        }

        if (items.length) setActive(0);
      };

      if (searchIndex) {
        renderPosts();
      } else {
        loadSearch().then(renderPosts);
      }
    };

    var isPaletteOpen = function () {
      return palette.open === true || palette.hasAttribute("open");
    };

    var openPalette = function () {
      if (!isPaletteOpen()) {
        if (typeof palette.showModal === "function") palette.showModal();
        else palette.setAttribute("open", "");
      }
      paletteInput.value = "";
      render("");
      window.setTimeout(function () {
        paletteInput.focus();
      }, 0);
    };

    var closePalette = function () {
      if (typeof palette.close === "function" && palette.open) palette.close();
      else palette.removeAttribute("open");
    };

    Array.prototype.forEach.call(paletteOpeners, function (button) {
      button.addEventListener("click", openPalette);
    });

    if (paletteCloser) paletteCloser.addEventListener("click", closePalette);

    palette.addEventListener("click", function (event) {
      if (event.target === palette) closePalette();
    });

    paletteInput.addEventListener("input", function () {
      render(paletteInput.value.trim());
    });

    paletteInput.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!items.length) return;
        var delta = event.key === "ArrowDown" ? 1 : -1;
        var next = (activeIndex + delta + items.length) % items.length;
        setActive(next);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          go(items[activeIndex]);
        } else if (items.length === 1) {
          go(items[0]);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      }
    });

    paletteForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) go(items[activeIndex]);
      else if (items.length) go(items[0]);
    });

    document.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        if (isPaletteOpen()) closePalette();
        else openPalette();
        return;
      }

      if (key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        var node = event.target;
        var tag = node && node.tagName ? node.tagName.toLowerCase() : "";
        var typing = tag === "input" || tag === "textarea" || tag === "select" || (node && node.isContentEditable);
        if (!typing && !isPaletteOpen()) {
          event.preventDefault();
          openPalette();
        }
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && body.classList.contains("drawer-open")) {
        setDrawer(false);
      }
    });
  }
})();
