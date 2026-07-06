/* eslint-disable no-console */
/**
 * Web development LMS course catalog for seed scripts.
 * Used by: scripts/seed-lms-demo-data.js
 */

/** @typedef {{ title: string; lessonType: string; bodyText?: string | null; videoUrl?: string | null; externalLiveUrl?: string | null; liveStartsAt?: Date | null; liveEndsAt?: Date | null; isPublished?: boolean; durationSeconds?: number }} LessonDef */
/** @typedef {{ title: string; lessons: LessonDef[] }} SectionDef */
/** @typedef {{ courseSlug: string; title: string; description: string; deliveryType: string; isPublic: boolean; status: string; salePrice?: number | null; tagKeys?: string[]; sections: SectionDef[] }} WebDevCourseDef */

const WEB_DEV_CATEGORY = {
  name: "Web Development",
  slugSuffix: "category-web-dev",
  description: "Frontend, backend, and full-stack courses for modern web developers.",
};

const WEB_DEV_TAGS = [
  { key: "frontend", name: "Frontend", slugSuffix: "tag-frontend" },
  { key: "javascript", name: "JavaScript", slugSuffix: "tag-javascript" },
  { key: "react", name: "React", slugSuffix: "tag-react" },
  { key: "backend", name: "Backend", slugSuffix: "tag-backend" },
  { key: "beginner", name: "Beginner", slugSuffix: "tag-beginner" },
];

function text(title, bodyHtml) {
  return { title, lessonType: "TEXT", bodyText: bodyHtml };
}

function video(title, videoUrl, bodyHtml, durationSeconds = 720) {
  return { title, lessonType: "VIDEO", videoUrl, bodyText: bodyHtml ?? null, durationSeconds };
}

function pdf(title, url, bodyHtml) {
  return { title, lessonType: "PDF", videoUrl: url, bodyText: bodyHtml ?? null };
}

function live(title, meetingUrl, startsAt, endsAt, bodyHtml) {
  return {
    title,
    lessonType: "LIVE_CLASS",
    externalLiveUrl: meetingUrl,
    liveStartsAt: startsAt,
    liveEndsAt: endsAt,
    bodyText: bodyHtml ?? null,
  };
}

/**
 * @param {(suffix: string) => string} slug
 * @param {{ liveKickoffStart: Date; liveKickoffEnd: Date }} liveDates
 * @returns {WebDevCourseDef[]}
 */
function buildWebDevCourses(slug, liveDates) {
  const { liveKickoffStart, liveKickoffEnd } = liveDates;

  return [
    {
      courseSlug: slug("html-css-fundamentals"),
      title: "HTML & CSS Fundamentals",
      description:
        "Build your first web pages from scratch. Learn semantic HTML, modern CSS layout (Flexbox and Grid), responsive design, and accessibility basics — the foundation every web developer needs.",
      deliveryType: "VIDEO",
      isPublic: true,
      status: "PUBLISHED",
      tagKeys: ["beginner", "frontend"],
      sections: [
        {
          title: "The web platform",
          lessons: [
            text(
              "How the web works",
              `<h2>Clients, servers, and HTTP</h2>
<p>When you visit a website, your <strong>browser</strong> (the client) sends an HTTP request to a <strong>server</strong>. The server responds with HTML, CSS, JavaScript, images, and other assets. The browser parses HTML into the DOM, applies CSS, and runs JavaScript.</p>
<ul>
  <li><strong>HTML</strong> — structure and meaning</li>
  <li><strong>CSS</strong> — presentation and layout</li>
  <li><strong>JavaScript</strong> — behavior and interactivity</li>
</ul>
<p>In this course you will master the first two pillars before moving on to JavaScript in the next course.</p>`,
            ),
            text(
              "Developer environment setup",
              `<h2>Tools you need</h2>
<ol>
  <li>Install <a href="https://code.visualstudio.com/" target="_blank" rel="noopener">VS Code</a> or your preferred editor.</li>
  <li>Use a modern browser with DevTools (Chrome, Firefox, or Edge).</li>
  <li>Create a project folder and open it in your editor.</li>
  <li>Optional: install the Live Server extension for instant reload.</li>
</ol>
<p>Create <code>index.html</code>, open it in the browser, and verify you can edit and refresh. You are ready to code.</p>`,
            ),
            video(
              "Introduction to HTML",
              "https://www.youtube.com/watch?v=qz0aGYrrlhU",
              `<p>Watch this overview of HTML tags, attributes, and document structure. After the video, create a page with <code>&lt;header&gt;</code>, <code>&lt;main&gt;</code>, and <code>&lt;footer&gt;</code>.</p>`,
              600,
            ),
          ],
        },
        {
          title: "HTML structure & semantics",
          lessons: [
            text(
              "Semantic HTML elements",
              `<h2>Write HTML that machines and humans understand</h2>
<p>Prefer semantic elements instead of nesting many <code>&lt;div&gt;</code>s without meaning:</p>
<pre>&lt;article&gt;
  &lt;h1&gt;Blog post title&lt;/h1&gt;
  &lt;p&gt;Published &lt;time datetime="2026-05-01"&gt;May 1, 2026&lt;/time&gt;&lt;/p&gt;
  &lt;p&gt;Article body…&lt;/p&gt;
&lt;/article&gt;</pre>
<p>Use <code>&lt;nav&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;aside&gt;</code>, and heading levels (<code>h1</code>–<code>h6</code>) consistently for SEO and screen readers.</p>`,
            ),
            text(
              "Forms and user input",
              `<h2>Collecting data in the browser</h2>
<p>Forms use <code>&lt;form&gt;</code>, <code>&lt;label&gt;</code>, and input types (<code>text</code>, <code>email</code>, <code>password</code>, <code>checkbox</code>, <code>radio</code>, <code>select</code>).</p>
<ul>
  <li>Always associate labels with inputs via <code>for</code> / <code>id</code>.</li>
  <li>Use <code>required</code>, <code>pattern</code>, and <code>minlength</code> for client-side validation.</li>
  <li>Set <code>name</code> attributes — they become field names when the form is submitted.</li>
</ul>
<p><strong>Exercise:</strong> Build a contact form with name, email, message, and a submit button.</p>`,
            ),
            text(
              "Accessibility essentials",
              `<h2>Build for everyone</h2>
<ul>
  <li>One <code>h1</code> per page; headings in order.</li>
  <li>Alt text on images that convey information.</li>
  <li>Sufficient color contrast (WCAG AA: 4.5:1 for body text).</li>
  <li>Keyboard navigation: focus styles visible on links and buttons.</li>
  <li>Use <code>aria-label</code> only when visible text is not possible.</li>
</ul>
<p>Test with Tab key only — can you reach every interactive element?</p>`,
            ),
          ],
        },
        {
          title: "CSS layout & styling",
          lessons: [
            text(
              "Selectors and the cascade",
              `<h2>How CSS applies styles</h2>
<p>Specificity order: inline styles → IDs → classes/attributes → elements. Later rules win when specificity is equal.</p>
<pre>/* Class + element */
.card h2 { color: #1e40af; }

/* Pseudo-class */
a:hover { text-decoration: underline; }</pre>
<p>Use class names (BEM or utility-style) instead of deep nesting. Keep styles reusable.</p>`,
            ),
            video(
              "Flexbox layout",
              "https://www.youtube.com/watch?v=fYq5PXgSsbE",
              `<p>Flexbox is ideal for navigation bars, card rows, and vertical centering. Practice: build a header with logo left and menu links right using <code>display: flex</code> and <code>justify-content: space-between</code>.</p>`,
              900,
            ),
            text(
              "CSS Grid for page layouts",
              `<h2>Two-dimensional layouts</h2>
<pre>.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}</pre>
<p>Combine Grid for page structure with Flexbox for components inside cells. Use <code>gap</code> instead of margins between grid items.</p>`,
            ),
          ],
        },
        {
          title: "Responsive design",
          lessons: [
            text(
              "Mobile-first CSS",
              `<h2>Start small, enhance for larger screens</h2>
<p>Write base styles for mobile, then add breakpoints with <code>@media (min-width: …)</code>.</p>
<pre>@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}</pre>
<p>Use relative units: <code>rem</code> for typography, <code>%</code> and <code>fr</code> for layout, <code>max-width</code> on containers (~1200px).</p>`,
            ),
            text(
              "Responsive images & media queries workshop",
              `<h2>Adapt content to viewport</h2>
<pre>&lt;img src="hero-800.jpg" srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w" sizes="(max-width: 600px) 100vw, 50vw" alt="Team collaborating" /&gt;</pre>
<p><strong>Project:</strong> Convert a fixed-width landing page to a responsive layout with a collapsible mobile nav.</p>`,
            ),
            pdf(
              "CSS reference cheat sheet",
              "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              `<p>Download and keep this reference nearby while building layouts. Review Flexbox and Grid property lists weekly.</p>`,
            ),
          ],
        },
      ],
    },
    {
      courseSlug: slug("javascript-essentials"),
      title: "JavaScript for Web Developers",
      description:
        "Master JavaScript from variables and functions through DOM manipulation, events, and async programming with fetch and Promises — everything you need before learning React.",
      deliveryType: "VIDEO",
      isPublic: true,
      status: "PUBLISHED",
      tagKeys: ["javascript", "frontend"],
      sections: [
        {
          title: "Language fundamentals",
          lessons: [
            text(
              "Variables, types, and operators",
              `<h2>JavaScript building blocks</h2>
<p>Use <code>const</code> by default, <code>let</code> when reassignment is needed. Avoid <code>var</code>.</p>
<pre>const price = 19.99;
let quantity = 1;
quantity += 1;

const label = \`Total: $\${(price * quantity).toFixed(2)}\`;</pre>
<p>Primitive types: <code>string</code>, <code>number</code>, <code>boolean</code>, <code>null</code>, <code>undefined</code>, <code>bigint</code>, <code>symbol</code>. Objects and arrays are reference types.</p>`,
            ),
            text(
              "Functions and scope",
              `<h2>Reusable logic</h2>
<pre>function greet(name) {
  return \`Hello, \${name}\`;
}

const double = (n) => n * 2;</pre>
<p>Understand block scope, closures (functions that remember outer variables), and arrow functions for callbacks.</p>`,
            ),
            video(
              "Control flow and arrays",
              "https://www.youtube.com/watch?v=W6NZfZ5FjY8",
              `<p>Practice <code>if/else</code>, <code>for…of</code>, and array methods: <code>map</code>, <code>filter</code>, <code>reduce</code>, <code>find</code>.</p>`,
              480,
            ),
          ],
        },
        {
          title: "DOM & events",
          lessons: [
            text(
              "Selecting and updating the DOM",
              `<h2>JavaScript meets HTML</h2>
<pre>const btn = document.querySelector('#submit');
const list = document.querySelectorAll('.item');

btn.addEventListener('click', () =&gt; {
  list.forEach(el =&gt; el.classList.toggle('done'));
});</pre>
<p>Prefer <code>textContent</code> over <code>innerHTML</code> for user data to prevent XSS.</p>`,
            ),
            text(
              "Event delegation & forms in JS",
              `<h2>Handle dynamic content efficiently</h2>
<p>Attach one listener on a parent and inspect <code>event.target</code> instead of binding every row.</p>
<p>On form submit: call <code>event.preventDefault()</code>, read values with <code>FormData</code>, validate, then update the UI or call an API.</p>`,
            ),
          ],
        },
        {
          title: "Async JavaScript",
          lessons: [
            text(
              "Promises and async/await",
              `<h2>Non-blocking code</h2>
<pre>async function loadUsers() {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}</pre>
<p>Always handle errors with <code>try/catch</code>. Show loading and error states in the UI.</p>`,
            ),
            text(
              "Working with REST APIs",
              `<h2>Fetch JSON from a server</h2>
<p>Typical CRUD flow: GET list → render → POST create → PATCH update → DELETE remove.</p>
<p><strong>Exercise:</strong> Build a todo list that loads from <code>jsonplaceholder.typicode.com/todos</code> and displays loading/error/empty states.</p>`,
            ),
          ],
        },
      ],
    },
    {
      courseSlug: slug("react-nextjs"),
      title: "React & Next.js Development",
      description:
        "Build production-ready UIs with React 19 and Next.js App Router: components, hooks, server components, data fetching, forms, and deployment patterns used in modern full-stack teams.",
      deliveryType: "VIDEO",
      isPublic: true,
      status: "PUBLISHED",
      salePrice: 149,
      tagKeys: ["react", "javascript", "frontend"],
      sections: [
        {
          title: "React fundamentals",
          lessons: [
            text(
              "Components, props, and JSX",
              `<h2>UI as a function of state</h2>
<pre>function Greeting({ name }) {
  return &lt;h1&gt;Hello, {name}&lt;/h1&gt;;
}</pre>
<p>Break UIs into small, reusable components. Pass data down via props; keep components pure when possible.</p>`,
            ),
            video(
              "State with useState and useEffect",
              "https://www.youtube.com/watch?v=SqcY0GlETPk",
              `<p>Learn when to lift state up, how effects sync with external systems, and why not every variable belongs in state.</p>`,
              840,
            ),
          ],
        },
        {
          title: "Hooks & patterns",
          lessons: [
            text(
              "Custom hooks and context",
              `<h2>Share logic and global state</h2>
<p>Extract repeated effect logic into <code>useSomething</code> hooks. Use Context for theme, auth, or locale — but avoid putting everything in one giant context.</p>`,
            ),
            text(
              "Lists, keys, and performance basics",
              `<h2>Render collections correctly</h2>
<p>Stable <code>key</code> props (IDs, not array index) help React reconcile lists. Memoize expensive calculations with <code>useMemo</code> and callbacks with <code>useCallback</code> only when profiling shows a need.</p>`,
            ),
          ],
        },
        {
          title: "Next.js App Router",
          lessons: [
            text(
              "Routing, layouts, and server components",
              `<h2>File-system routing in Next.js</h2>
<p><code>app/dashboard/page.tsx</code> maps to <code>/dashboard</code>. <code>layout.tsx</code> wraps nested routes. Server Components fetch data on the server by default — mark client interactivity with <code>"use client"</code>.</p>`,
            ),
            text(
              "Data fetching and mutations",
              `<h2>Server actions and Route Handlers</h2>
<p>Use async Server Components + <code>fetch</code> for reads. Use Server Actions or <code>app/api/.../route.ts</code> for writes. Validate input on the server always.</p>`,
            ),
            text(
              "Deploying a Next.js app",
              `<h2>Ship to production</h2>
<ol>
  <li>Environment variables for secrets (<code>.env.local</code>).</li>
  <li>Run <code>npm run build</code> locally to catch errors.</li>
  <li>Deploy to Vercel, Docker, or Node hosting with <code>next start</code>.</li>
  <li>Configure caching, image domains, and HTTPS.</li>
</ol>`,
            ),
          ],
        },
      ],
    },
    {
      courseSlug: slug("fullstack-bootcamp-live"),
      title: "Full-Stack Web Development Bootcamp (Live)",
      description:
        "Live cohort experience: pair programming, code reviews, and Q&A sessions covering HTML/CSS, JavaScript, React, and Node.js. Includes scheduled Google Meet sessions with your instructor.",
      deliveryType: "LIVE_CLASS",
      isPublic: true,
      status: "PUBLISHED",
      tagKeys: ["frontend", "backend", "beginner"],
      sections: [
        {
          title: "Live cohort sessions",
          lessons: [
            live(
              "Week 1 — Kickoff & project setup",
              "https://meet.google.com/pf-webdev-bootcamp-w1",
              liveKickoffStart,
              liveKickoffEnd,
              `<p>Live agenda: introductions, toolchain setup (Node, Git, VS Code), repo structure, and your first commit. Bring questions about HTML/CSS homework.</p>`,
            ),
            live(
              "Week 2 — JavaScript deep dive & code review",
              "https://meet.google.com/pf-webdev-bootcamp-w2",
              new Date(liveKickoffStart.getTime() + 7 * 24 * 60 * 60 * 1000),
              new Date(liveKickoffEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
              `<p>Review DOM projects live, refactor callbacks to async/await, and preview the React module.</p>`,
            ),
          ],
        },
      ],
    },
    {
      courseSlug: slug("nodejs-rest-apis"),
      title: "Node.js & REST API Design",
      description:
        "Private track for enrolled developers: Express.js, REST conventions, JWT authentication, PostgreSQL with Prisma, validation, and error handling — build APIs that frontends and mobile apps can trust.",
      deliveryType: "TEXT",
      isPublic: false,
      status: "PUBLISHED",
      tagKeys: ["backend", "javascript"],
      sections: [
        {
          title: "Express fundamentals",
          lessons: [
            text(
              "Routing and middleware",
              `<h2>Structure an Express app</h2>
<pre>app.get('/api/health', (_req, res) =&gt; res.json({ ok: true }));

app.use('/api/users', usersRouter);</pre>
<p>Middleware runs in order: logging, CORS, auth, then route handlers. Keep routers in separate files.</p>`,
            ),
            text(
              "Validation and error handling",
              `<h2>Consistent API responses</h2>
<p>Return <code>{ ok: true, data }</code> or <code>{ ok: false, message }</code> with proper HTTP status codes. Validate bodies with Zod or similar before touching the database.</p>`,
            ),
          ],
        },
        {
          title: "Auth & databases",
          lessons: [
            text(
              "JWT authentication flow",
              `<h2>Stateless sessions</h2>
<ol>
  <li>POST <code>/login</code> verifies credentials.</li>
  <li>Server signs a JWT with a secret; client stores in httpOnly cookie.</li>
  <li>Protected routes verify the token middleware.</li>
</ol>
<p>Never store passwords in plain text — use bcrypt with a work factor ≥ 10.</p>`,
            ),
            text(
              "Prisma & PostgreSQL patterns",
              `<h2>Data access layer</h2>
<p>Define models in <code>schema.prisma</code>, migrate with <code>prisma migrate</code>, query with type-safe client. Use transactions for multi-step writes.</p>`,
            ),
          ],
        },
      ],
    },
    {
      courseSlug: slug("typescript-draft"),
      title: "TypeScript for Production Apps",
      description:
        "Upcoming course: strict typing, generics, utility types, and integrating TypeScript into React and Node codebases. Enrollments opening soon.",
      deliveryType: "VIDEO",
      isPublic: false,
      status: "DRAFT",
      tagKeys: ["javascript"],
      sections: [
        {
          title: "Coming soon",
          lessons: [{ title: "Course outline (draft)", lessonType: "TEXT", bodyText: "<p>Modules on types, interfaces, and tooling will be published here.</p>", isPublished: false }],
        },
      ],
    },
  ];
}

/** Primary course slug for smoke checks (first published public course). */
const PRIMARY_COURSE_SLUG_SUFFIX = "html-css-fundamentals";

module.exports = {
  WEB_DEV_CATEGORY,
  WEB_DEV_TAGS,
  PRIMARY_COURSE_SLUG_SUFFIX,
  buildWebDevCourses,
};
