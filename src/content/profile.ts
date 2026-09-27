/**
 * ─────────────────────────────────────────────────────────────
 *  PORTFOLIO CONTENT — the only file you need to edit.
 * ─────────────────────────────────────────────────────────────
 *  Everything the site says lives here, separate from the
 *  animation components. Source: CV (Sep 2026) + public GitHub.
 *
 *  Rules of thumb:
 *   • Leave a field as `null` / `[]` if you don't have it yet —
 *     the UI hides anything empty, it never shows placeholders.
 *   • Items marked `TODO(linkedin)` are waiting on details from
 *     LinkedIn that weren't available when this was written.
 */

export type Link = { label: string; href: string }

export type Experience = {
  org: string
  role: string
  /** "Mon YYYY – Mon YYYY" or "Mon YYYY – Present" — parsed for the Explore timeline */
  period: string
  stack: string[]
  points: string[]
  /** Optional emphasis in Explore — all of these can be removed safely. */
  highlight?: {
    /** organisation mark, path under /public (transparent square PNG, see tools/logo_mark.py) */
    logo?: string
    /** accent colour for this mission's gate, timeline bar and dossier */
    accent?: string
    /** short factual badge, e.g. "Big Four", with an optional one-line explanation */
    badge?: { label: string; note?: string }
    /** a quiet personal milestone line in the dossier */
    milestone?: string
    /** a slightly larger, double-ringed gate */
    featured?: boolean
    /** leadership role — current leadership roles get a "Current · Leadership" beacon */
    leadership?: boolean
  }
}

/** One module in a project's system map (Build chapter). `tech` names should match the project's `stack`. */
export type SystemNode = {
  id: string
  label: string
  kind: 'input' | 'external' | 'ui' | 'api' | 'data' | 'model' | 'store' | 'agent' | 'llm' | 'viz' | 'output'
  tech: string[]
  /** what this part does — keep it to what the CV / README actually says */
  note: string
}

export type Project = {
  name: string
  period: string | null
  stack: string[]
  points: string[]
  repo: string | null
  live: string | null
  /**
   * The project drawn as a running system: modules + data-flow edges ([from, to]).
   * Layout is automatic. Set to null to fall back to the build log only.
   */
  system: { nodes: SystemNode[]; edges: [string, string][] } | null
}

/** An image shown in Evolve. Paths are under /public — see tools/optimize_image.py. */
export type Media = { src: string; alt: string; caption: string | null }

/**
 * One entry in the Evolve "release history". Three layouts:
 *  • exhibit  — a headline achievement with media, project, pipeline and stats
 *  • research — a set of research / patent work items with honest status labels
 *  • notes    — smaller creative & extracurricular experiences ("patch notes")
 */
export type Release =
  | {
      layout: 'exhibit'
      id: string
      weight: 'major' | 'minor'
      /** short label on the rail, e.g. "SENSORA 2.0" */
      rail: string
      tag: string
      date: string | null
      title: string
      event: string
      eventNote: string | null
      project: {
        name: string
        description: string
        /** data flow, in order — shown as an animated strip (empty hides it) */
        pipeline: { tech: string; role: string }[]
      } | null
      stats: { label: string; value: string }[]
      /** first image is the hero of the exhibit; empty → a generated visual is shown instead */
      media: Media[]
    }
  | {
      layout: 'research'
      id: string
      weight: 'major' | 'minor'
      rail: string
      tag: string
      title: string
      intro: string | null
      items: {
        label: string
        title: string
        text: string
        /** honest status — shown as a chip */
        status: string
        state: 'published' | 'progress' | 'classified'
        tags: string[]
      }[]
    }
  | {
      layout: 'notes'
      id: string
      weight: 'major' | 'minor'
      rail: string
      tag: string
      title: string
      items: { title: string; text: string; tools: string[]; glyph: 'web' | 'poster' | 'music' }[]
    }

export const profile = {
  name: 'Manoj Kanna J',
  /** Short word rendered huge behind the hero. Keep it ≤ 6 letters. */
  wordmark: 'MANOJ',
  /** One-line identity under the name. Derived from the CV only. */
  tagline: 'CS undergrad building agentic AI systems, ML models and full-stack products.',
  location: 'Chennai, India',
  email: 'manojkannaj8@gmail.com',
  /** Phone intentionally omitted — add here if you want it public. */
  phone: null as string | null,

  links: [
    { label: 'GitHub', href: 'https://github.com/manojkannaj8' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/manojkannaj/' },
  ] satisfies Link[],

  /** Hero statement — each entry is one animated line; the last line renders dimmed. */
  heroHeadline: ['Human ideas.', 'Machine', 'possibilities.'],
  /** Small label above the headline. */
  heroEyebrow: 'Version 2.0 — a more capable me',

  /**
   * The story's chapters — named after the words painted into the hero artwork.
   * `id` is the section anchor; `blurb` is the plain-language description shown alongside;
   * `caption` is a short line under the chapter title (null hides it).
   */
  chapters: [
    { id: 'learn', label: 'Learn', blurb: 'Education & skills', caption: 'The core — and everything that orbits it.' },
    { id: 'build', label: 'Build', blurb: 'Projects', caption: 'Systems I have built — shown running.' },
    { id: 'explore', label: 'Explore', blurb: 'Experience & leadership', caption: 'The route so far — scroll to fly it.' },
    { id: 'evolve', label: 'Evolve', blurb: 'Achievements & contact', caption: 'Every release, a more capable me.' },
  ] as { id: string; label: string; blurb: string; caption: string | null }[],

  // TODO(linkedin): about / summary paragraph
  about: null as string | null,

  education: [
    {
      school: 'SRM Institute of Science and Technology, Ramapuram',
      degree: 'B.Tech in Computer Science and Engineering',
      period: 'Aug 2024 – Present',
      score: { label: 'CGPA', value: 9.35, outOf: 10 },
    },
  ],

  experience: [
    {
      org: 'Deloitte LLP',
      role: 'Summer Intern',
      period: 'Jun 2026 – Aug 2026',
      stack: ['Python', 'Flask', 'React', 'Streamlit', 'CrewAI', 'LangGraph', 'LangFuse', 'AWS', 'Docker'],
      points: [
        'Developed and maintained Flask backends with React and Streamlit frontends, debugging issues and improving code quality.',
        'Built agentic AI workflows using CrewAI and LangGraph, implementing multi-agent systems with tool calling.',
        'Used LangFuse (AgentOps) to monitor latency, token usage, traces and agent performance; deployed applications on AWS EC2, S3 and Lambda using Docker.',
        'Worked with and handled client data.',
      ],
      highlight: {
        logo: '/logos/deloitte.png',
        accent: '#86BC25',
        badge: { label: 'Big Four', note: 'One of the Big Four professional services firms.' },
        milestone: 'Earned my first stipend here.',
        featured: true,
      },
    },
    {
      org: 'Logic Play Technical Club',
      role: 'Technical Head',
      period: 'Aug 2026 – Present',
      stack: [],
      points: [
        "Co-maintain the club's main website and oversee technical initiatives in collaboration.",
        'Plan and coordinate major technical and non-technical events, collaborating with PR, Design and other teams.',
        'Contribute to the Design Team while coordinating cross-functional execution of club activities.',
      ],
      highlight: {
        logo: '/logos/logic-play.png',
        leadership: true,
      },
    },
    {
      org: 'CHiPSET Technical Club',
      role: 'Technical Team Member',
      period: 'Nov 2025 – Aug 2026',
      stack: ['React', 'Supabase', 'GitHub', 'Vercel'],
      points: [
        'Conducted VibeX, a hands-on web development workshop covering React, Supabase, prompt engineering, GitHub and Vercel deployment.',
        'Guided participants during the workshop and debugged application issues during the subsequent VibeX development challenge.',
      ],
    },
  ] satisfies Experience[],

  projects: [
    {
      name: 'DOP-XML',
      period: 'Nov 2025',
      stack: ['Python', 'CatBoost', 'Pandas', 'NumPy', 'Flask', 'SQLAlchemy', 'React'],
      points: [
        'Full-stack dopamine prediction system using a CatBoost classification model, with data preprocessing and feature engineering in Python.',
        'Flask REST API integrated with SQLAlchemy for data persistence and model serving.',
        'React frontend for interactive prediction queries, visualising outputs and enabling user-driven experimentation.',
      ],
      repo: null,
      live: null,
      system: {
        nodes: [
          { id: 'ui', label: 'React frontend', kind: 'ui', tech: ['React'], note: 'Interactive prediction queries — visualises outputs and enables user-driven experimentation.' },
          { id: 'api', label: 'Flask REST API', kind: 'api', tech: ['Flask'], note: 'REST API for model serving, integrated with SQLAlchemy for persistence.' },
          { id: 'features', label: 'Feature pipeline', kind: 'data', tech: ['Python', 'Pandas', 'NumPy'], note: 'Data preprocessing and feature engineering in Python.' },
          { id: 'model', label: 'CatBoost classifier', kind: 'model', tech: ['CatBoost'], note: 'Classification model behind the dopamine predictions.' },
          { id: 'db', label: 'Persistence', kind: 'store', tech: ['SQLAlchemy'], note: 'Data persistence through SQLAlchemy.' },
        ],
        edges: [['ui', 'api'], ['api', 'model'], ['api', 'db'], ['features', 'model']],
      },
    },
    {
      name: 'GitHub Repository Analyser',
      period: 'Feb 2026',
      stack: ['React', 'Vite', 'FastAPI', 'Tailwind CSS', 'D3'],
      points: [
        'Repository analytics platform for GitHub statistics and dependency analysis, with interactive D3 visualisations.',
        'REST APIs and dependency parsing behind a responsive React dashboard.',
        'Real-time GitHub API data fetching through FastAPI for dynamic repository insights.',
      ],
      repo: 'https://github.com/manojkannaj8/repo-analyzer',
      live: 'https://repo-lens-nu.vercel.app',
      system: {
        nodes: [
          { id: 'gh', label: 'GitHub API', kind: 'external', tech: [], note: 'Real-time repository data.' },
          { id: 'api', label: 'FastAPI service', kind: 'api', tech: ['FastAPI'], note: 'REST APIs, dependency parsing and real-time GitHub API fetching.' },
          { id: 'ui', label: 'React dashboard', kind: 'ui', tech: ['React', 'Vite', 'Tailwind CSS'], note: 'Responsive dashboard for repository statistics and insights.' },
          { id: 'viz', label: 'D3 visualisations', kind: 'viz', tech: ['D3'], note: 'Interactive visualisations of repository statistics and dependencies.' },
        ],
        edges: [['gh', 'api'], ['api', 'ui'], ['ui', 'viz']],
      },
    },
    {
      name: 'Multi-Agentic Resume Analyser',
      period: null,
      stack: ['CrewAI', 'Ollama', 'Gemini 2.5', 'Streamlit', 'Python'],
      points: [
        'Multi-agent resume screening tool that analyses resumes against job descriptions, providing skill matching, SWOT analysis, candidate scoring and hiring recommendations.',
      ],
      repo: 'https://github.com/manojkannaj8/Multi-Agentic-Resume-Analyser',
      live: null,
      system: {
        nodes: [
          { id: 'in', label: 'Resume + job description', kind: 'input', tech: [], note: 'Resumes are analysed against job descriptions.' },
          { id: 'ui', label: 'Streamlit app', kind: 'ui', tech: ['Streamlit'], note: 'The screening tool’s interface.' },
          { id: 'crew', label: 'CrewAI agents', kind: 'agent', tech: ['CrewAI', 'Python'], note: 'Multi-agent resume screening.' },
          { id: 'llm', label: 'Language models', kind: 'llm', tech: ['Ollama', 'Gemini 2.5'], note: 'Ollama and Gemini 2.5.' },
          { id: 'out', label: 'Screening output', kind: 'output', tech: [], note: 'Skill matching, SWOT analysis, candidate scoring and hiring recommendations.' },
        ],
        edges: [['in', 'ui'], ['ui', 'crew'], ['crew', 'llm'], ['crew', 'out']],
      },
    },
  ] satisfies Project[],

  skills: {
    Languages: ['Python', 'C', 'Java', 'SQL', 'HTML', 'CSS', 'JavaScript'],
    'Frameworks & Libraries': [
      'React', 'Flask', 'FastAPI', 'Tailwind CSS', 'D3', 'Vite', 'Pandas', 'NumPy',
      'CatBoost', 'XGBoost', 'RandomForest', 'MLP', 'SQLAlchemy', 'SQLite', 'Supabase',
    ],
    Technologies: ['REST APIs', 'Machine Learning', 'Data Analysis', 'Agentic AI', 'AgentOps', 'Version Control'],
    'Cloud & Tools': ['AWS (EC2, S3, Lambda)', 'Docker', 'Git', 'GitHub', 'VS Code', 'Antigravity'],
  } as Record<string, string[]>,

  /**
   * Extra search terms used to trace where a skill was applied (Learn chapter).
   * A skill links to an experience / project / achievement when its name — or one of
   * these aliases — appears in that item's stack or text. Keep aliases literal.
   */
  skillAliases: {
    'AWS (EC2, S3, Lambda)': ['AWS'],
    'Agentic AI': ['agentic', 'multi-agent'],
    'Machine Learning': ['CatBoost', 'ML-based'],
    'Data Analysis': ['data preprocessing', 'analytics'],
    'REST APIs': ['REST API'],
    'Version Control': ['Git', 'GitHub'],
  } as Record<string, string[]>,

  /**
   * Chapter 04 · Evolve — a release history, newest / biggest first.
   * `weight: 'major'` gets full exhibits; `'minor'` renders compact.
   */
  achievements: [
    {
      layout: 'exhibit',
      id: 'sensora',
      weight: 'major',
      rail: 'SENSORA 2.0',
      tag: 'Hackathon · Winner',
      date: 'Sep 2026',
      title: 'Best Implementation Winner',
      event: 'SENSORA 2.0 · VIT Vellore',
      eventNote: '36-hour hardware × software hackathon by the Instrumentation Society of India at graVITas ’26.',
      project: {
        name: 'SurgeGuard',
        description: 'An intelligent queue and crowd management system combining IoT hardware with a software prediction and decision pipeline.',
        pipeline: [
          { tech: 'DroidCam', role: 'Camera feed' },
          { tech: 'YOLO', role: 'Detection' },
          { tech: 'ByteTrack', role: 'Tracking' },
          { tech: 'XGBoost', role: 'Prediction' },
          { tech: 'Decision pipeline', role: 'Decisions' },
          { tech: 'Arduino', role: 'IoT hardware' },
        ],
      },
      stats: [
        { label: 'Award', value: 'Best Implementation' },
        { label: 'Format', value: '36 hours' },
        { label: 'Team', value: 'Ragnaroks Forge' },
        { label: 'Prize', value: '₹8,000' },
      ],
      media: [
        { src: '/achievements/sensora/winning.webp', alt: 'Holding the SENSORA 2.0 Best Implementation Winner board at VIT Vellore', caption: 'Best Implementation — SENSORA 2.0' },
        { src: '/achievements/sensora/command-center.webp', alt: 'SurgeGuard command center dashboard with live detections and a crowd stability report', caption: 'Command center' },
        { src: '/achievements/sensora/live-detection.webp', alt: 'SurgeGuard live camera view tracking people with bounding boxes', caption: 'Live detection & tracking' },
        { src: '/achievements/sensora/hardware.webp', alt: 'Arduino and breadboard hardware used by SurgeGuard', caption: 'IoT hardware' },
      ],
    },
    {
      layout: 'research',
      id: 'research',
      weight: 'major',
      rail: 'Research',
      tag: 'Research · Patents',
      title: 'Patents & publications',
      intro: null,
      items: [
        {
          label: 'Patent work',
          title: 'Patent budget from my college',
          text: 'My college assigned me a patent budget, and I am currently working on patent-related development.',
          status: 'In progress',
          state: 'progress',
          tags: [],
        },
        {
          label: 'Published',
          title: 'DOP-XML',
          text: 'ML-based dopamine prediction research, published as an IEEE conference paper. One of the projects in my patent work.',
          status: 'IEEE conference paper',
          state: 'published',
          tags: ['Machine Learning', 'CatBoost'],
        },
        {
          label: 'Classified',
          title: 'Agentic AI research project',
          text: 'An advanced Agentic AI project being developed toward a patent and an IEEE publication. Details stay under wraps for now.',
          status: 'In development',
          state: 'classified',
          tags: ['Agentic AI', 'Containerized systems'],
        },
      ],
    },
    {
      layout: 'exhibit',
      id: 'celestia',
      weight: 'major',
      rail: 'Celestia 2.0',
      tag: 'Hackathon · Top 6',
      date: null,
      title: 'Top 6 Finalist',
      event: 'Celestia 2.0 · VIT Vellore',
      eventNote: 'Software hackathon.',
      project: {
        name: 'Debug Odyssey',
        description: 'An interactive coding-learning platform with a clean, aesthetic interface.',
        pipeline: [],
      },
      stats: [{ label: 'Placement', value: 'Top 6' }],
      // TODO(owner): add the Debug Odyssey image, e.g.
      // { src: '/achievements/celestia/debug-odyssey.webp', alt: 'Debug Odyssey interface', caption: 'Debug Odyssey' }
      media: [],
    },
    {
      layout: 'notes',
      id: 'creative',
      weight: 'minor',
      rail: 'Creative',
      tag: 'Creative & extracurricular',
      title: 'Beyond the code',
      items: [
        {
          title: 'Freelance web developer',
          text: 'Portfolios, business and full-stack websites for multiple clients.',
          tools: [],
          glyph: 'web',
        },
        {
          title: 'Poster & visual design',
          text: 'Event and team posters in high school; posters, promotional creatives and visual assets for college events, clubs and organisations.',
          tools: ['Adobe Photoshop', 'Canva'],
          glyph: 'poster',
        },
        {
          title: 'DJ & music',
          text: "Handled the DJing and music for my high school's main cultural event.",
          tools: [],
          glyph: 'music',
        },
      ],
    },
  ] as Release[],

  /** Closing contact section (end of Evolve). */
  contact: {
    kicker: 'Open a channel',
    headline: 'Let’s build the next version.',
  },
}

export type Profile = typeof profile
