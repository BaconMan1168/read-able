import { Readability } from "@mozilla/readability";

function createHTMLDocument(sourceDocument = document) {
  const doc = document.implementation.createHTMLDocument(sourceDocument.title || document.title);
  const base = doc.createElement("base");
  base.href = sourceDocument.location?.href || location.href;
  doc.head.appendChild(base);

  return doc;
}

function createSelectionDocument(sourceDocument) {
  const selection = sourceDocument.defaultView?.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.toString().trim().length < 20) {
    return null;
  }

  const doc = createHTMLDocument(sourceDocument);
  const article = doc.body.appendChild(doc.createElement("article"));
  const range = selection.getRangeAt(0);
  article.appendChild(range.cloneContents());

  return article.textContent.trim().length >= 20 ? doc : null;
}

function cloneForReadability(sourceDocument) {
  const clone = sourceDocument.cloneNode(true);

  if (!clone.head.querySelector("base")) {
    const base = clone.createElement("base");
    base.href = sourceDocument.location?.href || location.href;
    clone.head.prepend(base);
  }

  return clone;
}

function getCandidateDocuments() {
  const docs = [document];

  document.querySelectorAll("iframe, frame").forEach((frame) => {
    try {
      const frameDocument = frame.contentDocument;
      if (frameDocument?.documentElement?.innerText?.trim().length > 100) {
        docs.push(frameDocument);
      }
    } catch {
      // Cross-origin frames are not readable from a content script.
    }
  });

  return docs.sort((a, b) => {
    const aLength = a.documentElement?.innerText?.length || 0;
    const bLength = b.documentElement?.innerText?.length || 0;
    return bLength - aLength;
  });
}

function parseDocument(sourceDocument) {
  const selectedDocument = createSelectionDocument(sourceDocument);
  const readableDocument = selectedDocument || cloneForReadability(sourceDocument);
  const article = new Readability(readableDocument, { debug: false }).parse();

  if (!article) {
    return null;
  }

  return {
    title: article.title || sourceDocument.title || "Untitled",
    byline: article.byline || "",
    content: article.content || "",
    textContent: article.textContent || "",
    excerpt: article.excerpt || "",
    length: article.length || article.textContent?.length || 0,
    lang: article.lang || sourceDocument.documentElement?.lang || "en",
    dir: article.dir || sourceDocument.documentElement?.dir || "",
    siteName: article.siteName || "",
    publishedTime: article.publishedTime || "",
    url: sourceDocument.location?.href || location.href,
  };
}

globalThis.__readableExtractReaderArticle = () => {
  try {
    for (const candidateDocument of getCandidateDocuments()) {
      const article = parseDocument(candidateDocument);

      if (article) {
        return { ok: true, article };
      }
    }

    return {
      ok: false,
      error: "No readable article was detected. Select the text you want to read, then try Reader Mode again.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Reader Mode could not read this page.",
    };
  }
};
