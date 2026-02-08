import base64
import os

# Configuration
base_dir = "/Users/master/Downloads/Securetag Agent/docs/presentation"
logo_path = os.path.join(base_dir, "Aegis logo.png")
output_path = os.path.join(base_dir, "Aegis Investment.html")

# 1. Read and Encode Logo
try:
    with open(logo_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        logo_base64 = f"data:image/png;base64,{encoded_string}"
except FileNotFoundError:
    print(f"Error: Logo file not found at {logo_path}")
    logo_base64 = "" # Fallback or placeholder

# 1.1 Read and Encode Additional Images
images_base64 = {}
image_files = {
    "hecho_en_mexico": "hechoenmexico.png",
    "colombia": "co.png",
    "mexico": "mx.png",
    "el_salvador": "sv.png",
    "usa": "us.png",
    "jordan": "jordan.jpg",
    "cybercrime": "cybercrime.jpg",
    "healthcare": "healthcare.jpg",
    "telecom": "telecom.jpg"
}

for key, filename in image_files.items():
    path = os.path.join(base_dir, filename)
    try:
        with open(path, "rb") as image_file:
            encoded = base64.b64encode(image_file.read()).decode('utf-8')
            ext = "jpeg" if filename.endswith(('.jpg', '.jpeg')) else "png"
            images_base64[key] = f"data:image/{ext};base64,{encoded}"
    except FileNotFoundError:
        print(f"Error: File not found at {path}")
        images_base64[key] = ""

# 2. Define Content (English, Global Focus)
# News Items (10 Gov, 10 Ent, incl. 2 Mexico)
news_items = [
    # Government (10)
    {
        "date": "Jan 2025", 
        "title": "Taiwan: 2.4M Daily Attacks", 
        "desc": "Chinese groups target govt & telecom infrastructure. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Nov 2024", 
        "title": "Mexico: Govt Infra Hit", 
        "desc": "Major cyberattack paralyzed govt infrastructure on Nov 15. (Infobae)",
        "link": "https://catsanet.com.mx/ciberataques-al-gobierno-mexicano-2024/",
        "image_key": "mexico"
    }, # Mexico Gov
    {
        "date": "Dec 2024", 
        "title": "US Treasury Breach", 
        "desc": "Salt Typhoon group exploited BeyondTrust software. (Picus)",
        "link": "https://www.picussecurity.com/resource/blog/the-major-cyber-breaches-and-attack-campaigns-of-2024",
        "image_key": "usa"
    },
    {
        "date": "Jan 2025", 
        "title": "Ukraine: +70% Attacks", 
        "desc": "Russian cyberattacks on critical infra surged in 2024. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Oct 2025", 
        "title": "UK MoD Contractor", 
        "desc": "4TB of military data stolen from Dodd Group. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Jan 2025", 
        "title": "Italy: Govt Websites", 
        "desc": "Pro-Russian group targets ministries & transport. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Aug 2025", 
        "title": "Norway: Dam Attack", 
        "desc": "Russia attributed to cyberattack on Bremanger dam. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Aug 2025", 
        "title": "Canada: Parliament", 
        "desc": "House of Commons attack exposed employee data. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Feb 2025", 
        "title": "China: 1,300 Attacks", 
        "desc": "Foreign APTs targeted 14 key sectors in China. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "2025", 
        "title": "Global: 16B Leak", 
        "desc": "Mega leak exposed 16 billion credentials, incl. govt. (CM Alliance)",
        "link": "https://www.cm-alliance.com/cybersecurity-blog/biggest-cyber-attacks-of-2025-their-impact-on-global-cybersecurity",
        "image_key": None
    },

    # Enterprise (10)
    {
        "date": "2025", 
        "title": "Global: $10.5 Trillion", 
        "desc": "Annual cybercrime cost reaches historic peak. (Cybersecurity Ventures)",
        "link": "https://www.cybersecurityventures.com/hackerpocalypse-cybercrime-report-2016/",
        "image_key": "cybercrime"
    },
    {
        "date": "2024", 
        "title": "Mexico: 39% Firms Hit", 
        "desc": "Nearly 40% of Mexican companies attacked in 2024. (KPMG)",
        "link": "https://comunicacionsocial.diputados.gob.mx/revista/index.php/pluralidad/esta-nublado-y-con-pronostico-de-ciberataque-desafios-y-estrategia-ante-el-cibercrimen-en-mexico",
        "image_key": "mexico"
    }, # Mexico Ent
    {
        "date": "Feb 2024", 
        "title": "Change Healthcare", 
        "desc": "$2.87B impact from ransomware on US healthcare. (CM Alliance)",
        "link": "https://www.cm-alliance.com/cybersecurity-blog/top-10-biggest-cyber-attacks-of-2024-25-other-attacks-to-know-about",
        "image_key": "healthcare"
    },
    {
        "date": "May 2024", 
        "title": "Snowflake Breach", 
        "desc": "100+ customers hit including Ticketmaster, Santander. (CM Alliance)",
        "link": "https://www.cm-alliance.com/cybersecurity-blog/top-10-biggest-cyber-attacks-of-2024-25-other-attacks-to-know-about",
        "image_key": None
    },
    {
        "date": "Sep 2025", 
        "title": "Aviation Grounded", 
        "desc": "Ransomware hit Heathrow, Brussels, Berlin. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Sep 2025", 
        "title": "Jaguar Land Rover", 
        "desc": "£1.9B cost from ransomware halting UK manufacturing. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "Apr 2025", 
        "title": "Marks & Spencer", 
        "desc": "Retailer crippled by ransomware over Easter. (CM Alliance)",
        "link": "https://www.cm-alliance.com/cybersecurity-blog/biggest-cyber-attacks-of-2025-their-impact-on-global-cybersecurity",
        "image_key": None
    },
    {
        "date": "Sep 2025", 
        "title": "Salesforce Leak", 
        "desc": "Billions of records exposed via OAuth integration. (CSIS)",
        "link": "https://www.csis.org/programs/strategic-technologies-program/significant-cyber-incidents",
        "image_key": None
    },
    {
        "date": "2024", 
        "title": "Telecom Giants", 
        "desc": "Salt Typhoon breaches AT&T, Verizon, T-Mobile. (Picus)",
        "link": "https://www.picussecurity.com/resource/blog/the-major-cyber-breaches-and-attack-campaigns-of-2024",
        "image_key": "telecom"
    },
    {
        "date": "2025", 
        "title": "SMEs: 43% Targeted", 
        "desc": "Small businesses face nearly half of all cyberattacks. (Forbes)",
        "link": "https://www.forbes.com/sites/chuckbrooks/2022/01/21/cybersecurity-in-2022--a-fresh-look-at-some-very-alarming-stats/",
        "image_key": None
    },
]

# 2.2 Construct Newspaper Layout HTML
lead_story = news_items[10] # $10.5 Trillion

# Prepare HTML for Left Column (International Briefs - 7 items)
left_column_html = ""
left_indices = [0, 3, 4, 5, 6, 7, 9, 8] 
for i in left_indices:
    item = news_items[i]
    img_tag = ""
    if item['image_key'] and item['image_key'] in images_base64:
         img_tag = f'<div class="w-10 h-8 bg-slate-200 flex-shrink-0 border border-slate-300 overflow-hidden"><img src="{images_base64[item["image_key"]]}" class="w-full h-full object-cover grayscale"></div>'

    left_column_html += f"""
        <article class="border-b border-slate-300 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0 flex-1 flex flex-col justify-center group">
            <div class="flex gap-2 items-start h-full items-center">
                <div class="flex-1">
                    <h4 class="font-bold text-[10px] lg:text-xs leading-tight mb-0.5 hover:text-red-800 transition-colors">
                        <a href="{item['link']}" target="_blank">{item['title']}</a>
                    </h4>
                    <div class="flex items-center gap-2 mb-0.5">
                         <span class="text-[9px] font-sans font-bold text-slate-500 uppercase">{item['date']}</span>
                         <span class="text-[9px] font-sans text-slate-400 uppercase">CSIS</span>
                    </div>
                    <p class="text-[9px] lg:text-[10px] text-slate-700 font-serif leading-snug line-clamp-2">{item['desc']}</p>
                </div>
                {img_tag}
            </div>
        </article>
    """

# Prepare HTML for Right Column (Enterprise Watch - 6 items)
right_column_html = ""
right_indices = [13, 14, 15, 16, 17, 19, 11]
for i in right_indices:
    item = news_items[i]
    img_tag = ""
    if item['image_key'] and item['image_key'] in images_base64:
         img_tag = f'<div class="w-10 h-8 bg-slate-200 flex-shrink-0 border border-slate-300 overflow-hidden"><img src="{images_base64[item["image_key"]]}" class="w-full h-full object-cover grayscale"></div>'
    
    right_column_html += f"""
        <article class="border-b border-slate-300 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0 group flex-1 flex flex-col justify-center">
            <div class="flex gap-2 items-start h-full items-center">
                <div class="flex-1">
                    <h4 class="font-bold text-[10px] lg:text-xs leading-tight mb-0.5 group-hover:text-blue-800 transition-colors">
                        <a href="{item['link']}" target="_blank">{item['title']}</a>
                    </h4>
                    <p class="text-[9px] lg:text-[10px] text-slate-600 font-serif line-clamp-2">{item['desc']}</p>
                </div>
                {img_tag}
            </div>
        </article>
    """

# Prepare HTML for Center Sub-Stories (Grid - 6 items)
center_sub_html = ""
center_indices = [1, 2, 12, 18] 
for idx in center_indices:
    item = news_items[idx]
    
    if item['image_key'] and item['image_key'] in images_base64:
        img_content = f'<img src="{images_base64[item["image_key"]]}" class="w-full h-16 object-cover filter grayscale hover:grayscale-0 transition-all duration-500">'
    else:
        img_content = """
        <div class="w-full h-16 bg-slate-200 flex items-center justify-center border border-slate-300 text-slate-400">
            <span class="text-[8px] font-sans font-bold uppercase tracking-widest">[IMG]</span>
        </div>
        """
    
    center_sub_html += f"""
        <article class="flex flex-col h-full border border-slate-200 p-2 shadow-sm bg-white">
            <div class="mb-2">
                {img_content}
            </div>
            <h4 class="text-xs font-bold leading-tight mb-1 font-serif line-clamp-2">
                <a href="{item['link']}" target="_blank">{item['title']}</a>
            </h4>
            <p class="text-[10px] text-slate-700 font-serif leading-relaxed line-clamp-4">{item['desc']}</p>
        </article>
    """

news_html = f"""
    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-grow h-full min-h-0">
        
        <!-- Left Column (Narrow - 3 cols) -->
        <div class="lg:col-span-3 lg:border-r border-slate-300 lg:pr-4 flex flex-col h-full">
             <h3 class="font-sans font-bold text-[9px] uppercase border-b-2 border-slate-900 mb-2 pb-1 shrink-0">International Briefs</h3>
             <div class="flex flex-col gap-3">
                {left_column_html}
             </div>
        </div>

        <!-- Center Column (Wide - Lead Story - 6 cols) -->
        <div class="lg:col-span-6 px-0 lg:px-4 flex flex-col h-full">
             <!-- Lead Story -->
             <article class="text-center mb-4 shrink-0">
                 <h2 class="text-2xl lg:text-4xl font-black italic leading-tight mb-2 hover:underline decoration-2 underline-offset-4 decoration-red-800">
                    <a href="{lead_story['link']}" target="_blank">{lead_story['title']}</a>
                 </h2>
                 
                 <div class="flex justify-center items-center gap-2 text-[9px] font-sans font-bold text-slate-500 uppercase mb-3">
                    <span>By Cybersecurity Ventures</span>
                    <span>•</span>
                    <span>12 MIN READ</span>
                 </div>

                 <!-- Flex Container for Lead Story Content -->
                 <div class="flex flex-col gap-4 items-center text-left h-auto">
                     <!-- Image -->
                     <div class="w-full h-48 lg:h-56 bg-slate-200 flex flex-col items-center justify-center text-slate-400 border border-slate-300 relative overflow-hidden group cursor-pointer shrink-0">
                        {f'<img src="{images_base64[lead_story["image_key"]]}" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700">' if lead_story['image_key'] and lead_story['image_key'] in images_base64 else '<span class="text-4xl mb-2">📷</span>'}
                        <div class="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/0 transition-all"></div>
                     </div>
                     
                     <!-- Lead Text -->
                     <div class="w-full font-serif text-xs lg:text-sm leading-relaxed text-slate-800 text-justify columns-2 gap-6">
                        <p class="mb-0">{lead_story['desc']} The sheer scale of this figure represents the greatest transfer of economic wealth in history. Experts warn that traditional defenses are failing against AI-driven threats.</p>
                     </div>
                 </div>
             </article>
             
             <!-- Secondary Stories (Horizontal Grid) -->
             <div class="border-t-2 border-slate-900 pt-3 mt-auto">
                 <div class="grid grid-cols-2 gap-4">
                     {center_sub_html}
                 </div>
             </div>
        </div>

        <!-- Right Column (Narrow - 3 cols) -->
        <div class="lg:col-span-3 lg:border-l border-slate-300 lg:pl-4 flex flex-col h-full">
             <h3 class="font-sans font-bold text-[9px] uppercase border-b-2 border-slate-900 mb-2 pb-1 shrink-0">Enterprise Watch</h3>
             <div class="flex flex-col gap-3">
                {right_column_html}
             </div>
        </div>
    </div>
"""

# 3. Construct Full HTML
html_content = f"""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aegis Ciberseguridad - Global Investment</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {{
            darkMode: 'class',
            theme: {{
                extend: {{
                    fontFamily: {{
                        sans: ['Inter', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    }},
                    colors: {{
                        slate: {{
                            950: '#020617',
                        }},
                        aegis: {{
                            blue: '#5227FF',
                            pink: '#FF9FFC',
                            dark: '#0f172a'
                        }}
                    }},
                    backgroundImage: {{
                        'brand-gradient': 'linear-gradient(135deg, #020617 0%, #0f172a 60%, rgba(82, 39, 255, 0.15) 100%)',
                        'card-gradient': 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(30, 41, 59, 0.2) 100%)',
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{
            background-color: #020617;
            background-image: 
                radial-gradient(circle at 10% 10%, rgba(82, 39, 255, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 90% 90%, rgba(255, 159, 252, 0.1) 0%, transparent 40%);
            color: #f8fafc;
            min-height: 100vh;
        }}
        .glass-card {{
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}
        .text-gradient-brand {{
            background: linear-gradient(to right, #5227FF, #FF9FFC);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .page-break {{
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem 1.5rem;
            position: relative;
            overflow: hidden;
        }}
        @media (min-width: 1024px) {{
            .page-break {{
                height: 100vh;
                padding: 4rem;
            }}
        }}
        .terminal-window {{
            background: #0f172a;
            border-radius: 8px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            border: 1px solid #334155;
            font-family: 'Courier New', Courier, monospace;
            overflow: hidden;
            position: absolute;
            bottom: 2rem;
            right: 2rem;
            width: 90%;
            max-width: 400px;
            opacity: 0.8;
            z-index: 20;
            transform: rotate(-2deg);
            transition: transform 0.3s ease;
        }}
        @media (max-width: 1024px) {{
            .terminal-window {{
                position: relative;
                bottom: auto;
                right: auto;
                margin-top: 2rem;
                transform: rotate(0deg);
                width: 100%;
                max-width: 500px;
                margin-left: auto;
                margin-right: auto;
            }}
        }}
        .terminal-window:hover {{ transform: rotate(0deg) scale(1.02); opacity: 1; }}
        .terminal-header {{ background: #1e293b; padding: 8px 12px; display: flex; gap: 6px; }}
        .dot {{ width: 10px; height: 10px; border-radius: 50%; }}
        .red {{ background: #ef4444; }} .yellow {{ background: #f59e0b; }} .green {{ background: #22c55e; }}
        .terminal-body {{ padding: 12px; color: #22d3ee; font-size: 0.75rem; line-height: 1.4; height: 200px; overflow: hidden; }}
        
        @page {{ size: 297mm 210mm; margin: 0; }}
        @media print {{
            .no-print {{ display: none !important; }}
            html, body {{ width: 100%; height: auto !important; background-color: #020617 !important; overflow: visible !important; }}
            .page-break {{ 
                width: 297mm !important; height: 210mm !important; max-height: 210mm !important;
                padding: 10mm !important; margin: 0 !important; page-break-after: always;
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                zoom: 0.85; 
            }}
            .page-break > div {{ width: 100%; max-width: 1200px; }}
            .terminal-window {{ display: none; }}
        }}
    </style>
</head>
<body class="antialiased selection:bg-aegis-blue selection:text-white">

    <!-- 1. COVER: GLOBAL VISION -->
    <section class="page-break relative bg-gradient-to-br from-slate-950 via-[#0f172a] to-aegis-blue/30">
        <!-- Mobile Hint -->
        <div class="lg:hidden absolute top-0 left-0 w-full flex justify-center py-6 z-50 pointer-events-none no-print">
            <div class="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 animate-pulse">
                <span class="text-xs font-medium text-slate-300">Rotate for best experience ↻</span>
            </div>
        </div>
        
        <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div class="order-2 lg:order-1">
                <div class="mb-8">
                    <img src="{logo_base64}" alt="Aegis Logo" class="h-24 lg:h-32 w-auto mb-6">
                    <div class="inline-block px-3 py-1 rounded-full bg-aegis-blue/20 border border-aegis-blue/40 text-white text-xs font-bold tracking-widest uppercase mb-4">
                        Investment Memorandum 2026
                    </div>
                </div>
                <h1 class="text-6xl lg:text-8xl font-bold mb-4 tracking-tight">
                    Aegis <span class="text-gradient-brand">AI</span>
                </h1>
                <p class="text-3xl text-white font-serif italic mb-8">
                    "Democratizing Cybersecurity"
                </p>
                <p class="text-lg lg:text-xl text-slate-400 max-w-lg leading-relaxed mb-8">
                    Sovereign AI Infrastructure protecting <strong>Governments & SMEs</strong> worldwide. 
                    Beyond static analysis—autonomous reasoning for the post-perimeter era.
                </p>
                <div class="flex flex-wrap gap-4 text-sm font-semibold text-slate-300">
                    <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span> Government Defense</span>
                    <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-aegis-pink"></span> Critical Infrastructure</span>
                    <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-aegis-blue"></span> SME Resilience</span>
                </div>
            </div>
            
            <!-- Terminal Visual -->
            <div class="order-1 lg:order-2 relative h-[300px] lg:h-[400px] flex items-center justify-center">
                <div class="terminal-window">
                    <div class="terminal-header">
                        <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
                    </div>
                    <div class="terminal-body font-mono text-xs">
                        <span class="text-green-400">root@aegis-core:~#</span> ./run_sast_audit.sh --target=repo_v1<br>
                        > Initializing Hybrid Neuro-Symbolic Engine... <span class="text-green-400">[OK]</span><br>
                        > Parsing Abstract Syntax Tree (AST)... <span class="text-green-400">[DONE]</span><br>
                        > Correlating Logic Flows (Database -> API)...<br>
                        <br>
                        <span class="text-red-400">[CRITICAL]</span> Hardcoded Secret in auth_middleware.py<br>
                        > Context: AWS_ACCESS_KEY exposed in line 42<br>
                        > Impact: High Risk of Data Exfiltration<br>
                        <br>
                        <span class="text-blue-400">Aegis AI:</span> Vulnerability Confirmed (99.8% Confidence).<br>
                        <span class="text-blue-400">Aegis AI:</span> Generating Patch... <span class="text-green-400">[APPLIED]</span><br>
                        <span class="cursor"></span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 2. GLOBAL NEWS (NEWSPAPER STYLE) -->
    <section class="page-break bg-slate-950 !p-0">
        <div class="w-full h-full flex flex-col bg-[#f4f1ea] text-slate-900 px-2 py-2 lg:px-4 lg:py-4" style="max-width: none !important;">
            <!-- Masthead -->
            <header class="border-b-4 border-slate-900 mb-2 text-center shrink-0">
                <div class="flex justify-between items-end border-b border-slate-900 pb-1 mb-1">
                    <div class="text-[9px] font-sans font-bold uppercase tracking-widest text-slate-600">Vol. CLXXV ... No. 43,120</div>
                    <div class="text-[9px] font-sans font-bold uppercase tracking-widest text-slate-600">JANUARY 2026</div>
                    <div class="text-[9px] font-sans font-bold uppercase tracking-widest text-slate-600">$4.88M Avg. Cost</div>
                </div>
                <h1 class="text-4xl lg:text-6xl font-black uppercase tracking-tight mb-1 leading-none w-full" style="font-family: 'Playfair Display', serif;">The Global Threat Chronicle</h1>
            </header>
            {news_html}
        </div>
    </section>

    <!-- 3. DIGITAL SOVEREIGNTY (GLOBAL) -->
    <section class="page-break relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
            <div>
                <h2 class="text-4xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
                    GLOBAL <br>
                    <span class="text-aegis-blue">DATA SOVEREIGNTY</span>
                </h2>
                <div class="space-y-6 text-lg text-slate-300">
                    <p>
                        In a fractured geopolitical landscape, <strong>Data Residency</strong> is no longer optional—it is a matter of National Security. Governments can no longer rely on black-box foreign clouds.
                    </p>
                    <p>
                        <strong>The Aegis Sovereign Model:</strong>
                        <ul class="list-disc pl-5 space-y-2 mt-2 text-base text-slate-400">
                            <li><strong>On-Premise Deployment:</strong> Full AI capabilities running within national borders.</li>
                            <li><strong>Air-Gapped Ready:</strong> Operates in disconnected, high-security environments.</li>
                            <li><strong>Compliance Native:</strong> Built for GDPR, NIST, and local data protection laws.</li>
                        </ul>
                    </p>
                </div>
            </div>
            <div class="relative">
                <div class="glass-card p-8 rounded-2xl border border-aegis-blue/30 relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-50">
                        <svg class="w-16 h-16 text-aegis-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Why Governments Choose Aegis</h3>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                                <svg class="w-6 h-6 text-aegis-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-white">Strategic Independence</h4>
                                <p class="text-xs text-slate-400">Capable of operating independently. Hybrid mode available for enhanced capabilities.</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                                <svg class="w-6 h-6 text-aegis-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-white">Compliance Ready</h4>
                                <p class="text-xs text-slate-400">Architecture designed for ISO 27001 & GDPR alignment. Roadmap includes full certification.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. CRITICAL INFRASTRUCTURE -->
    <section class="page-break bg-slate-950">
        <div class="max-w-6xl mx-auto w-full text-center mb-12">
            <h2 class="text-4xl lg:text-5xl font-serif font-bold mb-4">PROTECTING <span class="text-gradient-brand">CRITICAL INFRASTRUCTURE</span></h2>
            <p class="text-slate-400 max-w-2xl mx-auto">
                From Banking Systems to Government Portals. <strong>Pre-deployment immunization</strong>: identifying vulnerabilities in the code before they become breaches.
            </p>
        </div>

        <div class="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Card 1 -->
            <div class="glass-card p-6 rounded-xl hover:-translate-y-2 transition-transform duration-300">
                <div class="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2">Enterprise Supply Chain</h3>
                <p class="text-sm text-slate-400">
                     Securing the software lifecycle. Automated analysis of legacy codebases and modern microservices before deployment.
                </p>
            </div>
            <!-- Card 2 -->
            <div class="glass-card p-6 rounded-xl hover:-translate-y-2 transition-transform duration-300 border-aegis-pink/30 border">
                <div class="h-12 w-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2">SME & Supply Chain</h3>
                <p class="text-sm text-slate-400">
                    The backbone of the economy. Affordable, automated "Audit-as-a-Service" for companies that cannot hire a CISO.
                </p>
            </div>
            <!-- Card 3 -->
            <div class="glass-card p-6 rounded-xl hover:-translate-y-2 transition-transform duration-300">
                <div class="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2">Government Services</h3>
                <p class="text-sm text-slate-400">
                    Securing citizen data and digital portals against state-sponsored espionage and ransomware.
                </p>
            </div>
        </div>
    </section>

    <!-- 4.1 MARKET OPPORTUNITY -->
    <section class="page-break relative bg-slate-950">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-aegis-blue/10 via-slate-950 to-slate-950 pointer-events-none"></div>
        
        <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-32 items-center z-10">
            <div class="max-w-md">
                <h2 class="text-4xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
                    MARKET <br>
                    <span class="text-aegis-blue">OPPORTUNITY</span>
                </h2>
                <p class="text-lg text-slate-300 mb-8 leading-relaxed">
                    The Latin American cybersecurity market is rapidly expanding, driven by regulatory mandates and increasing sovereign threats. Aegis is positioned to capture the underserved Government and SME sectors.
                </p>
                
                <div class="space-y-6">
                    <!-- Growth Metric -->
                    <div class="glass-card p-6 rounded-xl border-l-4 border-green-400 group hover:bg-slate-800/50 transition-colors">
                        <a href="https://www.mordorintelligence.com/industry-reports/latin-america-cyber-security-market" target="_blank" class="block">
                            <div class="text-3xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors flex items-center gap-2">
                                12.5% CAGR
                                <svg class="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </div>
                            <div class="text-sm text-slate-400">Projected annual growth in LATAM Cybersecurity (2025-2030).</div>
                        </a>
                    </div>
                    
                    <!-- Urgency Metric -->
                    <div class="glass-card p-6 rounded-xl border-l-4 border-aegis-pink group hover:bg-slate-800/50 transition-colors">
                         <a href="https://www.mordorintelligence.com/industry-reports/latin-america-cyber-security-market" target="_blank" class="block">
                            <div class="text-3xl font-bold text-white mb-1 group-hover:text-aegis-pink transition-colors flex items-center gap-2">
                                $15B+ Gap
                                <svg class="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </div>
                            <div class="text-sm text-slate-400">Unmet demand for compliant, sovereign security solutions in the region.</div>
                        </a>
                    </div>
                </div>
            </div>

            <!-- TAM/SAM/SOM Visual -->
            <div class="relative h-[400px] lg:h-[600px] flex items-center justify-center">
                <!-- TAM -->
                <div class="absolute w-[400px] h-[400px] lg:w-[680px] lg:h-[680px] rounded-full border border-slate-700 bg-slate-900/40 flex items-start justify-center pt-8 backdrop-blur-sm z-0">
                    <div class="text-center">
                        <div class="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">TAM</div>
                        <div class="text-white font-serif text-2xl font-bold drop-shadow-md">$200B+</div>
                        <div class="text-slate-400 text-[10px]">Global Cybersecurity</div>
                    </div>
                </div>
                
                <!-- SAM -->
                <div class="absolute w-[280px] h-[280px] lg:w-[450px] lg:h-[450px] rounded-full border border-aegis-blue/50 bg-slate-900/60 flex items-start justify-center pt-8 backdrop-blur-md z-10 shadow-[0_0_30px_rgba(82,39,255,0.1)]">
                    <div class="text-center">
                        <div class="text-aegis-blue font-bold text-xs uppercase tracking-widest mb-1">SAM</div>
                        <div class="text-white font-serif text-3xl font-bold drop-shadow-lg">$15B+</div>
                        <div class="text-slate-300 text-[10px] max-w-[120px] mx-auto font-medium">LATAM GovTech & Compliance</div>
                    </div>
                </div>

                <!-- SOM -->
                <div class="absolute w-[130px] h-[130px] lg:w-[160px] lg:h-[160px] rounded-full border-2 border-white bg-gradient-to-br from-aegis-blue to-aegis-pink flex items-center justify-center z-20 shadow-[0_0_50px_rgba(255,159,252,0.3)] transform hover:scale-105 transition-transform duration-500">
                    <div class="text-center text-white">
                        <div class="font-bold text-xs uppercase tracking-widest mb-1 opacity-90">SOM</div>
                        <div class="font-serif text-4xl font-bold drop-shadow-lg">$7.3M</div>
                        <div class="text-white/90 text-[10px] font-bold">Mexico Beachhead</div>
                    </div>
                </div>
                
                <!-- Market Notes -->
                <div class="absolute bottom-0 right-0 max-w-[280px] text-[10px] text-slate-500 text-right bg-slate-900/80 p-3 rounded-lg border border-slate-800 backdrop-blur-md z-30">
                    <div class="mb-2 space-y-1">
                        <div><span class="font-bold text-slate-400">TAM:</span> Total Addressable Market</div>
                        <div><span class="font-bold text-aegis-blue">SAM:</span> Serviceable Available Market</div>
                        <div><span class="font-bold text-aegis-pink">SOM:</span> Serviceable Obtainable Market</div>
                    </div>
                    <div class="border-t border-slate-700 pt-2">
                        <div class="font-bold uppercase mb-1 text-[9px] tracking-wider">Data Sources:</div>
                        <div><a href="https://www.mordorintelligence.com/industry-reports/cyber-security-market" target="_blank" class="hover:text-aegis-blue transition-colors">Global TAM: Mordor Intelligence (2025)</a></div>
                        <div><a href="https://www.mordorintelligence.com/industry-reports/latin-america-cyber-security-market" target="_blank" class="hover:text-aegis-blue transition-colors">LATAM SAM: Mordor Intelligence (Forecast)</a></div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. SCALABLE BUSINESS MODEL -->
    <section class="page-break relative">
        <div class="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
                <h2 class="text-4xl lg:text-5xl font-serif font-bold mb-6">
                    SCALABLE <br>
                    <span class="text-aegis-pink">AUDIT-AS-A-SERVICE</span>
                </h2>
                <p class="text-lg text-slate-300 mb-8">
                    Disrupting the $26B AppSec Market. Unlike legacy tools that charge per-user, Aegis democratizes elite security with a <strong>Pay-per-Audit</strong> model, making cognitive security accessible to every SME and Municipality.
                </p>
                
                <div class="grid grid-cols-2 gap-6">
                    <div class="glass-card p-4 rounded-lg">
                        <div class="text-3xl font-bold text-white mb-1">10x</div>
                        <div class="text-xs text-slate-400">Faster Remediation</div>
                    </div>
                    <div class="glass-card p-4 rounded-lg">
                        <div class="text-3xl font-bold text-white mb-1">-60%</div>
                        <div class="text-xs text-slate-400">Manual Effort Reduction</div>
                    </div>
                </div>
            </div>
            
            <div class="glass-card p-8 rounded-2xl flex flex-col justify-between h-full relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10">
                    <svg class="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-6">How Aegis Works</h3>
                
                <div class="space-y-6 relative z-10">
                    <!-- Step 1 -->
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                            <span class="text-xl">1</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-white">Ingest</h4>
                            <p class="text-xs text-slate-400">Secure upload via CLI or Drag & Drop. Air-gapped ready.</p>
                        </div>
                    </div>
                    
                    <!-- Connector -->
                    <div class="w-0.5 h-6 bg-slate-700 ml-6"></div>

                    <!-- Step 2 -->
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 shrink-0 animate-pulse">
                            <span class="text-xl">2</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-white">Analyze</h4>
                            <p class="text-xs text-slate-400">Neuro-Symbolic AI scans for logic flaws & vulnerabilities.</p>
                        </div>
                    </div>

                    <!-- Connector -->
                    <div class="w-0.5 h-6 bg-slate-700 ml-6"></div>

                    <!-- Step 3 -->
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30 shrink-0">
                            <span class="text-xl">3</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-white">Secure</h4>
                            <p class="text-xs text-slate-400">Receive actionable report & auto-fix suggestions.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. OUR DIFFERENCES -->
    <section class="page-break relative bg-slate-950 flex flex-col justify-center">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-aegis-blue/10 via-slate-950 to-slate-950 pointer-events-none"></div>
        
        <div class="max-w-6xl mx-auto w-full relative z-10">
            <div class="text-center mb-12 lg:mb-20">
                <h2 class="text-3xl lg:text-5xl font-serif font-bold text-white mb-6">
                    THE AEGIS <span class="text-aegis-blue">DIFFERENCE</span>
                </h2>
                <p class="text-xl text-slate-400 max-w-2xl mx-auto">
                    Redefining cybersecurity standards with innovation and true access.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <!-- Difference 1 -->
                <div class="glass-card p-8 rounded-2xl border border-aegis-blue/20 hover:border-aegis-blue/50 transition-all duration-300 group hover:-translate-y-2">
                    <div class="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-blue-500/20">
                        <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-4">Proprietary Finetuned AI</h3>
                    <p class="text-slate-400 leading-relaxed text-sm lg:text-base">
                        We possess our own Artificial Intelligence <strong>finetuned</strong> specifically for cybersecurity, trained to detect vulnerabilities that generic models miss.
                    </p>
                </div>

                <!-- Difference 2 -->
                <div class="glass-card p-8 rounded-2xl border border-aegis-blue/20 hover:border-aegis-blue/50 transition-all duration-300 group hover:-translate-y-2">
                    <div class="h-16 w-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-purple-500/20">
                        <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-4">On-Premise Deployment</h3>
                    <p class="text-slate-400 leading-relaxed text-sm lg:text-base">
                        100% <strong>on-premise</strong> deployment for government entities or certified data centers within Mexican territory, ensuring total data sovereignty.
                    </p>
                </div>

                <!-- Difference 3 -->
                <div class="glass-card p-8 rounded-2xl border border-aegis-blue/20 hover:border-aegis-blue/50 transition-all duration-300 group hover:-translate-y-2">
                    <div class="h-16 w-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-green-500/20">
                        <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-4">Pay-per-Scan Model</h3>
                    <p class="text-slate-400 leading-relaxed text-sm lg:text-base">
                        Accessible <strong>pay-per-use</strong> model. No expensive annual subscriptions (+$50k USD), removing barriers for freelancers, startups, and SMEs.
                    </p>
                </div>
            </div>

            <!-- Vision Slogan -->
            <div class="text-center relative">
                <div class="absolute left-1/2 -top-10 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-aegis-blue to-transparent opacity-50"></div>
                <h3 class="text-4xl lg:text-6xl font-serif italic text-white/90 leading-tight tracking-wide drop-shadow-lg">
                    "Democratizing Cybersecurity"
                </h3>
            </div>
        </div>
    </section>

    <!-- 6. LEADERSHIP & EXPERTISE -->
    <section class="page-break bg-gradient-to-t from-aegis-blue/10 to-slate-950">
        <div class="max-w-7xl mx-auto w-full">
            <div class="mb-12 text-center">
                <h2 class="text-3xl lg:text-5xl font-serif font-bold text-white mb-4">BACKED BY <span class="text-aegis-blue">EXPERTS</span></h2>
                <p class="text-xl text-slate-400">Strategic Alliances & Certified Leadership</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Column 1: Strategic Trust (Company/Alliances) -->
                <div class="flex flex-col gap-6 h-full">
                    <h3 class="text-xl font-bold text-white border-l-4 border-aegis-blue pl-4">Strategic Trust</h3>
                    
                    <!-- Strategic Access (Alex) -->
                    <div class="glass-card p-8 rounded-2xl border border-aegis-blue/30 relative overflow-hidden flex-grow flex flex-col">
                         <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-aegis-blue/20 rounded-full blur-3xl"></div>
                         <h4 class="text-lg font-bold mb-4 text-white">Strategic Trust Corridor</h4>
                         <p class="text-sm text-slate-300 leading-relaxed mb-6">
                             Verified "soft-landing" framework for LATAM Ministries via active US-based government contracts.
                         </p>
                         
                         <!-- Visual Corridor -->
                         <div class="relative flex justify-between items-center mb-8 px-2">
                            <!-- Line -->
                            <div class="absolute left-0 top-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500/20 via-blue-500/50 to-blue-500/20 -z-10"></div>
                            
                            <!-- Nodes -->
                            <div class="flex flex-col items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 z-10">
                                <img src="{images_base64['usa']}" class="w-8 h-8 rounded-full object-cover border border-white/20">
                                <span class="text-[10px] font-bold text-slate-400">USA</span>
                            </div>
                            <div class="flex flex-col items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 z-10">
                                <img src="{images_base64['mexico']}" class="w-8 h-8 rounded-full object-cover border border-white/20">
                                <span class="text-[10px] font-bold text-slate-400">MEX</span>
                            </div>
                            <div class="flex flex-col items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 z-10">
                                <img src="{images_base64['el_salvador']}" class="w-8 h-8 rounded-full object-cover border border-white/20">
                                <span class="text-[10px] font-bold text-slate-400">SLV</span>
                            </div>
                            <div class="flex flex-col items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700 z-10">
                                <img src="{images_base64['colombia']}" class="w-8 h-8 rounded-full object-cover border border-white/20">
                                <span class="text-[10px] font-bold text-slate-400">COL</span>
                            </div>
                         </div>

                         <p class="text-sm text-slate-300 leading-relaxed mb-6">
                              Through these established trust corridors, we possess a verified "soft-landing" framework for LATAM Ministries and Enterprise Boardrooms.
                         </p>

                         <!-- Partnership Badge (Hecho en Mexico) -->
                         <div class="bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-5 rounded-xl border border-slate-700/50 flex items-center gap-4 relative z-10 backdrop-blur-sm">
                            <img src="{images_base64['hecho_en_mexico']}" class="h-14 w-auto object-contain" alt="Hecho en Mexico">
                            <div>
                                <div class="flex items-center gap-3 mb-1">
                                    <div class="font-bold text-white flex items-center gap-2 text-sm">
                                        National Infrastructure
                                    </div>
                                </div>
                                <p class="text-xs text-slate-300 leading-snug">
                                    Hosted in the <strong>first Mexican Data Center</strong> to receive the <strong>"HECHO EN MÉXICO"</strong> recognition.
                                </p>
                            </div>
                         </div>
                    </div>
                </div>

                <!-- Column 2: Technical Authority (Jordan) -->
                    <div class="flex flex-col gap-6 h-full">
                        <h3 class="text-xl font-bold text-white border-l-4 border-aegis-pink pl-4">Technical Authority</h3>

                        <!-- Jordan Profile -->
                        <div class="glass-card p-6 rounded-2xl relative overflow-hidden flex-grow flex flex-col justify-center">
                        <div class="flex items-center gap-4 mb-6">
                            <img src="{images_base64['jordan']}" class="w-20 h-20 rounded-full border-2 border-aegis-blue object-cover shadow-lg" alt="Jordan Maese">
                            <div>
                                <h4 class="text-xl font-bold text-white mb-1">Jordan Maese</h4>
                                <div class="text-aegis-blue font-bold text-sm">Founder & CEO, Securetag</div>
                                <div class="text-slate-300 font-medium text-xs mb-1">Founder & Lead Architect, Aegis</div>
                                <div class="text-xs text-slate-500 mb-1">BSc in IT Security (UANL) • <a href="https://cedulaprofesional.sep.gob.mx" target="_blank" class="hover:text-aegis-blue transition-colors underline decoration-dotted">Lic: 11951757</a></div>
                                <a href="mailto:jordan.maese@securetag.com.mx" class="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                                    <span>✉️</span> jordan.maese@securetag.com.mx
                                </a>
                                <a href="https://mx.linkedin.com/in/jordan-maese" target="_blank" class="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 mt-0.5">
                                    <span>🔗</span> linkedin.com/in/jordan-maese
                                </a>
                            </div>
                        </div>
                        
                        <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                            <h5 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Credentials & Certifications</h5>
                            
                            <!-- ISO Standards -->
                            <div class="mb-4">
                                <div class="text-xs font-bold text-aegis-blue mb-2 uppercase">International Standards (ISO)</div>
                                <ul class="space-y-2">
                                    <li class="bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-white font-bold text-sm">ISO/IEC 27001:2022</span>
                                            <span class="text-[10px] text-slate-500 uppercase">InfoSec</span>
                                        </div>
                                        <div class="text-xs text-slate-400">Implementer • Internal Auditor • Lead Auditor</div>
                                    </li>
                                    <li class="bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-white font-bold text-sm">ISO 9001:2015</span>
                                            <span class="text-[10px] text-slate-500 uppercase">Quality</span>
                                        </div>
                                        <div class="text-xs text-slate-400">Implementer • Internal Auditor • Lead Auditor</div>
                                    </li>
                                    <li class="bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-white font-bold text-sm">ISO 22301</span>
                                            <span class="text-[10px] text-slate-500 uppercase">Continuity</span>
                                        </div>
                                        <div class="text-xs text-slate-400">Implementer • Internal Auditor • Lead Auditor</div>
                                    </li>
                                    <li class="bg-slate-800/50 p-2 rounded border border-slate-700">
                                        <div class="flex justify-between items-center mb-1">
                                            <span class="text-white font-bold text-sm">ISO/IEC 20000-1:2018</span>
                                            <span class="text-[10px] text-slate-500 uppercase">IT Services</span>
                                        </div>
                                        <div class="text-xs text-slate-400">Internal Auditor • Lead Auditor</div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Specialized & Agile -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <div class="text-xs font-bold text-aegis-pink mb-2 uppercase">Specialized Expertise</div>
                                    <ul class="space-y-1">
                                        <li class="text-xs text-slate-300 border-l-2 border-aegis-pink pl-2">Cybersecurity Expert</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-aegis-pink pl-2">Ethical Hacking Prof.</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-aegis-pink pl-2">AI Risk Management</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-aegis-pink pl-2">AI Expert</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-aegis-pink pl-2">Big Data Professional</li>
                                    </ul>
                                </div>
                                <div>
                                    <div class="text-xs font-bold text-green-400 mb-2 uppercase">Agile Frameworks</div>
                                    <ul class="space-y-1">
                                        <li class="text-xs text-slate-300 border-l-2 border-green-500 pl-2">Scrum Master</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-green-500 pl-2">Scrum Product Owner</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-green-500 pl-2">Scrum Developer</li>
                                        <li class="text-xs text-slate-300 border-l-2 border-green-500 pl-2">Scrum Foundations</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 6.5 URGENCY & VALIDATION -->
    <section class="page-break relative bg-slate-900">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950 to-slate-950 pointer-events-none"></div>
        
        <div class="max-w-6xl mx-auto w-full z-10 flex flex-col justify-center h-full">
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-12">
                <!-- Narrative Left -->
                <div>
                    <h2 class="text-3xl lg:text-5xl font-serif font-bold text-white mb-6 leading-tight">
                        THE <span class="text-red-500">URGENCY</span> <br>
                        & VALIDATION
                    </h2>
                    <p class="text-lg text-slate-300 mb-6 font-medium">
                        Today, the biggest cybersecurity risk is vulnerable software.
                    </p>
                    <p class="text-sm text-slate-400 mb-6 leading-relaxed">
                        SMEs and Governments are digitizing everything—portals, procedures, APIs, mobile apps—but almost none have AppSec teams.
                    </p>
                    <p class="text-sm text-slate-400 leading-relaxed border-l-2 border-slate-700 pl-4">
                        Most security tools are designed for corporates. We are building an accessible platform for Governments and SMEs to detect vulnerabilities in code and dependencies, prioritize them automatically, and help fix them without the need for experts.
                    </p>
                </div>

                <!-- Data Grid Right -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Stat 1 -->
                    <div class="glass-card p-4 rounded-xl border border-red-500/20 hover:border-red-500/50 transition-colors group">
                        <a href="https://www.eleconomista.com.mx/el-empresario/4-10-pymes-sufren-ciberataques-phishing-20250620-764521.html" target="_blank">
                            <div class="text-xs text-slate-500 uppercase font-bold mb-1 flex justify-between">
                                Mexico 
                                <span class="group-hover:opacity-100 opacity-0 transition-opacity">↗</span>
                            </div>
                            <div class="text-2xl font-bold text-white mb-1">4 of 10</div>
                            <div class="text-[10px] text-slate-400 leading-snug">SMEs have already suffered cyberattacks.</div>
                        </a>
                    </div>
                    <!-- Stat 2 -->
                    <div class="glass-card p-4 rounded-xl border border-red-500/20 hover:border-red-500/50 transition-colors group">
                        <a href="https://blog.checkpoint.com/research/latin-america-2025-mid-year-cyber-snapshot-reveals-39-surge-in-attacks-as-ai-threats-escalate-regional-risk/" target="_blank">
                            <div class="text-xs text-slate-500 uppercase font-bold mb-1 flex justify-between">
                                LATAM
                                <span class="group-hover:opacity-100 opacity-0 transition-opacity">↗</span>
                            </div>
                            <div class="text-2xl font-bold text-white mb-1">2,803</div>
                            <div class="text-[10px] text-slate-400 leading-snug">Average weekly attacks per organization.</div>
                        </a>
                    </div>
                    <!-- Stat 3 -->
                    <div class="glass-card p-4 rounded-xl border border-red-500/20 hover:border-red-500/50 transition-colors group">
                        <a href="https://www.thehindu.com/business/more-than-half-of-indian-enterprises-faced-ransomware-attacks-survey/article70234814.ece" target="_blank">
                            <div class="text-xs text-slate-500 uppercase font-bold mb-1 flex justify-between">
                                India
                                <span class="group-hover:opacity-100 opacity-0 transition-opacity">↗</span>
                            </div>
                            <div class="text-2xl font-bold text-white mb-1">68%</div>
                            <div class="text-[10px] text-slate-400 leading-snug">Of SMEs reported being targets of ransomware.</div>
                        </a>
                    </div>
                    <!-- Stat 4 -->
                    <div class="glass-card p-4 rounded-xl border border-red-500/20 hover:border-red-500/50 transition-colors group">
                        <a href="https://www.crnasia.com/news/2025/cybersecurity/asia-pacific-had-the-most-cyberattacks-in-2024" target="_blank">
                            <div class="text-xs text-slate-500 uppercase font-bold mb-1 flex justify-between">
                                APAC
                                <span class="group-hover:opacity-100 opacity-0 transition-opacity">↗</span>
                            </div>
                            <div class="text-2xl font-bold text-white mb-1">34%</div>
                            <div class="text-[10px] text-slate-400 leading-snug">Of global incidents, showing market size.</div>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Traction Box -->
            <div class="w-full">
                <div class="glass-card p-6 lg:p-8 rounded-2xl border-l-4 border-aegis-blue relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-32 h-32 bg-aegis-blue/10 rounded-bl-full pointer-events-none"></div>
                    
                    <div class="flex flex-col lg:flex-row gap-6 items-start lg:items-center relative z-10">
                        <div class="w-12 h-12 bg-aegis-blue/20 rounded-full flex items-center justify-center shrink-0 border border-aegis-blue/30">
                            <svg class="w-6 h-6 text-aegis-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        
                        <div>
                            <h3 class="text-xl font-bold text-white mb-2">Closed Beta Validation</h3>
                            <p class="text-sm text-slate-300 leading-relaxed max-w-4xl">
                                We are currently in a closed invitation-only beta with public government entities and SMEs (under NDA). 
                                <span class="text-white font-semibold">The product is already live in real environments</span>, detecting and patching vulnerabilities across hundreds of systems and applications.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </section>

    <!-- 7. ROADMAP & ASK -->
    <section class="page-break relative bg-slate-950 overflow-hidden">
        <!-- Background Elements -->
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-aegis-blue/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-aegis-pink/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div class="max-w-6xl mx-auto w-full relative z-10 flex flex-col h-full justify-center">
            
            <!-- Header -->
            <div class="text-center mb-10">
                <h2 class="text-4xl lg:text-6xl font-serif font-bold mb-4">
                    ACCELERATING <span class="text-transparent bg-clip-text bg-gradient-to-r from-aegis-blue to-aegis-pink">THE FUTURE</span>
                </h2>
                <p class="text-xl text-slate-400">Strategic Roadmap & Investment Opportunity</p>
            </div>

            <!-- The Ask (Horizontal) -->
            <div class="glass-card p-6 rounded-2xl border border-white/10 mb-12">
                <div class="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div class="text-center lg:text-left">
                        <h3 class="text-2xl font-bold text-white mb-1">Join the Revolution</h3>
                        <p class="text-slate-400 text-sm">We are opening our Seed Round to strategic partners who share our vision of Digital Sovereignty.</p>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-4">
                         <a href="mailto:jordan.maese@securetag.com.mx" class="bg-white text-slate-900 px-6 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                            <span>✉️</span> Request Pitch Deck
                         </a>
                         <div class="px-6 py-2 rounded-full border border-white/20 text-white font-medium flex items-center justify-center text-sm whitespace-nowrap">
                            Seed Stage
                         </div>
                    </div>
                </div>
            </div>

            <!-- Roadmap Timeline -->
            <div class="mb-16">
                <!-- 2026 Timeline -->
                <div class="mb-8">
                    <h4 class="text-white/50 font-bold text-xl mb-6 flex items-center gap-4">
                        2026 <span class="h-px bg-slate-800 flex-grow"></span>
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Q1-Q2 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-slate-500 hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-slate-500 font-bold text-lg mb-2">Q1 - Q2</h4>
                                <h5 class="text-white font-bold mb-2">Dev & Feedback</h5>
                                <p class="text-xs text-slate-400">Finalizing development with feedback from private beta partners (Govs & SMEs).</p>
                            </div>
                        </div>
                        <!-- Q3 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-aegis-blue hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-aegis-blue font-bold text-lg mb-2">Q3</h4>
                                <h5 class="text-white font-bold mb-2">Market Entry</h5>
                                <p class="text-xs text-slate-400">Closing sales with 3 initial Government entities.</p>
                            </div>
                        </div>
                        <!-- Q4 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-aegis-blue hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-aegis-blue font-bold text-lg mb-2">Q4</h4>
                                <h5 class="text-white font-bold mb-2">Early Growth</h5>
                                <p class="text-xs text-slate-400">Expansion to 5 more Governments & first 50 SMEs.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2027 Timeline -->
                <div>
                    <h4 class="text-white/50 font-bold text-xl mb-6 flex items-center gap-4">
                        2027 <span class="h-px bg-slate-800 flex-grow"></span>
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <!-- Q1 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-aegis-pink hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-aegis-pink font-bold text-lg mb-2">Q1</h4>
                                <h5 class="text-white font-bold mb-2">Scaling Up</h5>
                                <p class="text-xs text-slate-400">+8 Governments & +100 SMEs.</p>
                            </div>
                        </div>
                        <!-- Q2 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-aegis-pink hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-aegis-pink font-bold text-lg mb-2">Q2</h4>
                                <h5 class="text-white font-bold mb-2">Mass Adoption</h5>
                                <p class="text-xs text-slate-400">+8 Governments & +200 SMEs.</p>
                            </div>
                        </div>
                        <!-- Q3 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-aegis-pink hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-aegis-pink font-bold text-lg mb-2">Q3</h4>
                                <h5 class="text-white font-bold mb-2">Market Dominance</h5>
                                <p class="text-xs text-slate-400">+8 Governments & +400 SMEs.</p>
                            </div>
                        </div>
                        <!-- Q4 -->
                        <div class="group relative">
                            <div class="glass-card p-6 rounded-xl border-t-4 border-green-400 hover:-translate-y-2 transition-transform duration-300 h-full">
                                <h4 class="text-green-400 font-bold text-lg mb-2">Q4</h4>
                                <h5 class="text-white font-bold mb-2">Expansion Ready</h5>
                                <p class="text-xs text-slate-400">Initial goals met. Launching LATAM expansion plans.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Acceleration Note -->
                <div class="mt-8 text-center">
                    <p class="text-sm text-slate-400 italic border border-slate-800 bg-slate-900/50 inline-block px-6 py-2 rounded-full">
                        <span class="text-aegis-blue">Note:</span> Strategic investor partners are expected to accelerate these timelines.
                    </p>
                </div>
            </div>



        </div>
    </section>

</body>
</html>"""

# 4. Write Output
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Successfully generated {output_path}")
