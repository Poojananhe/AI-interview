export const SUBTOPICS: Record<string, string[]> = {
  'Software Engineering': [
    'Basic Programming & Control Flow', 'Data Structures (Arrays & Strings)', 'Linked Lists & Stacks/Queues',
    'Trees & Graphs', 'Recursion & Dynamic Programming', 'Sorting & Searching Algorithms',
    'Object-Oriented Design & Principles', 'Database Normalization & SQL Queries', 'NoSQL Databases & Use Cases',
    'System Design: Scalability & Load Balancing', 'System Design: Caching & CDNs', 'API Design & REST/GraphQL',
    'Web Protocols: HTTP/HTTPS & WebSockets', 'Authentication: JWT, OAuth & Sessions', 'Concurrency & Multi-threading',
    'Testing: Unit, Integration & E2E', 'Git Workflows & CI/CD Pipelines', 'Cloud Computing & Serverless',
    'Memory Management & Garbage Collection', 'Microservices vs Monoliths'
  ],
  'Data Science': [
    'Basic Statistics & Probability', 'Linear & Logistic Regression', 'Decision Trees & Random Forests',
    'Support Vector Machines (SVM)', 'Neural Networks & Deep Learning', 'Clustering: K-Means & Hierarchical',
    'Dimensionality Reduction: PCA & t-SNE', 'Data Cleaning & Outlier Detection', 'Feature Engineering & Selection',
    'Model Evaluation: ROC, AUC & F1-score', 'A/B Testing & Hypothesis Testing', 'Time Series Forecasting',
    'Natural Language Processing (NLP)', 'Computer Vision Basics', 'SQL for Data Retrieving',
    'Big Data: Spark & Hadoop', 'Regularization: Ridge & Lasso', 'Bias-Variance Tradeoff',
    'Ensemble Learning: Boosting & Bagging', 'Data Visualization & Reporting'
  ],
  'Marketing': [
    'Search Engine Optimization (SEO)', 'Search Engine Marketing (SEM)', 'Social Media Advertising (SMM)',
    'Content Marketing Strategy', 'Email Marketing & Drip Campaigns', 'Conversion Rate Optimization (CRO)',
    'Web Analytics & Google Analytics', 'Brand Strategy & Positioning', 'Customer Acquisition Cost (CAC) & LTV',
    'Marketing Funnel Optimization', 'Public Relations & Press Releases', 'Influencer Marketing Campaigns',
    'Affiliate Marketing Networks', 'Market Research & Competitor Analysis', 'Product Launch Marketing',
    'B2B SaaS Lead Generation', 'Event Marketing & Webinars', 'Customer Segmentation & Personas',
    'Viral Marketing & Word of Mouth', 'Budgeting & Marketing ROI'
  ],
  'Finance': [
    'Financial Statements Linkage', 'Working Capital Management', 'DCF Valuation & WACC',
    'Comparable Companies Analysis (Comps)', 'Precedent Transactions Analysis', 'LBO Modeling Basics',
    'Mergers & Acquisitions (M&A) Concepts', 'Capital Budgeting (NPV & IRR)', 'Corporate Debt & Equity Financing',
    'Cost of Capital & Capital Structure', 'Risk Management & Hedging', 'Portfolio Theory & CAPM',
    'Fixed Income & Bond Valuation', 'Derivatives: Options & Futures', 'Financial Ratios Analysis',
    'Treasury Management & Cash Flow', 'Corporate Governance & Auditing', 'Macroeconomics & Interest Rates',
    'Valuing Early-Stage Startups', 'IPO Process & Underwriting'
  ],
  'HR / Management': [
    'Conflict Resolution & Mediation', 'Performance Review & Feedback Cycles', 'Talent Acquisition & Recruiting',
    'Employee Onboarding & Training', 'Retention Strategies & Workplace Culture', 'Compensation & Benefits Structure',
    'Diversity, Equity & Inclusion (DEI)', 'Handling Underperforming Employees', 'Succession Planning & Promotion',
    'Organizational Restructuring & Layoffs', 'Labor Laws & Compliance', 'Leadership Styles & Management',
    'Goal Setting: OKRs & KPIs', 'Remote Work Policies & Management', 'Employee Burnout & Well-being',
    'Change Management Frameworks', 'Interviewing & Hiring Bias', 'Team Dynamics & Collaboration',
    'Workforce Planning & Budgeting', 'Corporate Social Responsibility (CSR)'
  ]
};

export function getSectionSubtopic(domain: string, sectionNum: number): string {
  const domainKey = Object.keys(SUBTOPICS).find(k => k.toLowerCase().includes(domain.toLowerCase())) || 'Software Engineering';
  const list = SUBTOPICS[domainKey];
  const index = (sectionNum - 1) % list.length;
  return `Section ${sectionNum}: ${list[index]}`;
}
