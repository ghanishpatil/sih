// ── Brand / identity (single source of truth) ────────────────────────────────
// Consumed by usePageSeo, Navbar, Footer, every public page and the admin
// surfaces. Change it here and it cascades everywhere.
export const APP = {
  name: 'Internal Smart India Hackathon',
  shortName: 'Internal SIH',
  university: 'Sanjivani University',
  // Used in copy like "a platform for {region}". This is a university-internal
  // qualifier, so the scope is the university itself.
  region: 'Sanjivani University',
  parentEvent: 'Smart India Hackathon',
  tagline: 'Sanjivani University’s internal qualifier for the Smart India Hackathon',
  contactEmail: 'sih@sanjivani.edu.in',
  contactPhone: '+91 74983 11334',
  venue: 'Sanjivani University Innovation Campus',
  // Brand mark (SIH wordmark). Lives at `frontend/public/sih-logo.png`; every
  // surface reads it from here via the BrandLogo component.
  logo: '/sih-logo.png',
  // Host institution mark, shown alongside the event logo in the navbar.
  universityLogo: '/sanjivani-logo.png',
}

// Official social/community accounts. These are live external handles — update
// them here if the accounts themselves are ever renamed.
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/skhackathon.su?igsh=ZjByZnRlc2t1ZTg3',
  twitter: 'https://x.com/skhackathon',
  linkedin: 'https://www.linkedin.com/company/smart-kopargaon-hackathon/',
  github: 'https://github.com/smartkopargaonhackathon-su',
  whatsapp: 'https://whatsapp.com/channel/0029VbBnF0wGk1FvfjRRqh3G',
}

// Student coordinators & team leaders — shown in the footer and Contact page.
export const COORDINATORS = {
  coordinators: [
    { name: 'Ashish Pardeshi', email: 'ashish.pardeshi24@sanjivani.edu.in', role: 'Student Coordinator' },
    { name: 'Avani Kulkarni', email: 'avani.kulkarni24@sanjivani.edu.in', role: 'Student Coordinator' },
  ],
  leaders: [
    { name: 'Atharva Deshmukh', phone: '7517647277' },
    { name: 'Saifullah Pathan', phone: '7219502062' },
    { name: 'Soham Kadu', phone: '9021538647', role: 'Hospitality Head' },
  ],
}

// External UMS event-registration portal (Sanjivani University).
// Single source of truth used by the hero CTA, auth page, and How to Register page.
export const REGISTRATION_URL = 'https://ums.sanjivani.edu.in//EventRegistration/D0712D97-8DF'

// ── Problem-statement taxonomy (shared source of truth) ──────────────────────
// A problem statement has a CATEGORY (Software / Hardware) and a THEME (subject area).
export const PS_CATEGORIES = ['Software', 'Hardware']
export const PS_THEMES = [
  'Miscellaneous',
  'Fintech',
  'Smart Automation',
  'Fitness & Sports',
  'Space Technology',
  'Heritage & Culture',
  'MedTech / BioTech / HealthTech',
  'Agriculture, FoodTech & Rural Development',
  'Smart Vehicles',
  'Transportation & Logistics',
  'Robotics & Drones',
  'Clean & Green Technology',
  'Renewable / Sustainable Energy',
  'Disaster Management',
  'Smart Education',
  'Travel & Tourism',
  'Blockchain & Cybersecurity',
]

// Landing-page theme cards. `icon` is any lucide-react icon name (resolved
// dynamically with a Circle fallback in TracksSection).
export const TRACKS = [
  { id: 'miscellaneous', title: 'Miscellaneous', description: 'Bold ideas that cut across categories and solve real-world problems.', icon: 'Shapes' },
  { id: 'fintech', title: 'Fintech', description: 'Payments, lending, financial inclusion, and next-gen banking experiences.', icon: 'CircleDollarSign' },
  { id: 'smart-automation', title: 'Smart Automation', description: 'Industrial and everyday automation powered by sensors, AI, and control systems.', icon: 'Cpu' },
  { id: 'fitness-sports', title: 'Fitness & Sports', description: 'Athlete performance, wellness tracking, and technology for active lifestyles.', icon: 'Dumbbell' },
  { id: 'space-technology', title: 'Space Technology', description: 'Satellites, geospatial data, and solutions inspired by space science.', icon: 'Rocket' },
  { id: 'heritage-culture', title: 'Heritage & Culture', description: 'Preserving, digitizing, and celebrating art, history, and culture.', icon: 'Landmark' },
  { id: 'medtech', title: 'MedTech / BioTech / HealthTech', description: 'Diagnostics, devices, and platforms advancing healthcare and life sciences.', icon: 'HeartPulse' },
  { id: 'agri-foodtech', title: 'Agriculture, FoodTech & Rural Development', description: 'Farming intelligence, food systems, and rural empowerment.', icon: 'Sprout' },
  { id: 'smart-vehicles', title: 'Smart Vehicles', description: 'Connected, electric, and autonomous mobility solutions.', icon: 'Car' },
  { id: 'transportation-logistics', title: 'Transportation & Logistics', description: 'Supply chains, fleet routing, and intelligent movement of goods and people.', icon: 'Truck' },
  { id: 'robotics-drones', title: 'Robotics & Drones', description: 'Autonomous machines, drones, and robotics for real-world tasks.', icon: 'Bot' },
  { id: 'clean-green-tech', title: 'Clean & Green Technology', description: 'Sustainability, emissions reduction, and circular-economy innovation.', icon: 'Leaf' },
  { id: 'renewable-energy', title: 'Renewable / Sustainable Energy', description: 'Solar, wind, storage, and smarter energy management.', icon: 'Sun' },
  { id: 'disaster-management', title: 'Disaster Management', description: 'Early warning, response coordination, and resilience for communities.', icon: 'Siren' },
  { id: 'smart-education', title: 'Smart Education', description: 'Learning outcomes, accessibility, and technology for students and teachers.', icon: 'GraduationCap' },
  { id: 'travel-tourism', title: 'Travel & Tourism', description: 'Discovery, experiences, and technology for travelers and destinations.', icon: 'Plane' },
  { id: 'blockchain-cybersecurity', title: 'Blockchain & Cybersecurity', description: 'Trust, security, and decentralized systems for a safer digital world.', icon: 'ShieldCheck' },
]

export const TIMELINE = [
  { phase: 'Registration Opens', date: 'Jun 1, 2026', status: 'live' },
  { phase: 'Problem Statements Live', date: 'Jun 15, 2026', status: 'upcoming' },
  { phase: 'Idea Screening', date: 'Jul 1, 2026', status: 'upcoming' },
  { phase: 'Grand Hackathon', date: 'Aug 20–22, 2026', status: 'upcoming' },
  { phase: 'Showcase & Awards', date: 'Aug 23, 2026', status: 'upcoming' },
]

export const SPONSORS = [
  { name: 'District Administration', tier: 'host' },
  { name: 'Industry Consortium', tier: 'platinum' },
  { name: 'Innovation Council', tier: 'gold' },
  { name: 'Startup Hub Nashik', tier: 'silver' },
]

export const FAQ_ITEMS = [
  {
    q: 'Who can participate?',
    a: 'Students from recognized institutions may form teams. Cross-disciplinary teams are encouraged, and each participant must carry a valid college/institute ID.',
  },
  {
    q: 'What is the team size?',
    a: 'Each team must have 2 to 4 members, including one team leader. Check the registration page for the current requirements.',
  },
  {
    q: 'How do we register?',
    a: 'Registration is done on the Sanjivani University UMS portal — see the "How to Register" page for the step-by-step guide. Once your team is registered, the team leader receives dashboard login credentials by email within 24 to 48 hours.',
  },
  {
    q: 'Is there a registration fee?',
    a: 'Yes, the registration fee is ₹600 per team (not per person). Payment must be completed before the registration deadline to confirm your team\'s spot.',
  },
  {
    q: 'Which themes can we work on?',
    a: 'There are 17 themes spanning Fintech, Smart Automation, MedTech/BioTech/HealthTech, Space Technology, Robotics & Drones, Clean & Green Technology, Blockchain & Cybersecurity, and more. Each problem statement is also tagged as a Software or Hardware category. Browse the Problem Statements page to choose one.',
  },
  {
    q: 'How are submissions evaluated?',
    a: 'A jury panel scores innovation, feasibility, real-world impact, and demo quality using a structured rubric, with each criterion scored independently. Top teams are shortlisted to represent Sanjivani University at the national Smart India Hackathon.',
  },
]

export const STATS = [
  { label: 'Problem Themes', value: '17' },
  { label: 'Expected Teams', value: '250+' },
  { label: 'Partner Departments', value: '12+' },
  { label: 'Mentor Hours', value: '2k+' },
]
