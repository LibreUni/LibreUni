<div align="center">
  <h1>🎓 LibreUni</h1>
  <p>
    <strong>A free, open-source education platform democratizing high-quality, university-level learning.</strong>
  </p>
  <p>
    No sign-in. No ads. No paywalls. Just serious content for serious learners.
  </p>
  
  [![License](https://img.shields.io/badge/License-Dual-blue.svg)](#-license)
  [![Astro](https://img.shields.io/badge/Astro-0C111A?logo=astro&logoColor=white)](https://astro.build/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![MDX](https://img.shields.io/badge/MDX-1B1F24?logo=mdx&logoColor=white)](https://mdxjs.com/)
</div>

<hr />

## 📖 Table of Contents

- [Philosophy](#-philosophy)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🧠 Philosophy

**Equality of opportunity.**

LibreUni is built on the belief that high-quality, university-level education should be accessible to everyone, everywhere, for free. We prioritize serious content and rigorous learning over gamification, featuring a clean, minimalistic, and professional design.

## ✨ Features

- 📚 **Comprehensive Curriculum:** University-level courses ranging from C/C++ and Git to Machine Learning and Philosophy.
- ⚡ **Interactive Learning:** Built-in interactive components like `<Quiz />` and `<CodeRunner />`.
- 📊 **Rich Content:** Support for KaTeX (mathematical typesetting) and PlantUML (architecture diagrams) within lessons.
- 🚀 **Blazing Fast:** Powered by Astro for static site generation and optimal performance.
- 🌙 **Dark Mode:** First-class dark mode support for late-night study sessions.

## 🛠️ Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **UI Components:** React + Tailwind CSS
- **Content Management:** MDX with custom remark/rehype plugins
- **Diagrams & Math:** PlantUML & KaTeX
- **Validation:** Python scripts for content integrity

## 📂 Project Structure

```text
LibreUni/
├── apps/
│   ├── main/                  # Main LibreUni Astro application
│   │   ├── src/               # Astro pages, components, and course content
│   │   ├── astro.config.mjs
│   │   └── package.json
│   ├── lang/                  # Language-focused static app (non-Astro for now)
│   └── history/               # History-focused static app (non-Astro for now)
├── docs/                      # Technical references (UX vision, PlantUML guide, Rules)
├── scripts/                   # Content and maintenance utilities
├── tools/                     # Shared monorepo build/dev helpers
├── Dockerfile                 # Generic static app builder/runner
└── package.json               # Workspace entrypoint
```

## 🚀 Getting Started

Follow these steps to set up the project locally for development.

### Prerequisites

- Node.js (v18 or higher recommended)
- Python 3.x (for running content validation scripts)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the main Astro site locally:**
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:4321`.

3. **Run a section app locally:**
   ```bash
   npm run dev:lang
   npm run dev:history
   ```

4. **Validate content (Optional but recommended):**
   ```bash
   python3 scripts/course_stats.py
   ```

5. **Build for production:**
   ```bash
    npm run build
    npm run build:lang
    npm run build:history
    ```

`npm run build` defaults to the main site. For source-based deployments you can also select an app with:

```bash
APP=main npm run build
APP=lang npm run build
APP=history npm run build
```

## 🚢 Deployment

### Docker (recommended)

This repository includes a production-ready multi-stage [Dockerfile](Dockerfile) that builds one selected app from the monorepo and serves its generated static files with Nginx.
The runtime includes:

- Static route handling for extensionless HTML routes.
- Long-lived immutable caching for fingerprinted assets.
- Gzip compression for text assets.
- Basic security headers.
- Health endpoint at `/healthz`.

1. **Build and run with Compose:**
   Run base + local override to publish on localhost:8080. By default it serves `apps/main`; override with `APP=lang` or `APP=history` as needed:
   
   ```bash
   APP=main docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
   ```

2. **Open the site:**
   ```text
   http://localhost:8080
   ```

### Coolify setup (source-based)

If you deploy with Coolify and want automatic builds from source, create one service per subdomain and point all of them at the same repository.

Recommended setup:

1. Use **Build Pack: Dockerfile**.
2. Keep repository root as the build context.
3. Set a Docker build arg named `APP`.
4. Use `APP=main` for the main site, `APP=lang` for `lang.libreuni`, and `APP=history` for `history.libreuni`.
5. Set service internal port to **80**.
6. Set healthcheck path to `/healthz`.

If you prefer Coolify's source/static flow instead of Docker:

1. Keep the repository root as the base directory.
2. Use `npm install` as the install command.
3. Use `APP=<app-name> npm run build` as the build command.
4. Publish `apps/<app-name>/dist` as the static output directory.

Note: the base [docker-compose.yml](docker-compose.yml) intentionally does not bind a host port to avoid collisions on shared servers. Local host binding is defined in [docker-compose.local.yml](docker-compose.local.yml).
This keeps all LibreUni sections in one repository while letting each app choose its own frontend stack as long as it outputs a static `dist/`.

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing a typo, adding a new lesson, or improving the platform's features, your help is appreciated.

**Before you start:**
Please read our [RULES.md](docs/RULES.md) carefully. It contains the complete set of rules for lesson structure, writing style, and quality standards that ensure LibreUni maintains its rigorous, professional tone.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under a Dual License - see the [LICENSE](LICENSE) file for complete details on open source usage and commercial restrictions.
