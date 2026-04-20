import json
import os

careers_dir = "src/content/careers"

details_map = {
    "ai-specialist.json": {
        "importance": "AI specialists are shaping the future of interacting with computers, driving advancements in medicine, automation, and data analysis.",
        "rolesAndResponsibilities": "Designing, training, and deploying neural networks and machine learning models to solve complex real-world problems.",
        "aiImpact": "While AI automates many tasks, the creation, oversight, and ethical steering of these models will remain a deeply specialized human necessity.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "$100k - $140k", "mid": "$150k - $220k", "senior": "$220k - $400k+" },
            { "region": "Europe", "period": "Monthly", "junior": "€4k - €6k", "mid": "€6k - €10k", "senior": "€10k - €18k+" },
            { "region": "India", "period": "Annual", "junior": "₹8L - ₹15L", "mid": "₹15L - ₹35L", "senior": "₹35L - ₹80L+" }
        ],
        "marketDemand": "Extremely high. A massive shortage of legitimate mathematical and architectural talent exists in the industry.",
        "peopleCount": "Estimated ~300,000 globally in dedicated research and engineering roles.",
        "topCompanies": ["OpenAI", "DeepMind", "Google (Brain)", "Anthropic", "Meta"],
        "prominentFigures": ["Geoffrey Hinton", "Ian Goodfellow", "Yann LeCun", "Ilya Sutskever"],
        "expectations": {
            "junior": "Assist with data pipelines, run experiments under supervision, and fine-tune existing models.",
            "mid": "Design custom architectures, optimize training loops, and deploy models to production efficiently.",
            "senior": "Lead research directions, invent novel network topologies, and architect large-scale distributed training clusters."
        }
    },
    "data-scientist.json": {
        "importance": "They translate vast oceans of raw data into actionable strategies, saving resources and highlighting hidden opportunities.",
        "rolesAndResponsibilities": "Performing statistical analysis, building predictive models, and communicating insights to non-technical stakeholders.",
        "aiImpact": "AI can automate standard reporting, but asking the right questions and formulating the hypothesis requires deep business and statistical intuition.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "$85k - $120k", "mid": "$130k - $180k", "senior": "$180k - $250k+" },
            { "region": "Europe", "period": "Monthly", "junior": "€3.5k - €5.5k", "mid": "€5.5k - €8k", "senior": "€8k - €12k+" },
            { "region": "India", "period": "Annual", "junior": "₹7L - ₹12L", "mid": "₹12L - ₹25L", "senior": "₹25L - ₹60L+" }
        ],
        "marketDemand": "High. Almost every major industry requires dedicated data science teams today.",
        "peopleCount": "Estimated ~1.5 million globally.",
        "topCompanies": ["Airbnb", "Uber", "Spotify", "Netflix", "JP Morgan"],
        "prominentFigures": ["Trevor Hastie", "Wes McKinney", "Cathy O'Neil", "DJ Patil"],
        "expectations": {
            "junior": "Clean and preprocess data, build simple regression/classification models, and generate straightforward reports.",
            "mid": "Own end-to-end data pipelines, mentor juniors, and develop complex predictive engines.",
            "senior": "Define organizational data strategies, align modeling with core business metrics, and evangelize data literacy."
        }
    },
    "engineering-manager.json": {
        "importance": "They are the multipliers. A great EM transforms a group of talented individuals into an unstoppable, cohesive engine of delivery.",
        "rolesAndResponsibilities": "Hiring, mentoring, managing delivery timelines, resolving conflicts, and acting as the bridge between technical and business domains.",
        "aiImpact": "Minimal. Management deals primarily with human psychology, motivation, and complex, ambiguous organizational politics—areas where AI falls flat.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "$140k - $180k", "mid": "$170k - $250k", "senior": "$250k - $450k+" },
            { "region": "Europe", "period": "Monthly", "junior": "€5.5k - €7.5k", "mid": "€7.5k - €11k", "senior": "€11k - €18k+" },
            { "region": "India", "period": "Annual", "junior": "₹20L - ₹35L", "mid": "₹35L - ₹60L", "senior": "₹60L - ₹1.2Cr+" }
        ],
        "marketDemand": "Very high. Highly capable engineers often struggle with leadership, making good managers a rare commodity.",
        "peopleCount": "Estimated ~500,000 globally.",
        "topCompanies": ["Apple", "Stripe", "Amazon", "Microsoft", "Shopify"],
        "prominentFigures": ["Will Larson", "Camille Fournier", "Andy Grove", "Gergely Orosz"],
        "expectations": {
            "junior": "Manage a small team (3-5 engineers), conduct 1:1s, and ensure sprint goals are hit.",
            "mid": "Manage larger teams (5-12), handle performance reviews, lead hiring, and shape technical roadmaps.",
            "senior": "Director-level (managing managers), defining organizational structures, and managing budgets."
        }
    },
    "security-expert.json": {
        "importance": "They guard the world's infrastructure, financial systems, and private data against ever-evolving malicious adversaries.",
        "rolesAndResponsibilities": "Penetration testing, cryptography implementation, system auditing, and incident response.",
        "aiImpact": "AI will aid in anomaly detection and automate basic patching, but defending against complex, novel (zero-day) exploits requires human ingenuity.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "$90k - $130k", "mid": "$135k - $190k", "senior": "$190k - $300k+" },
            { "region": "Europe", "period": "Monthly", "junior": "€3.5k - €5.5k", "mid": "€5.5k - €8.5k", "senior": "€8.5k - €14k+" },
            { "region": "India", "period": "Annual", "junior": "₹6L - ₹12L", "mid": "₹12L - ₹28L", "senior": "₹28L - ₹65L+" }
        ],
        "marketDemand": "Critically high. The cost of data breaches has forced companies to invest heavily in security.",
        "peopleCount": "Estimated ~3 million globally.",
        "topCompanies": ["CrowdStrike", "Cloudflare", "Palo Alto Networks", "Mandiant", "NSA"],
        "prominentFigures": ["Bruce Schneier", "Kevin Mitnick", "Ross Anderson", "Troy Hunt"],
        "expectations": {
            "junior": "Monitor alerting systems, perform standard vulnerability scans, and write post-mortem reports.",
            "mid": "Conduct deep penetration tests, design secure SDLC pipelines, and manage bug bounty programs.",
            "senior": "Design enterprise-wide security architectures, handle crisis negotiations during massive breaches, and define cryptographic standards."
        }
    },
    "software-architect.json": {
        "importance": "They ensure systems are scalable, maintainable, and built to survive years of changing requirements without collapsing under technical debt.",
        "rolesAndResponsibilities": "Designing system topologies, choosing technology stacks, defining communication protocols, and writing core foundational code.",
        "aiImpact": "Low. AI writes tactical code well, but struggles with large-scale strategic decisions involving trade-offs like eventual consistency vs immediate consistency.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "N/A", "mid": "$160k - $220k", "senior": "$200k - $400k+" },
            { "region": "Europe", "period": "Monthly", "junior": "N/A", "mid": "€6.5k - €9.5k", "senior": "€9.5k - €16k+" },
            { "region": "India", "period": "Annual", "junior": "N/A", "mid": "₹30L - ₹55L", "senior": "₹55L - ₹1.5Cr+" }
        ],
        "marketDemand": "Moderate but highly specialized. Every mid-to-large company needs them, but openings are fewer than standard software engineers.",
        "peopleCount": "Estimated ~400,000 globally.",
        "topCompanies": ["Amazon (AWS)", "Google (GCP)", "Microsoft (Azure)", "Netflix", "Uber"],
        "prominentFigures": ["Martin Fowler", "Martin Kleppmann", "Sam Newman", "Uncle Bob (Robert C. Martin)"],
        "expectations": {
            "junior": "There is no 'junior' architect. Progresses from Senior Engineer.",
            "mid": "Design microservices, standardize databases, and guide teams on architectural best practices.",
            "senior": "Design multi-region, high-availability platforms handling petabytes of data with zero-downtime tolerance."
        }
    },
    "systems-engineer.json": {
        "importance": "They build the lower levels of the tech stack—compilers, OS kernels, database engines, and browsers—that all other software fundamentally relies on.",
        "rolesAndResponsibilities": "Writing low-level, highly optimized C/C++/Rust code, managing memory manually, and tuning hardware interactions.",
        "aiImpact": "Moderate. AI can optimize specific algorithms, but low-level hardware orchestration and legacy system maintenance remain human-dominated.",
        "salary": [
            { "region": "United States", "period": "Annual", "junior": "$95k - $140k", "mid": "$145k - $200k", "senior": "$200k - $350k+" },
            { "region": "Europe", "period": "Monthly", "junior": "€4k - €6k", "mid": "€6k - €9k", "senior": "€9k - €13k+" },
            { "region": "India", "period": "Annual", "junior": "₹8L - ₹14L", "mid": "₹14L - ₹30L", "senior": "₹30L - ₹70L+" }
        ],
        "marketDemand": "Steady. Not as explosive as web development, but completely vital for infrastructure giants.",
        "peopleCount": "Estimated ~800,000 globally.",
        "topCompanies": ["NVIDIA", "Intel", "AMD", "Linux Foundation", "Apple"],
        "prominentFigures": ["Linus Torvalds", "John Carmack", "Brendan Gregg", "Brian Kernighan"],
        "expectations": {
            "junior": "Write device drivers, optimize specific algorithms, and fix memory leaks.",
            "mid": "Design concurrent systems, architect embedded software, and tune deep performance bottlenecks.",
            "senior": "Architect entirely new file systems, maintain complex standard libraries, and write programming language compilers."
        }
    }
}

for filename, details in details_map.items():
    filepath = os.path.join(careers_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        data['details'] = details
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

print("Careers patched successfully.")
