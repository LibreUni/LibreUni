### AI Skill: Source Research & Integration (FOSS Educational Standard)

**Trigger:** Activate this skill whenever asked to add information, explain a new concept, write a course lesson, or when specifically instructed to "find sources" for a topic.

**Context:** LibreUni is a Free and Open Source (FOSS) educational platform. Maintaining academic integrity, respecting copyright, and providing a trail of knowledge (both for students and open-source contributors) are top priorities.

#### Execution Steps:

**Step 1: Find High-Quality Sources**

* Prioritize authoritative, stable, and widely respected sources:
  * Official documentation (e.g., MDN, Python Docs, GNU manuals).
  * Established open educational resources (OER) like Wikipedia, OpenStax, or university lecture notes (MIT OCW).
  * Industry-standard textbooks (e.g., *Operating System Concepts*, *Clean Code*).
* Use standard search tools to find relevant links, and web fetch tools to read the license and content.

**Step 2: Evaluate the License & Determine Integration Strategy**
Before writing any content, determine the source's copyright status:

* **Creative Commons (CC-BY, CC-BY-SA) / Public Domain:**
  * *Action:* You may directly quote, adapt, or heavily paraphrase.
  * *Requirement:* You MUST provide a visible citation linking back to the original source and stating the license (e.g., "Adapted from [Wikipedia](link) under CC-BY-SA").
* **Proprietary / Standard Copyright (Textbooks, most blogs, commercial sites):**
  * *Action:* You MUST NOT copy-paste content (except for very brief, 1-2 sentence "Fair Use" quotes). You must read, synthesize the concepts, and rewrite the explanation entirely in your own words or do so for parts of it that are relevant for the course direction.
  * *Requirement:* Add the source to a visible "References" or "Further Reading" section, and use hidden HTML comments for internal tracking.

**Step 3: Apply the Content & Citations (Markdown Format)**
Integrate the knowledge using the following strict formatting rules within LibreUni's `.mdx` files:

1. **Internal Tracking (Hidden Comments):**
   When synthesizing facts from a copyrighted source, leave an MDX comment immediately above or below the paragraph for future contributors.

   ```mdx
   {/* Source tracking: Concept of Virtual Memory synthesized from "Operating System Concepts" by Silberschatz et al., Chapter 9. */}
   ```
2. **Fair-Use Direct Quotes:**
   If using a specific, impactful quote from a copyrighted source, use markdown blockquotes and cite immediately.

   ```markdown
   > "Programs must be written for people to read, and only incidentally for machines to execute." 
   > — *Structure and Interpretation of Computer Programs* (Abelson & Sussman)
   ```
3. **Visible Bibliography (End of File):**
   Always append a "References & Further Reading" section at the end of the lesson file if external sources were used to inform the content.

   ```markdown
   ## References & Further Reading
   *   [MDN Web Docs: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) (CC-BY-SA 2.5)
   *   *Clean Code: A Handbook of Agile Software Craftsmanship* by Robert C. Martin (Prentice Hall)
   *   [MIT OpenCourseWare: Introduction to Algorithms](https://ocw.mit.edu/) 

4. **Content Integration:**
   Make sure that you don't just look up a source to justify your existing content. Always be critical about the information there is in sources and information in the course. If a source has a better explanation, wording, or straight up a contradiction to the course content, you should update the course content to reflect the best information available. 

5. **Coverage:**
   Ensure that all content can be tracked back to a source, whether it's a direct quote, a paraphrased concept, or an original synthesis. This promotes transparency and allows future contributors to verify and build upon the work.

#### Strict Constraints:

* **NEVER** just append citations to existing text without fundamentally rewriting it. You must actively read the fetched source material and rewrite the explanations to genuinely synthesize the retrieved text in your own words.
* **NEVER** hallucinate a source, book, or link. If you cannot verify a URL or book's existence via search tools, do not cite it.
* **NEVER** bypass type checks or markdown linters when inserting comments or citations. Ensure tracking comments do not break MDX parsing (for MDX v2, you MUST use `{/* comment */}` instead of standard HTML `<!-- comment -->`).
