// =============================================================================
//  Keheilan AgriVest Intelligence Platform – client-side portal (vanilla JS)
// =============================================================================

// --------------- Anthropic API key ---------------
// Set your API key here or via window.ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = window.ANTHROPIC_API_KEY || ''; // <-- put your key here

// --------------- Design Tokens ---------------
const C = {
    bg:          "#060e06",
    surface:     "#0b160b",
    card:        "#101d10",
    cardHover:   "#162416",
    border:      "#1e3820",
    forest:      "#3a7a32",
    forestLight: "#5aab50",
    forestDim:   "#1f4a1a",
    gold:        "#c9a030",
    goldLight:   "#e8c96a",
    goldDim:     "#7a6018",
    brown:       "#8b5e2a",
    brownLight:  "#c49a6c",
    olive:       "#7a8c3a",
    oliveLight:  "#a8b860",
    text:        "#d8c89a",
    textDim:     "#8a9a70",
    textFaint:   "#3d5035",
    investor:    "#4a9a40",
    operator:    "#c9a030",
    admin:       "#8b5e2a",
    red:         "#d05040",
    green:       "#5aab50",
    amber:       "#c99020",
};

// --------------- Mock Data ---------------
const FARMS = [
    { id:1, name:"Nile Delta Wheat Farm",  location:"Kafr el-Sheikh", crop:"Wheat",  roi:16.5, risk:"Low", riskC:C.green, funding:250000, funded:180000, operator:"Ahmed Hassan",   score:92, season:"Winter",     sat:98 },
    { id:2, name:"Fayoum Organic Dates",   location:"Fayoum",         crop:"Dates",  roi:22.3, risk:"Med", riskC:C.amber, funding:150000, funded:90000,  operator:"Sara Mahmoud",   score:87, season:"Summer",     sat:91 },
    { id:3, name:"Sinai Herb Gardens",     location:"South Sinai",    crop:"Herbs",  roi:19.8, risk:"Med", riskC:C.amber, funding:80000,  funded:45000,  operator:"Omar Farouk",    score:83, season:"Year-round", sat:74 },
    { id:4, name:"Upper Egypt Cotton",     location:"Assiut",         crop:"Cotton", roi:14.2, risk:"Low", riskC:C.green, funding:400000, funded:320000, operator:"Fatima Ali",     score:95, season:"Summer",     sat:62 },
    { id:5, name:"Delta Rice Paddies",     location:"Dakahlia",       crop:"Rice",   roi:18.7, risk:"Low", riskC:C.green, funding:200000, funded:110000, operator:"Khaled Ibrahim", score:89, season:"Summer",     sat:88 },
];

const PORT_TREND  = [
    {m:"Nov",v:48000},{m:"Dec",v:51000},{m:"Jan",v:49500},
    {m:"Feb",v:54000},{m:"Mar",v:57500},{m:"Apr",v:62000},{m:"May",v:68000},
];
const YIELD_TREND = [
    {m:"Nov",y:82},{m:"Dec",y:78},{m:"Jan",y:85},
    {m:"Feb",y:88},{m:"Mar",y:91},{m:"Apr",y:87},{m:"May",y:94},
];
const PLAT_TREND  = [
    {m:"Nov",inv:42,f:12},{m:"Dec",inv:58,f:15},{m:"Jan",inv:71,f:18},
    {m:"Feb",inv:89,f:22},{m:"Mar",inv:103,f:26},{m:"Apr",inv:124,f:31},{m:"May",inv:148,f:38},
];
const ALLOC = [
    {name:"Wheat",  value:35, color:C.gold},
    {name:"Dates",  value:25, color:C.forest},
    {name:"Cotton", value:20, color:C.brown},
    {name:"Rice",   value:12, color:C.olive},
    {name:"Herbs",  value:8,  color:C.oliveLight},
];
const ALERTS_DATA = [
    {id:1, type:"danger",  farm:"Upper Egypt Cotton",    msg:"Satellite vs reported yield mismatch — variance 38%",  time:"1h ago"},
    {id:2, type:"warning", farm:"Sinai Herb Gardens",    msg:"Reported yield 23% below seasonal projection",         time:"3h ago"},
    {id:3, type:"info",    farm:"Fayoum Organic Dates",  msg:"New investor KYC document pending review",             time:"5h ago"},
    {id:4, type:"success", farm:"Nile Delta Wheat Farm", msg:"Q2 disbursement of EGP 185,000 completed",            time:"1d ago"},
];
const KYC_DATA = [
    {name:"Mohammed Al-Rashid",  type:"Individual", status:"Verified", date:"Apr 10"},
    {name:"Horizon Capital Ltd.",type:"Corporate",  status:"Verified", date:"Apr 08"},
    {name:"Nadia Saleh",         type:"Individual", status:"Pending",  date:"May 09"},
    {name:"Gulf Ventures LLC",   type:"Corporate",  status:"Pending",  date:"May 10"},
    {name:"Karim Boutros",       type:"Individual", status:"Verified", date:"Mar 28"},
];

// --------------- Tool Definitions ---------------
const INVESTOR_TOOLS = [
    { name: "get_farm_opportunities", description: "Retrieve available farm investment opportunities filtered by risk level or minimum ROI.", input_schema: { type:"object", properties: { risk_level:{type:"string", enum:["Low","Med","High"]}, min_roi:{type:"number"} } } },
    { name: "get_farm_details", description: "Get full due diligence data, yield history, and satellite verification for a specific farm.", input_schema: { type:"object", required:["farm_id"], properties: { farm_id:{type:"number"} } } },
    { name: "calculate_roi_projection", description: "Calculate projected returns for a given investment amount, farm, and time period.", input_schema: { type:"object", required:["farm_id","investment_amount"], properties: { farm_id:{type:"number"}, investment_amount:{type:"number"}, months:{type:"number"} } } },
    { name: "get_portfolio", description: "Get the investor's current portfolio: holdings, performance, and upcoming disbursements.", input_schema: { type:"object", properties: {} } },
    { name: "match_farms_to_profile", description: "AI pattern matching to recommend farms best suited to the investor's risk and return profile.", input_schema: { type:"object", properties: { risk_tolerance:{type:"string", enum:["conservative","moderate","aggressive"]}, target_roi:{type:"number"} } } },
];

const OPERATOR_TOOLS = [
    { name: "get_farm_profile", description: "Get the farm's AI score, profile breakdown, and current investor interest metrics.", input_schema: { type:"object", properties: {} } },
    { name: "get_yield_data", description: "Retrieve historical yield performance data for the farm.", input_schema: { type:"object", properties: { months:{type:"number"} } } },
    { name: "structure_capital_request", description: "Generate a professional, investor-ready capital request with itemised cost breakdown.", input_schema: { type:"object", required:["total_amount","purpose"], properties: { total_amount:{type:"number"}, purpose:{type:"string"}, duration_months:{type:"number"} } } },
    { name: "generate_performance_report", description: "Generate a formatted performance report for investors covering yield, revenue, and disbursements.", input_schema: { type:"object", properties: { period:{type:"string"} } } },
    { name: "get_score_improvement_tips", description: "Analyse the farm's AI score and return a prioritised action plan to improve it.", input_schema: { type:"object", properties: {} } },
];

const ADMIN_TOOLS = [
    { name: "get_platform_stats", description: "Retrieve current platform statistics: AUM, investor count, active farms, and alert summary.", input_schema: { type:"object", properties: {} } },
    { name: "get_risk_alerts", description: "Get all active risk alerts, optionally filtered by severity level.", input_schema: { type:"object", properties: { severity:{type:"string", enum:["critical","warning","info","all"]} } } },
    { name: "check_compliance_status", description: "Check KYC/AML compliance status for investors or farm operators.", input_schema: { type:"object", properties: { entity_type:{type:"string"}, status_filter:{type:"string"} } } },
    { name: "analyze_satellite_anomaly", description: "Cross-reference a farm's reported yield against satellite imagery data and flag discrepancies.", input_schema: { type:"object", required:["farm_name"], properties: { farm_name:{type:"string"}, threshold_pct:{type:"number"} } } },
    { name: "generate_audit_report", description: "Generate a comprehensive compliance and financial audit report for a given period.", input_schema: { type:"object", properties: { period:{type:"string"}, sections:{type:"array", items:{type:"string"}} } } },
];

// --------------- Tool Executor ---------------
function executeTool(name, input) {
    switch (name) {
        case "get_farm_opportunities": {
            let r = [...FARMS];
            if (input.risk_level) r = r.filter(f => f.risk === input.risk_level);
            if (input.min_roi)    r = r.filter(f => f.roi >= input.min_roi);
            return {
                farms: r.map(f => ({ id:f.id, name:f.name, crop:f.crop, roi:f.roi+"%", risk:f.risk, score:f.score, funded:Math.round(f.funded/f.funding*100)+"%" })),
                count: r.length,
            };
        }
        case "get_farm_details": {
            const f = FARMS.find(x => x.id === input.farm_id) || FARMS[0];
            return { ...f, yield_trend:YIELD_TREND, operator_verified:true, shariah_certified:true, satellite_match:f.sat+"%" };
        }
        case "calculate_roi_projection": {
            const f = FARMS.find(x => x.id === input.farm_id) || FARMS[0];
            const m = input.months || 12;
            const profit = Math.round(input.investment_amount * (f.roi / 100) * (m / 12));
            return { farm:f.name, investment:input.investment_amount, months:m, roi:f.roi+"%", projected_profit:"EGP "+profit, total_return:"EGP "+(input.investment_amount+profit), risk:f.risk };
        }
        case "get_portfolio":
            return { value:"EGP 68,000", invested:"EGP 55,000", profit:"EGP 13,000", ytd:"+41.7%", active_farms:["Nile Delta Wheat","Fayoum Dates","Delta Rice Paddies"], next_disbursement:"Jun 15", next_amount:"EGP 8,200" };
        case "match_farms_to_profile": {
            const t = input.risk_tolerance || "moderate";
            const map = { conservative:["Low"], moderate:["Low","Med"], aggressive:["Low","Med","High"] };
            const allowed = map[t] || ["Low","Med"];
            return {
                recommended: FARMS.filter(f => allowed.includes(f.risk)).sort((a,b) => b.score-a.score).slice(0,3).map(f => ({ name:f.name, roi:f.roi+"%", risk:f.risk, score:f.score })),
                profile_assessed: t,
            };
        }
        case "get_farm_profile":
            return { name:"Fayoum Organic Dates", score:87, breakdown:{yield_consistency:88, operator_record:91, documentation:82, satellite_match:91}, investor_inquiries:12, funding_progress:"60%", season:"Summer" };
        case "get_yield_data":
            return { months:input.months||7, data:YIELD_TREND, avg_yield:"87.9%", trend:"Improving", vs_benchmark:"+6.2%" };
        case "structure_capital_request": {
            const a = input.total_amount || 150000;
            return {
                total: "EGP "+a.toLocaleString(), purpose:input.purpose, duration:(input.duration_months||12)+" months",
                breakdown: [
                    {item:"Irrigation Infrastructure", pct:"30%", amount:"EGP "+(a*0.30).toFixed(0)},
                    {item:"Seedlings & Planting",       pct:"25%", amount:"EGP "+(a*0.25).toFixed(0)},
                    {item:"Labour & Operations",        pct:"20%", amount:"EGP "+(a*0.20).toFixed(0)},
                    {item:"Harvesting Equipment",       pct:"15%", amount:"EGP "+(a*0.15).toFixed(0)},
                    {item:"Storage & Logistics",        pct:"10%", amount:"EGP "+(a*0.10).toFixed(0)},
                ],
                expected_roi:"22.3%", shariah_compliant:true,
            };
        }
        case "generate_performance_report":
            return { period:input.period||"Q2 2025", farm:"Fayoum Organic Dates", yield_achieved:"94%", target:"88%", revenue:"EGP 127,400", disbursed:"EGP 19,200", next_disbursement:"EGP 21,000 — Jun 15", highlights:["Yield exceeded target by 6.8%","Zero irrigation failures","Organic certification renewed"], shariah_audit:"Passed" };
        case "get_score_improvement_tips":
            return {
                current_score:87,
                tips:[
                    {action:"Upload soil quality analysis report",       impact:"+3 pts", priority:"High"},
                    {action:"Add weather insurance documentation",       impact:"+2 pts", priority:"High"},
                    {action:"Increase monthly yield reporting frequency",impact:"+2 pts", priority:"Medium"},
                    {action:"Request third-party harvest verification",  impact:"+2 pts", priority:"Medium"},
                    {action:"Complete operator background check",        impact:"+1 pt",  priority:"Low"},
                ],
                projected_score:97,
                note:"Implementing High priority actions alone could reach score 92 — top 10% of operators.",
            };
        case "get_platform_stats":
            return { investors:148, active_farms:5, total_operators:38, aum:"EGP 1,080,000", kyc_pending:7, active_alerts:4, critical_alerts:1, monthly_growth:"+18%", shariah_compliance:"Fully Certified" };
        case "get_risk_alerts": {
            const s = input.severity || "all";
            const filtered = s === "all" ? ALERTS_DATA : ALERTS_DATA.filter(a => a.type === s || (s === "critical" && a.type === "danger"));
            return { alerts:filtered, total:filtered.length };
        }
        case "check_compliance_status":
            return { entities:KYC_DATA, verified:3, pending:2, aml_flags:0, shariah_breaches:0 };
        case "analyze_satellite_anomaly": {
            const key = (input.farm_name || "").toLowerCase().split(" ")[0];
            const f = FARMS.find(x => x.name.toLowerCase().includes(key)) || FARMS[3];
            const variance = 100 - f.sat;
            return {
                farm: f.name,
                reported_yield: f.sat + "%",
                satellite_estimate: (f.sat - variance/2).toFixed(0) + "%",
                variance: variance + "%",
                threshold: (input.threshold_pct || 20) + "%",
                flagged: variance > (input.threshold_pct || 20),
                risk_level: variance > 30 ? "CRITICAL" : variance > 15 ? "WARNING" : "OK",
                recommendation: variance > 30
                    ? "Immediate action required — freeze disbursement and schedule operator interview. Possible yield misreporting."
                    : "Monitor next reporting cycle. Request supporting documentation from operator.",
                confidence: "87%",
            };
        }
        case "generate_audit_report":
            return {
                period: input.period || "May 2025",
                generated: new Date().toLocaleDateString(),
                compliance: { kyc_complete:"21/28 investors", aml_flags:0, shariah_breaches:0, status:"PASS" },
                risk:       { critical_alerts:1, open_investigations:1, avg_satellite_match:"82.6%", status:"MONITOR" },
                financials: { total_aum:"EGP 1,080,000", disbursements_on_time:"98%", pending:2, status:"PASS" },
                overall_status: "CONDITIONAL PASS",
                action_required: "Resolve Upper Egypt Cotton satellite anomaly before next investor disbursement.",
            };
        default:
            return { error:"Unknown tool: "+name };
    }
}

// --------------- UI Helpers ---------------

// InfoCircle component (tooltip on click)
function InfoCircle(text, color) {
    const span = document.createElement('span');
    span.style.position = 'relative';
    span.style.display = 'inline-flex';
    span.style.alignItems = 'center';
    span.style.flexShrink = '0';

    const dot = document.createElement('span');
    dot.innerHTML = 'i';
    dot.style.display = 'inline-flex';
    dot.style.alignItems = 'center';
    dot.style.justifyContent = 'center';
    dot.style.width = '20px';
    dot.style.height = '20px';
    dot.style.borderRadius = '50%';
    dot.style.background = `${color}22`;
    dot.style.border = `1.5px solid ${color}77`;
    dot.style.color = color;
    dot.style.fontSize = '11px';
    dot.style.fontWeight = '700';
    dot.style.cursor = 'pointer';
    dot.style.fontFamily = "'Cinzel', serif";
    dot.style.userSelect = 'none';
    dot.style.transition = 'background 0.15s';

    const popover = document.createElement('div');
    popover.style.position = 'absolute';
    popover.style.bottom = 'calc(100% + 8px)';
    popover.style.left = '50%';
    popover.style.transform = 'translateX(-50%)';
    popover.style.zIndex = '9999';
    popover.style.background = C.card;
    popover.style.border = `1px solid ${color}66`;
    popover.style.borderRadius = '10px';
    popover.style.padding = '10px 14px';
    popover.style.minWidth = '220px';
    popover.style.maxWidth = '280px';
    popover.style.fontSize = '12px';
    popover.style.color = C.text;
    popover.style.lineHeight = '1.65';
    popover.style.fontFamily = "'DM Sans', sans-serif";
    popover.style.boxShadow = '0 12px 32px rgba(0,0,0,0.65)';
    popover.style.pointerEvents = 'none';
    popover.style.display = 'none';
    popover.textContent = text;

    dot.onmouseenter = () => {
        dot.style.background = `${color}44`;
    };
    dot.onmouseleave = () => {
        dot.style.background = `${color}22`;
    };
    dot.onclick = (e) => {
        e.stopPropagation();
        popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
    };

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
        if (!span.contains(e.target)) {
            popover.style.display = 'none';
        }
    });

    span.appendChild(dot);
    span.appendChild(popover);
    return span;
}

// Stat card
function createStat(label, value, sub, accent, info) {
    const card = document.createElement('div');
    card.style.background = C.card;
    card.style.border = `1px solid ${C.border}`;
    card.style.borderRadius = '12px';
    card.style.padding = '15px 16px';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';

    const topLine = document.createElement('div');
    topLine.style.position = 'absolute';
    topLine.style.top = '0';
    topLine.style.left = '0';
    topLine.style.right = '0';
    topLine.style.height = '2px';
    topLine.style.background = accent || C.forest;
    card.appendChild(topLine);

    const labelDiv = document.createElement('div');
    labelDiv.style.display = 'flex';
    labelDiv.style.alignItems = 'center';
    labelDiv.style.gap = '5px';
    labelDiv.style.marginBottom = '7px';
    const lbl = document.createElement('span');
    lbl.style.fontSize = '9px';
    lbl.style.color = C.textDim;
    lbl.style.letterSpacing = '2px';
    lbl.style.textTransform = 'uppercase';
    lbl.style.fontWeight = '600';
    lbl.textContent = label;
    labelDiv.appendChild(lbl);
    if (info) {
        labelDiv.appendChild(InfoCircle(info, accent || C.forest));
    }
    card.appendChild(labelDiv);

    const valueDiv = document.createElement('div');
    valueDiv.style.fontSize = '21px';
    valueDiv.style.fontWeight = '700';
    valueDiv.style.color = C.goldLight;
    valueDiv.style.fontFamily = "'Cinzel', serif";
    valueDiv.textContent = value;
    card.appendChild(valueDiv);

    if (sub) {
        const subDiv = document.createElement('div');
        subDiv.style.fontSize = '11px';
        subDiv.style.color = sub.startsWith('+') ? C.green : C.textDim;
        subDiv.style.marginTop = '3px';
        subDiv.textContent = sub;
        card.appendChild(subDiv);
    }

    return card;
}

// Tab bar
function createTabBar(tabs, active, onChange, accent) {
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.gap = '3px';
    bar.style.background = C.surface;
    bar.style.borderRadius = '12px';
    bar.style.padding = '4px';
    bar.style.border = `1px solid ${C.border}`;
    bar.style.marginBottom = '18px';
    bar.style.flexWrap = 'wrap';

    tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.textContent = t;
        btn.style.flex = '1 1 auto';
        btn.style.minWidth = '72px';
        btn.style.padding = '9px 6px';
        btn.style.borderRadius = '9px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontFamily = "'DM Sans', sans-serif";
        btn.style.fontWeight = active === t ? '700' : '400';
        btn.style.fontSize = '12px';
        btn.style.transition = 'all 0.2s';
        if (active === t) {
            btn.style.background = `${accent}22`;
            btn.style.color = accent;
            btn.style.borderBottom = `2px solid ${accent}`;
        } else {
            btn.style.background = 'transparent';
            btn.style.color = C.textDim;
            btn.style.borderBottom = '2px solid transparent';
        }
        btn.onclick = () => onChange(t);
        bar.appendChild(btn);
    });

    return bar;
}

// Badge
function createBadge(label, color) {
    const span = document.createElement('span');
    span.style.fontSize = '10px';
    span.style.padding = '2px 8px';
    span.style.borderRadius = '10px';
    span.style.background = `${color}1e`;
    span.style.color = color;
    span.style.fontWeight = '700';
    span.style.letterSpacing = '0.3px';
    span.style.flexShrink = '0';
    span.textContent = label;
    return span;
}

// Section title with optional info
function createSTitle(text, info, color) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '7px';
    div.style.marginBottom = '14px';
    const titleSpan = document.createElement('span');
    titleSpan.style.fontFamily = "'Cinzel', serif";
    titleSpan.style.fontSize = '14px';
    titleSpan.style.fontWeight = '600';
    titleSpan.style.color = C.goldLight;
    titleSpan.textContent = text;
    div.appendChild(titleSpan);
    if (info) {
        div.appendChild(InfoCircle(info, color || C.forest));
    }
    return div;
}

// --------------- Chart Helpers ---------------

function createCanvas(width = '100%', height = '200') {
    const canvas = document.createElement('canvas');
    canvas.width = width; // will be overridden by ResponsiveContainer
    canvas.style.width = '100%';
    canvas.style.height = height + 'px';
    return canvas;
}

function AreaChart(container, data, dataKey, color, gradientId, yFormatter = null) {
    const canvas = createCanvas();
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color + '59'); // ~0.35 opacity
    gradient.addColorStop(1, color + '00');

    const labels = data.map(d => d.m);
    const values = data.map(d => d[dataKey]);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: dataKey,
                data: values,
                borderColor: color,
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderWidth: 1,
                    titleColor: C.textDim,
                    bodyColor: C.text,
                }
            },
            scales: {
                x: {
                    ticks: { color: C.textDim, font: { size: 10 } },
                    grid: { color: C.border, drawBorder: false },
                },
                y: {
                    ticks: { color: C.textDim, font: { size: 10 }, callback: yFormatter || (v => v) },
                    grid: { color: C.border, drawBorder: false },
                }
            }
        }
    });
}

function BarChart(container, data, dataKey, color) {
    const canvas = createCanvas();
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.m),
            datasets: [{
                data: data.map(d => d[dataKey]),
                backgroundColor: color,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: C.textDim }, grid: { display: false } },
                y: { ticks: { color: C.textDim }, grid: { color: C.border } }
            }
        }
    });
}

function PieChart_Canvas(container, data) {
    const canvas = createCanvas('100%', '160');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: data.map(d => d.color),
                borderColor: C.card,
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '40%',
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: C.surface, borderColor: C.border }
            }
        }
    });
}

function LineChart_Canvas(container, data, lines, colors) {
    const canvas = createCanvas();
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const datasets = lines.map((key, i) => ({
        label: key,
        data: data.map(d => d[key]),
        borderColor: colors[i],
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 0,
        fill: false,
    }));
    new Chart(ctx, {
        type: 'line',
        data: { labels: data.map(d => d.m), datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: C.textDim }, grid: { color: C.border } },
                y: { ticks: { color: C.textDim }, grid: { color: C.border } }
            }
        }
    });
}

// --------------- Agent Chat Component ---------------
function AgentChat({ label, systemPrompt, tools, accent, placeholders }) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = 'clamp(420px, 58vh, 580px)';
    container.style.background = C.card;
    container.style.borderRadius = '16px';
    container.style.border = `1px solid ${C.border}`;
    container.style.overflow = 'hidden';

    const apiMsgs = [];
    const historyElements = [];

    // Header
    const header = document.createElement('div');
    header.style.padding = '12px 16px';
    header.style.borderBottom = `1px solid ${C.border}`;
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '10px';
    header.style.background = C.surface;

    const avatar = document.createElement('div');
    avatar.innerHTML = '🤖';
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.background = `linear-gradient(135deg, ${accent}, ${accent}66)`;
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '17px';
    avatar.style.flexShrink = '0';

    const headerInfo = document.createElement('div');
    headerInfo.style.flex = '1';
    headerInfo.style.minWidth = '0';
    const name = document.createElement('div');
    name.style.fontSize = '13px';
    name.style.fontWeight = '700';
    name.style.color = C.goldLight;
    name.style.fontFamily = "'Cinzel', serif";
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    name.textContent = `${label} AI Agent`;
    const desc = document.createElement('div');
    desc.style.fontSize = '10px';
    desc.style.color = C.textDim;
    desc.textContent = `${tools.length} tools available · Keheilan Intelligence Engine`;
    headerInfo.appendChild(name);
    headerInfo.appendChild(desc);

    const status = document.createElement('div');
    status.style.display = 'flex';
    status.style.alignItems = 'center';
    status.style.gap = '6px';
    status.style.flexShrink = '0';
    const runningLabel = document.createElement('span');
    runningLabel.style.fontSize = '9px';
    runningLabel.style.color = accent;
    runningLabel.style.fontWeight = '700';
    runningLabel.style.animation = 'pulse 1s infinite';
    runningLabel.style.letterSpacing = '1px';
    runningLabel.style.display = 'none';
    runningLabel.textContent = 'RUNNING';
    const dot = document.createElement('div');
    dot.style.width = '7px';
    dot.style.height = '7px';
    dot.style.borderRadius = '50%';
    dot.style.background = C.green;
    dot.style.boxShadow = `0 0 5px ${C.green}`;
    status.appendChild(runningLabel);
    status.appendChild(dot);

    header.appendChild(avatar);
    header.appendChild(headerInfo);
    header.appendChild(status);
    container.appendChild(header);

    // Tool chips
    const chips = document.createElement('div');
    chips.style.padding = '6px 12px';
    chips.style.borderBottom = `1px solid ${C.border}`;
    chips.style.display = 'flex';
    chips.style.gap = '5px';
    chips.style.flexWrap = 'wrap';
    chips.style.background = `${C.surface}cc`;
    tools.forEach(t => {
        const chip = document.createElement('span');
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '5px';
        chip.style.fontSize = '9px';
        chip.style.padding = '3px 9px 3px 7px';
        chip.style.borderRadius = '20px';
        chip.style.background = `${accent}14`;
        chip.style.color = accent;
        chip.style.fontWeight = '700';
        chip.style.letterSpacing = '0.3px';
        chip.appendChild(InfoCircle(t.description, accent));
        chip.appendChild(document.createTextNode(t.name.replace(/_/g, ' ')));
        chips.appendChild(chip);
    });
    container.appendChild(chips);

    // Messages area
    const messagesDiv = document.createElement('div');
    messagesDiv.style.flex = '1';
    messagesDiv.style.overflowY = 'auto';
    messagesDiv.style.padding = '14px';
    messagesDiv.style.display = 'flex';
    messagesDiv.style.flexDirection = 'column';
    messagesDiv.style.gap = '12px';

    // Welcome message
    const welcomeText = {
        Investor: "Salaam! I'm your Keheilan Investment AI Agent. I have live access to farm data, ROI calculators, yield projections, and your portfolio. Ask me anything — I'll use my tools to give you real, data-backed answers.",
        "Farm Operator": "Salaam! I'm your Farm Intelligence Agent. I can pull your live farm data, structure capital requests, generate investor-ready performance reports, and build a personalised AI score improvement plan.",
        Administrator: "Salaam! I'm the Platform Intelligence Agent. I monitor compliance in real time, cross-reference satellite data to detect anomalies, assess platform-wide risk, and generate audit reports on demand.",
    }[label] || "Hello! How can I help?";

    function addMessage(type, content) {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.animation = 'fadeIn 0.2s ease';

        if (type === 'user') {
            div.style.justifyContent = 'flex-end';
            const bubble = document.createElement('div');
            bubble.style.background = `${accent}18`;
            bubble.style.border = `1px solid ${accent}55`;
            bubble.style.borderRadius = '16px 4px 16px 16px';
            bubble.style.padding = '10px 14px';
            bubble.style.fontSize = '13px';
            bubble.style.color = C.text;
            bubble.style.maxWidth = '82%';
            bubble.style.lineHeight = '1.65';
            bubble.style.wordBreak = 'break-word';
            bubble.textContent = content;
            div.appendChild(bubble);
        } else if (type === 'assistant') {
            const av = document.createElement('div');
            av.style.width = '28px';
            av.style.height = '28px';
            av.style.borderRadius = '50%';
            av.style.background = `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`;
            av.style.flexShrink = '0';
            av.style.display = 'flex';
            av.style.alignItems = 'center';
            av.style.justifyContent = 'center';
            av.style.fontSize = '12px';
            av.style.fontWeight = '700';
            av.style.color = '#000';
            av.style.fontFamily = "'Cinzel', serif";
            av.textContent = 'K';
            const bubble = document.createElement('div');
            bubble.style.background = C.surface;
            bubble.style.border = `1px solid ${C.border}`;
            bubble.style.borderRadius = '4px 16px 16px 16px';
            bubble.style.padding = '10px 14px';
            bubble.style.fontSize = '13px';
            bubble.style.color = C.text;
            bubble.style.maxWidth = '82%';
            bubble.style.lineHeight = '1.65';
            bubble.style.whiteSpace = 'pre-wrap';
            bubble.style.wordBreak = 'break-word';
            bubble.textContent = content;
            div.appendChild(av);
            div.appendChild(bubble);
        } else if (type === 'tool_call') {
            const av = document.createElement('div');
            av.style.width = '28px';
            av.style.flexShrink = '0';
            const bubble = document.createElement('div');
            bubble.style.background = `${accent}0d`;
            bubble.style.border = `1px dashed ${accent}55`;
            bubble.style.borderRadius = '10px';
            bubble.style.padding = '8px 12px';
            bubble.style.fontSize = '11px';
            bubble.style.color = accent;
            bubble.style.maxWidth = '82%';
            bubble.style.wordBreak = 'break-all';
            const title = document.createElement('div');
            title.style.fontWeight = '700';
            title.style.marginBottom = '3px';
            title.innerHTML = `⚙ Calling tool: <code style="font-family:monospace">${content.name.replace(/_/g, ' ')}</code>`;
            const params = document.createElement('div');
            params.style.color = C.textDim;
            params.style.fontSize = '10px';
            params.style.fontFamily = 'monospace';
            params.style.opacity = '0.7';
            params.textContent = JSON.stringify(content.input);
            bubble.appendChild(title);
            bubble.appendChild(params);
            div.appendChild(av);
            div.appendChild(bubble);
        } else if (type === 'tool_result') {
            const av = document.createElement('div');
            av.style.width = '28px';
            av.style.flexShrink = '0';
            const bubble = document.createElement('div');
            bubble.style.background = `${C.green}0a`;
            bubble.style.border = `1px dashed ${C.green}44`;
            bubble.style.borderRadius = '10px';
            bubble.style.padding = '8px 12px';
            bubble.style.fontSize = '11px';
            bubble.style.color = C.green;
            bubble.style.maxWidth = '82%';
            bubble.style.wordBreak = 'break-all';
            const title = document.createElement('div');
            title.style.fontWeight = '700';
            title.style.marginBottom = '3px';
            title.innerHTML = `✅ Result from: <code style="font-family:monospace">${content.name.replace(/_/g, ' ')}</code>`;
            const result = document.createElement('div');
            result.style.color = C.textDim;
            result.style.fontSize = '10px';
            result.style.fontFamily = 'monospace';
            result.style.opacity = '0.7';
            result.textContent = JSON.stringify(content.result).slice(0,150) + '…';
            bubble.appendChild(title);
            bubble.appendChild(result);
            div.appendChild(av);
            div.appendChild(bubble);
        }

        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return div;
    }

    // Welcome bubble
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.display = 'flex';
    welcomeDiv.style.gap = '10px';
    const welcomeAv = document.createElement('div');
    welcomeAv.style.width = '28px';
    welcomeAv.style.height = '28px';
    welcomeAv.style.borderRadius = '50%';
    welcomeAv.style.background = `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`;
    welcomeAv.style.flexShrink = '0';
    welcomeAv.style.display = 'flex';
    welcomeAv.style.alignItems = 'center';
    welcomeAv.style.justifyContent = 'center';
    welcomeAv.style.fontSize = '12px';
    welcomeAv.style.fontWeight = '700';
    welcomeAv.style.color = '#000';
    welcomeAv.style.fontFamily = "'Cinzel', serif";
    welcomeAv.textContent = 'K';
    const welcomeBubble = document.createElement('div');
    welcomeBubble.style.background = C.surface;
    welcomeBubble.style.border = `1px solid ${C.border}`;
    welcomeBubble.style.borderRadius = '4px 16px 16px 16px';
    welcomeBubble.style.padding = '10px 14px';
    welcomeBubble.style.fontSize = '13px';
    welcomeBubble.style.color = C.text;
    welcomeBubble.style.maxWidth = '82%';
    welcomeBubble.style.lineHeight = '1.65';
    welcomeBubble.textContent = welcomeText;
    welcomeDiv.appendChild(welcomeAv);
    welcomeDiv.appendChild(welcomeBubble);
    messagesDiv.appendChild(welcomeDiv);

    // Quick prompt buttons
    if (placeholders && placeholders.length) {
        const quickDiv = document.createElement('div');
        quickDiv.style.display = 'flex';
        quickDiv.style.flexWrap = 'wrap';
        quickDiv.style.gap = '6px';
        quickDiv.style.marginLeft = '38px';
        placeholders.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p;
            btn.style.background = `${accent}14`;
            btn.style.border = `1px solid ${accent}44`;
            btn.style.borderRadius = '20px';
            btn.style.padding = '6px 14px';
            btn.style.fontSize = '11px';
            btn.style.color = accent;
            btn.style.cursor = 'pointer';
            btn.style.fontWeight = '600';
            btn.style.fontFamily = "'DM Sans', sans-serif";
            btn.style.transition = 'background 0.15s';
            btn.onmouseenter = () => btn.style.background = `${accent}2a`;
            btn.onmouseleave = () => btn.style.background = `${accent}14`;
            btn.onclick = () => runAgent(p);
            quickDiv.appendChild(btn);
        });
        messagesDiv.appendChild(quickDiv);
    }

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.padding = '10px 12px';
    inputArea.style.borderTop = `1px solid ${C.border}`;
    inputArea.style.display = 'flex';
    inputArea.style.gap = '8px';
    inputArea.style.background = C.surface;

    const input = document.createElement('input');
    input.placeholder = 'Ask the agent — it will use its tools to answer...';
    input.style.flex = '1';
    input.style.background = C.card;
    input.style.border = `1px solid ${C.border}`;
    input.style.borderRadius = '10px';
    input.style.padding = '10px 14px';
    input.style.color = C.text;
    input.style.fontSize = '13px';
    input.style.outline = 'none';
    input.style.fontFamily = "'DM Sans', sans-serif";
    input.style.minWidth = '0';
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runAgent(input.value);
    });

    const runBtn = document.createElement('button');
    runBtn.textContent = 'Run →';
    runBtn.style.background = `linear-gradient(135deg, ${C.forest}, ${C.forestDim})`;
    runBtn.style.border = 'none';
    runBtn.style.borderRadius = '10px';
    runBtn.style.padding = '10px 18px';
    runBtn.style.color = C.goldLight;
    runBtn.style.fontWeight = '700';
    runBtn.style.fontSize = '13px';
    runBtn.style.cursor = 'pointer';
    runBtn.style.fontFamily = "'DM Sans', sans-serif";
    runBtn.style.flexShrink = '0';
    runBtn.style.whiteSpace = 'nowrap';
    runBtn.onclick = () => runAgent(input.value);

    inputArea.appendChild(input);
    inputArea.appendChild(runBtn);

    container.appendChild(messagesDiv);
    container.appendChild(inputArea);

    async function runAgent(userText) {
        if (!userText.trim() || runBtn.disabled) return;
        if (!ANTHROPIC_API_KEY) {
            addMessage('assistant', "⚠️ Anthropic API key not set. Please set the ANTHROPIC_API_KEY variable in portal.js.");
            return;
        }

        input.value = '';
        runBtn.disabled = true;
        runBtn.style.opacity = '0.5';
        runningLabel.style.display = 'inline';
        dot.style.background = accent;
        dot.style.boxShadow = `0 0 5px ${accent}`;

        const userMsg = { role: 'user', content: userText };
        apiMsgs.push(userMsg);
        addMessage('user', userText);

        let cur = [...apiMsgs];
        let iterations = 0;

        try {
            while (iterations < 8) {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1000,
                        system: systemPrompt,
                        tools: tools,
                        messages: cur.map(m => ({ role: m.role, content: m.content })),
                    }),
                });
                const data = await res.json();

                if (data.stop_reason === 'end_turn') {
                    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
                    addMessage('assistant', text);
                    apiMsgs.push({ role: 'assistant', content: data.content });
                    break;
                }

                if (data.stop_reason === 'tool_use') {
                    cur.push({ role: 'assistant', content: data.content });
                    const toolResults = [];
                    for (const block of data.content) {
                        if (block.type !== 'tool_use') continue;
                        addMessage('tool_call', { name: block.name, input: block.input });
                        const result = executeTool(block.name, block.input);
                        addMessage('tool_result', { name: block.name, result });
                        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
                    }
                    cur.push({ role: 'user', content: toolResults });
                    iterations++;
                } else {
                    break;
                }
            }
        } catch (e) {
            addMessage('assistant', 'Connection error. Please check your network and try again.');
        } finally {
            runBtn.disabled = false;
            runBtn.style.opacity = '1';
            runningLabel.style.display = 'none';
            dot.style.background = C.green;
            dot.style.boxShadow = `0 0 5px ${C.green}`;
        }
    }

    return container;
}

// --------------- Portals ---------------

function InvestorPortal() {
    const wrapper = document.createElement('div');
    let activeTab = 'Dashboard';

    function render() {
        wrapper.innerHTML = '';
        const tabBar = createTabBar(['Dashboard', 'Opportunities', 'Portfolio', 'AI Agent'], activeTab, t => {
            activeTab = t;
            render();
        }, C.investor);
        wrapper.appendChild(tabBar);

        const content = document.createElement('div');
        if (activeTab === 'Dashboard') {
            const grid4 = document.createElement('div');
            grid4.style.display = 'grid';
            grid4.style.gridTemplateColumns = 'repeat(4,1fr)';
            grid4.style.gap = '10px';
            grid4.style.marginBottom = '18px';
            grid4.appendChild(createStat('Portfolio Value', 'EGP 68K', '+41.7% YTD', C.investor, 'Total current market value of all your active farm investments including accrued returns'));
            grid4.appendChild(createStat('Active Farms', '3', 'Investments', C.investor, 'Number of farms you currently have capital deployed and generating returns in'));
            grid4.appendChild(createStat('Avg. ROI', '18.2%', 'AI Projected', C.forest, 'AI-projected average return across your full portfolio based on yield models and market data'));
            grid4.appendChild(createStat('Risk Level', 'Low', 'AI Assessed', C.green, 'Overall portfolio risk rating — calculated by the AI engine using yield variance, operator scores, and diversification'));
            content.appendChild(grid4);

            const g21 = document.createElement('div');
            g21.style.display = 'grid';
            g21.style.gridTemplateColumns = '2fr 1fr';
            g21.style.gap = '14px';
            // Chart
            const chartBox = document.createElement('div');
            chartBox.style.background = C.card;
            chartBox.style.border = `1px solid ${C.border}`;
            chartBox.style.borderRadius = '14px';
            chartBox.style.padding = '18px';
            chartBox.appendChild(createSTitle('Portfolio Growth', 'Your portfolio value plotted monthly — shows compound growth from multiple simultaneous farm investments', C.investor));
            const chartContainer = document.createElement('div');
            chartContainer.style.width = '100%';
            chartContainer.style.height = '185px';
            AreaChart(chartContainer, PORT_TREND, 'v', C.forest, 'investorGrad', v => `${v/1000}K`);
            chartBox.appendChild(chartContainer);
            g21.appendChild(chartBox);

            // Allocation pie
            const allocBox = document.createElement('div');
            allocBox.style.background = C.card;
            allocBox.style.border = `1px solid ${C.border}`;
            allocBox.style.borderRadius = '14px';
            allocBox.style.padding = '18px';
            allocBox.appendChild(createSTitle('Allocation', 'How your capital is distributed across crop types — diversification reduces seasonal and weather risk', C.investor));
            const pieContainer = document.createElement('div');
            pieContainer.style.width = '100%';
            pieContainer.style.height = '145px';
            PieChart_Canvas(pieContainer, ALLOC);
            allocBox.appendChild(pieContainer);
            const legend = document.createElement('div');
            legend.style.display = 'flex';
            legend.style.flexWrap = 'wrap';
            legend.style.gap = '5px';
            legend.style.marginTop = '6px';
            ALLOC.forEach(a => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '4px';
                const dot = document.createElement('div');
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.borderRadius = '2px';
                dot.style.background = a.color;
                item.appendChild(dot);
                const label = document.createElement('span');
                label.style.fontSize = '10px';
                label.style.color = C.textDim;
                label.textContent = a.name;
                item.appendChild(label);
                legend.appendChild(item);
            });
            allocBox.appendChild(legend);
            g21.appendChild(allocBox);
            content.appendChild(g21);
        } else if (activeTab === 'Opportunities') {
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.flexWrap = 'wrap';
            headerDiv.style.gap = '8px';
            headerDiv.style.marginBottom = '14px';
            headerDiv.appendChild(createSTitle('AI-Ranked Farm Opportunities', 'Farms ranked by AI score — considers yield consistency, operator track record, satellite verification, and Shariah compliance'));
            headerDiv.appendChild(createBadge('5 ACTIVE', C.investor));
            content.appendChild(headerDiv);

            const farmList = document.createElement('div');
            farmList.style.display = 'flex';
            farmList.style.flexDirection = 'column';
            farmList.style.gap = '10px';

            FARMS.forEach(f => {
                const card = document.createElement('div');
                card.style.background = C.card;
                card.style.border = `1px solid ${C.border}`;
                card.style.borderRadius = '14px';
                card.style.padding = '13px 15px';
                card.style.cursor = 'pointer';
                card.style.transition = 'all 0.2s';
                card.onclick = () => {
                    const isOpen = card.dataset.open === 'true';
                    card.dataset.open = isOpen ? 'false' : 'true';
                    const detail = card.querySelector('.detail');
                    if (detail) detail.style.display = isOpen ? 'none' : 'block';
                };

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.gap = '10px';
                row.style.flexWrap = 'wrap';

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                left.style.gap = '11px';
                left.style.flex = '1';
                left.style.minWidth = '0';
                const iconDiv = document.createElement('div');
                iconDiv.style.width = '40px';
                iconDiv.style.height = '40px';
                iconDiv.style.borderRadius = '10px';
                iconDiv.style.background = `${C.forest}22`;
                iconDiv.style.border = `1px solid ${C.forest}44`;
                iconDiv.style.display = 'flex';
                iconDiv.style.alignItems = 'center';
                iconDiv.style.justifyContent = 'center';
                iconDiv.style.fontSize = '18px';
                iconDiv.style.flexShrink = '0';
                iconDiv.textContent = '🌾';
                const infoDiv = document.createElement('div');
                infoDiv.style.minWidth = '0';
                const nameDiv = document.createElement('div');
                nameDiv.style.fontSize = '13px';
                nameDiv.style.fontWeight = '700';
                nameDiv.style.color = C.goldLight;
                nameDiv.style.fontFamily = "'Cinzel', serif";
                nameDiv.style.marginBottom = '4px';
                nameDiv.style.overflow = 'hidden';
                nameDiv.style.textOverflow = 'ellipsis';
                nameDiv.style.whiteSpace = 'nowrap';
                nameDiv.textContent = f.name;
                const badges = document.createElement('div');
                badges.style.display = 'flex';
                badges.style.gap = '5px';
                badges.style.flexWrap = 'wrap';
                badges.appendChild(createBadge(f.location, C.textDim));
                badges.appendChild(createBadge(f.crop, C.gold));
                badges.appendChild(createBadge(`${f.risk} Risk`, f.riskC));
                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(badges);
                left.appendChild(iconDiv);
                left.appendChild(infoDiv);

                const right = document.createElement('div');
                right.style.display = 'flex';
                right.style.alignItems = 'center';
                right.style.gap = '12px';
                right.style.flexShrink = '0';
                const roiDiv = document.createElement('div');
                roiDiv.style.textAlign = 'right';
                const roiLabel = document.createElement('div');
                roiLabel.style.fontSize = '10px';
                roiLabel.style.color = C.textDim;
                roiLabel.style.marginBottom = '2px';
                roiLabel.textContent = 'Expected ROI';
                const roiValue = document.createElement('div');
                roiValue.style.fontSize = '18px';
                roiValue.style.fontWeight = '700';
                roiValue.style.color = C.green;
                roiValue.style.fontFamily = "'Cinzel', serif";
                roiValue.textContent = f.roi + '%';
                roiDiv.appendChild(roiLabel);
                roiDiv.appendChild(roiValue);
                const scoreDiv = document.createElement('div');
                scoreDiv.style.textAlign = 'center';
                const scoreLabel = document.createElement('div');
                scoreLabel.style.fontSize = '10px';
                scoreLabel.style.color = C.textDim;
                scoreLabel.style.marginBottom = '3px';
                scoreLabel.style.display = 'flex';
                scoreLabel.style.alignItems = 'center';
                scoreLabel.style.gap = '3px';
                scoreLabel.appendChild(document.createTextNode('Score'));
                scoreLabel.appendChild(InfoCircle('AI score (0-100) — composite of yield consistency, operator track record, satellite data verification, and documentation quality', C.gold));
                const scoreValue = document.createElement('div');
                scoreValue.style.width = '40px';
                scoreValue.style.height = '40px';
                scoreValue.style.borderRadius = '50%';
                scoreValue.style.background = `${C.gold}22`;
                scoreValue.style.border = `2px solid ${C.gold}77`;
                scoreValue.style.display = 'flex';
                scoreValue.style.alignItems = 'center';
                scoreValue.style.justifyContent = 'center';
                scoreValue.style.fontSize = '13px';
                scoreValue.style.fontWeight = '700';
                scoreValue.style.color = C.goldLight;
                scoreValue.style.fontFamily = "'Cinzel', serif";
                scoreValue.textContent = f.score;
                scoreDiv.appendChild(scoreLabel);
                scoreDiv.appendChild(scoreValue);
                right.appendChild(roiDiv);
                right.appendChild(scoreDiv);
                row.appendChild(left);
                row.appendChild(right);
                card.appendChild(row);

                // detail (hidden by default)
                const detail = document.createElement('div');
                detail.className = 'detail';
                detail.style.display = 'none';
                detail.style.marginTop = '13px';
                detail.style.paddingTop = '13px';
                detail.style.borderTop = `1px solid ${C.border}`;
                const detailGrid = document.createElement('div');
                detailGrid.style.display = 'grid';
                detailGrid.style.gridTemplateColumns = 'repeat(3,1fr)';
                detailGrid.style.gap = '9px';
                detailGrid.style.marginBottom = '11px';
                [
                    ['Funding Target', `EGP ${(f.funding/1000).toFixed(0)}K`],
                    ['Operator', f.operator],
                    ['Season', f.season]
                ].forEach(([k,v]) => {
                    const cell = document.createElement('div');
                    cell.style.background = C.surface;
                    cell.style.borderRadius = '10px';
                    cell.style.padding = '9px 12px';
                    const kDiv = document.createElement('div');
                    kDiv.style.fontSize = '9px';
                    kDiv.style.color = C.textDim;
                    kDiv.style.letterSpacing = '1px';
                    kDiv.style.textTransform = 'uppercase';
                    kDiv.style.marginBottom = '3px';
                    kDiv.textContent = k;
                    const vDiv = document.createElement('div');
                    vDiv.style.fontSize = '12px';
                    vDiv.style.fontWeight = '700';
                    vDiv.style.color = C.text;
                    vDiv.textContent = v;
                    cell.appendChild(kDiv);
                    cell.appendChild(vDiv);
                    detailGrid.appendChild(cell);
                });
                detail.appendChild(detailGrid);

                const progressBar = document.createElement('div');
                progressBar.style.height = '5px';
                progressBar.style.background = C.border;
                progressBar.style.borderRadius = '3px';
                progressBar.style.marginBottom = '5px';
                const progressFill = document.createElement('div');
                progressFill.style.height = '100%';
                progressFill.style.width = Math.round(f.funded/f.funding*100) + '%';
                progressFill.style.background = C.investor;
                progressFill.style.borderRadius = '3px';
                progressBar.appendChild(progressFill);
                detail.appendChild(progressBar);

                const fundedInfo = document.createElement('div');
                fundedInfo.style.fontSize = '10px';
                fundedInfo.style.color = C.textDim;
                fundedInfo.style.marginBottom = '11px';
                fundedInfo.textContent = `${Math.round(f.funded/f.funding*100)}% funded — EGP ${(f.funded/1000).toFixed(0)}K of ${(f.funding/1000).toFixed(0)}K`;
                detail.appendChild(fundedInfo);

                const investBtn = document.createElement('button');
                investBtn.textContent = 'Invest in This Farm →';
                investBtn.style.background = `linear-gradient(135deg, ${C.forest}, ${C.forestDim})`;
                investBtn.style.border = 'none';
                investBtn.style.borderRadius = '10px';
                investBtn.style.padding = '10px 22px';
                investBtn.style.color = C.goldLight;
                investBtn.style.fontWeight = '700';
                investBtn.style.fontSize = '13px';
                investBtn.style.cursor = 'pointer';
                investBtn.style.fontFamily = "'DM Sans', sans-serif";
                detail.appendChild(investBtn);
                card.appendChild(detail);
                farmList.appendChild(card);
            });
            content.appendChild(farmList);
        } else if (activeTab === 'Portfolio') {
            const grid3 = document.createElement('div');
            grid3.style.display = 'grid';
            grid3.style.gridTemplateColumns = 'repeat(3,1fr)';
            grid3.style.gap = '10px';
            grid3.style.marginBottom = '18px';
            grid3.appendChild(createStat('Total Invested', 'EGP 55K', 'Across 3 farms', C.investor));
            grid3.appendChild(createStat('Current Value', 'EGP 68K', '+EGP 13K profit', C.green));
            grid3.appendChild(createStat('Next Disbursement', 'Jun 15', 'EGP 8,200 est.', C.gold));
            content.appendChild(grid3);

            const perf = document.createElement('div');
            perf.style.background = C.card;
            perf.style.border = `1px solid ${C.border}`;
            perf.style.borderRadius = '14px';
            perf.style.padding = '18px';
            perf.style.marginBottom = '14px';
            perf.appendChild(createSTitle('Portfolio Performance'));
            const perfContainer = document.createElement('div');
            perfContainer.style.width = '100%';
            perfContainer.style.height = '185px';
            AreaChart(perfContainer, PORT_TREND, 'v', C.forest, 'portGrad', v => `${v/1000}K`);
            perf.appendChild(perfContainer);
            content.appendChild(perf);

            // Active farms list
            FARMS.slice(0,3).forEach(f => {
                const item = document.createElement('div');
                item.style.background = C.card;
                item.style.border = `1px solid ${C.border}`;
                item.style.borderRadius = '10px';
                item.style.padding = '12px 15px';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.marginBottom = '8px';
                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                left.style.gap = '10px';
                left.innerHTML = `<span style="font-size:18px">🌾</span><div><div style="font-size:13px;font-weight:700;color:${C.text};font-family:'Cinzel',serif">${f.name}</div><div style="font-size:11px;color:${C.textDim}">${f.crop} · ${f.location}</div></div>`;
                const right = document.createElement('div');
                right.innerHTML = `<div style="font-size:14px;font-weight:700;color:${C.green};font-family:'Cinzel',serif">+${f.roi}%</div><div style="font-size:10px;color:${C.textDim}">Expected ROI</div>`;
                item.appendChild(left);
                item.appendChild(right);
                content.appendChild(item);
            });
        } else if (activeTab === 'AI Agent') {
            content.appendChild(AgentChat({
                label: 'Investor',
                systemPrompt: `You are an AI investment agent for Keheilan Asset Management's Shariah-compliant agricultural investment platform.
Always use your tools to fetch real data before answering — never invent numbers.
- Use get_farm_opportunities or get_farm_details before recommending any farm.
- Use calculate_roi_projection when the user asks about returns or profit.
- Use get_portfolio for any portfolio-related question.
- Use match_farms_to_profile to personalise recommendations based on risk.
Be concise, data-driven, and always ensure recommendations are Shariah-compliant.`,
                tools: INVESTOR_TOOLS,
                accent: C.investor,
                placeholders: ["Match farms to my conservative profile", "Calculate ROI: EGP 20,000 in farm 2", "Show my portfolio performance", "Find farms with ROI above 18%"]
            }));
        }
        wrapper.appendChild(content);
    }
    render();
    return wrapper;
}

function FarmOperatorPortal() {
    const wrapper = document.createElement('div');
    let activeTab = 'My Farm';

    function render() {
        wrapper.innerHTML = '';
        const tabBar = createTabBar(['My Farm', 'Capital Request', 'Performance', 'AI Agent'], activeTab, t => {
            activeTab = t;
            render();
        }, C.operator);
        wrapper.appendChild(tabBar);

        const content = document.createElement('div');
        if (activeTab === 'My Farm') {
            const grid4 = document.createElement('div');
            grid4.style.display = 'grid';
            grid4.style.gridTemplateColumns = 'repeat(4,1fr)';
            grid4.style.gap = '10px';
            grid4.style.marginBottom = '18px';
            grid4.appendChild(createStat('AI Score', '87', 'Top 20% platform', C.operator));
            grid4.appendChild(createStat('Capital Raised', 'EGP 90K', 'of 150K target', C.forest));
            grid4.appendChild(createStat('Investor Interest', '12', 'Active inquiries', C.brown));
            grid4.appendChild(createStat('Yield Rating', 'A+', 'AI Verified', C.green));
            content.appendChild(grid4);

            // Profile card
            const profile = document.createElement('div');
            profile.style.background = C.card;
            profile.style.border = `1px solid ${C.border}`;
            profile.style.borderRadius = '14px';
            profile.style.padding = '18px';
            profile.style.marginBottom = '14px';
            profile.appendChild(createSTitle('Farm Profile — Fayoum Organic Dates'));
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(3,1fr)';
            grid.style.gap = '10px';
            [['Location','Fayoum Gov.'],['Crop','Organic Dates'],['Area','42 Feddans'],['Season','Summer'],['Est. Yield','3.2 t/feddan'],['Shariah','Certified ✓']].forEach(([k,v]) => {
                const cell = document.createElement('div');
                cell.style.background = C.surface;
                cell.style.borderRadius = '10px';
                cell.style.padding = '10px 12px';
                cell.innerHTML = `<div style="font-size:9px;color:${C.textDim};letter-spacing:1px;text-transform:uppercase;margin-bottom:3px">${k}</div><div style="font-size:12px;font-weight:700;color:${C.text}">${v}</div>`;
                grid.appendChild(cell);
            });
            profile.appendChild(grid);
            content.appendChild(profile);

            // Yield chart
            const chartBox = document.createElement('div');
            chartBox.style.background = C.card;
            chartBox.style.border = `1px solid ${C.border}`;
            chartBox.style.borderRadius = '14px';
            chartBox.style.padding = '18px';
            chartBox.appendChild(createSTitle('Yield Trend (%)'));
            const chartContainer = document.createElement('div');
            chartContainer.style.width = '100%';
            chartContainer.style.height = '170px';
            BarChart(chartContainer, YIELD_TREND, 'y', C.forest);
            chartBox.appendChild(chartContainer);
            content.appendChild(chartBox);
        } else if (activeTab === 'Capital Request') {
            const grid3 = document.createElement('div');
            grid3.style.display = 'grid';
            grid3.style.gridTemplateColumns = 'repeat(3,1fr)';
            grid3.style.gap = '10px';
            grid3.style.marginBottom = '18px';
            grid3.appendChild(createStat('Requested', 'EGP 150K', 'Current round', C.operator));
            grid3.appendChild(createStat('Funded', 'EGP 90K', '60% complete', C.green));
            grid3.appendChild(createStat('Remaining', 'EGP 60K', 'To reach target', C.amber));
            content.appendChild(grid3);

            const breakdown = document.createElement('div');
            breakdown.style.background = C.card;
            breakdown.style.border = `1px solid ${C.border}`;
            breakdown.style.borderRadius = '14px';
            breakdown.style.padding = '18px';
            breakdown.style.marginBottom = '14px';
            breakdown.appendChild(createSTitle('Capital Breakdown'));
            [
                {l:'Irrigation Infrastructure', a:45000, p:30},
                {l:'Seedlings & Planting', a:37500, p:25},
                {l:'Labour & Operations', a:30000, p:20},
                {l:'Harvesting Equipment', a:22500, p:15},
                {l:'Storage & Logistics', a:15000, p:10}
            ].forEach(r => {
                const row = document.createElement('div');
                row.style.background = C.surface;
                row.style.borderRadius = '10px';
                row.style.padding = '11px 14px';
                row.style.marginBottom = '8px';
                const flex = document.createElement('div');
                flex.style.display = 'flex';
                flex.style.justifyContent = 'space-between';
                flex.style.marginBottom = '6px';
                flex.style.flexWrap = 'wrap';
                flex.style.gap = '4px';
                flex.innerHTML = `<span style="font-size:12px;color:${C.text};font-weight:500">${r.l}</span><span style="font-size:12px;color:${C.goldLight};font-family:'Cinzel',serif;font-weight:700">EGP ${r.a.toLocaleString()}</span>`;
                row.appendChild(flex);
                const bar = document.createElement('div');
                bar.style.height = '4px';
                bar.style.background = C.border;
                bar.style.borderRadius = '2px';
                const fill = document.createElement('div');
                fill.style.height = '100%';
                fill.style.width = r.p + '%';
                fill.style.background = C.forest;
                fill.style.borderRadius = '2px';
                bar.appendChild(fill);
                row.appendChild(bar);
                breakdown.appendChild(row);
            });
            content.appendChild(breakdown);

            const progress = document.createElement('div');
            progress.style.background = C.card;
            progress.style.border = `1px solid ${C.border}`;
            progress.style.borderRadius = '14px';
            progress.style.padding = '18px';
            progress.appendChild(createSTitle('Funding Progress'));
            const bar = document.createElement('div');
            bar.style.height = '10px';
            bar.style.background = C.border;
            bar.style.borderRadius = '5px';
            bar.style.marginBottom = '8px';
            const fill = document.createElement('div');
            fill.style.height = '100%';
            fill.style.width = '60%';
            fill.style.background = `linear-gradient(90deg, ${C.forest}, ${C.forestLight})`;
            fill.style.borderRadius = '5px';
            bar.appendChild(fill);
            progress.appendChild(bar);
            const info = document.createElement('div');
            info.style.display = 'flex';
            info.style.justifyContent = 'space-between';
            info.style.fontSize = '12px';
            info.style.color = C.textDim;
            info.innerHTML = '<span>EGP 90,000 raised</span><span style="color:'+C.forest+';font-weight:700">60% funded</span>';
            progress.appendChild(info);
            content.appendChild(progress);
        } else if (activeTab === 'Performance') {
            const grid4 = document.createElement('div');
            grid4.style.display = 'grid';
            grid4.style.gridTemplateColumns = 'repeat(4,1fr)';
            grid4.style.gap = '10px';
            grid4.style.marginBottom = '18px';
            grid4.appendChild(createStat('Season Yield', '94%', 'vs 88% target', C.operator));
            grid4.appendChild(createStat('Revenue', 'EGP 127K', '+12% vs forecast', C.green));
            grid4.appendChild(createStat('Disbursed', 'EGP 19K', 'Last: Apr 15', C.brown));
            grid4.appendChild(createStat('Next Payment', 'Jun 15', 'EGP 21K projected', C.gold));
            content.appendChild(grid4);

            const chartBox = document.createElement('div');
            chartBox.style.background = C.card;
            chartBox.style.border = `1px solid ${C.border}`;
            chartBox.style.borderRadius = '14px';
            chartBox.style.padding = '18px';
            chartBox.style.marginBottom = '14px';
            chartBox.appendChild(createSTitle('Seasonal Yield Performance'));
            const chartContainer = document.createElement('div');
            chartContainer.style.width = '100%';
            chartContainer.style.height = '185px';
            AreaChart(chartContainer, YIELD_TREND, 'y', C.operator, 'operatorGrad', v => v+'%');
            chartBox.appendChild(chartContainer);
            content.appendChild(chartBox);

            // disbursement log
            const log = document.createElement('div');
            log.style.background = C.card;
            log.style.border = `1px solid ${C.border}`;
            log.style.borderRadius = '14px';
            log.style.padding = '18px';
            log.appendChild(createSTitle('Disbursement Log'));
            [
                {date:"Apr 15, 2025", amt:"EGP 19,200", status:"Completed", c:C.green},
                {date:"Jan 15, 2025", amt:"EGP 17,800", status:"Completed", c:C.green},
                {date:"Oct 15, 2024", amt:"EGP 15,600", status:"Completed", c:C.green},
                {date:"Jun 15, 2025", amt:"EGP 21,000", status:"Upcoming", c:C.amber}
            ].forEach(d => {
                const row = document.createElement('div');
                row.style.background = C.surface;
                row.style.borderRadius = '10px';
                row.style.padding = '10px 14px';
                row.style.marginBottom = '7px';
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.flexWrap = 'wrap';
                row.style.gap = '8px';
                row.innerHTML = `<span style="font-size:12px;color:${C.textDim}">${d.date}</span><span style="font-size:13px;font-weight:700;color:${C.goldLight};font-family:'Cinzel',serif">${d.amt}</span>`;
                row.appendChild(createBadge(d.status, d.c));
                log.appendChild(row);
            });
            content.appendChild(log);
        } else if (activeTab === 'AI Agent') {
            content.appendChild(AgentChat({
                label: 'Farm Operator',
                systemPrompt: `You are a farm management AI agent for Keheilan Asset Management's agricultural investment platform.
Always use your tools to fetch real data before answering.
- Use get_farm_profile for farm questions and score analysis.
- Use get_yield_data for performance and yield questions.
- Use structure_capital_request when the user asks about funding or capital.
- Use generate_performance_report to create investor-ready reports.
- Use get_score_improvement_tips when asked about improving AI score.
Be practical, clear, and data-driven.`,
                tools: OPERATOR_TOOLS,
                accent: C.operator,
                placeholders: ["How do I improve my AI score?", "Structure a capital request for EGP 200,000", "Generate my Q2 performance report", "Show my yield data"]
            }));
        }
        wrapper.appendChild(content);
    }
    render();
    return wrapper;
}

// Admin portal (not needed for investor/operator but included for completeness)
function AdminPortal() {
    const wrapper = document.createElement('div');
    wrapper.textContent = 'Admin portal would go here.';
    return wrapper;
}

// --------------- Portal Shell ---------------
async function renderPortal() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = '/';
            return;
        }
        const role = data.user.role; // 'investor' or 'operator'

        const root = document.getElementById('root');
        root.innerHTML = '';

        // Navigation bar
        const nav = document.createElement('div');
        nav.style.background = C.surface;
        nav.style.borderBottom = `1px solid ${C.border}`;
        nav.style.padding = '0 16px';
        nav.style.display = 'flex';
        nav.style.alignItems = 'center';
        nav.style.height = '56px';
        nav.style.position = 'sticky';
        nav.style.top = '0';
        nav.style.zIndex = '100';
        nav.style.gap = '10px';

        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back';
        backBtn.style.background = 'none';
        backBtn.style.border = `1px solid ${C.border}`;
        backBtn.style.color = C.textDim;
        backBtn.style.cursor = 'pointer';
        backBtn.style.fontSize = '12px';
        backBtn.style.fontFamily = "'DM Sans', sans-serif";
        backBtn.style.display = 'flex';
        backBtn.style.alignItems = 'center';
        backBtn.style.gap = '4px';
        backBtn.style.padding = '6px 12px';
        backBtn.style.borderRadius = '8px';
        backBtn.style.flexShrink = '0';
        backBtn.style.whiteSpace = 'nowrap';
        backBtn.onclick = () => { window.location.href = '/'; };

        const divider = document.createElement('div');
        divider.style.width = '1px';
        divider.style.height = '24px';
        divider.style.background = C.border;
        divider.style.flexShrink = '0';

        const brand = document.createElement('span');
        brand.textContent = 'Keheilan';
        brand.style.fontFamily = "'Cinzel', serif";
        brand.style.fontSize = '12px';
        brand.style.color = C.gold;
        brand.style.letterSpacing = '2px';
        brand.style.textTransform = 'uppercase';
        brand.style.fontWeight = '700';

        const rightSide = document.createElement('div');
        rightSide.style.marginLeft = 'auto';
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.gap = '8px';

        const portalLabel = document.createElement('span');
        portalLabel.style.fontSize = '11px';
        portalLabel.style.color = C.textDim;
        portalLabel.textContent = role === 'investor' ? '💼 Investor Portal' : '🌾 Farm Operator Portal';

        const avatar = document.createElement('div');
        avatar.style.width = '32px';
        avatar.style.height = '32px';
        avatar.style.borderRadius = '50%';
        avatar.style.background = `${role === 'investor' ? C.investor : C.operator}22`;
        avatar.style.border = `1px solid ${role === 'investor' ? C.investor : C.operator}55`;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '14px';
        avatar.style.flexShrink = '0';
        avatar.textContent = role === 'investor' ? '💼' : '🌾';

        rightSide.appendChild(portalLabel);
        rightSide.appendChild(avatar);

        nav.appendChild(backBtn);
        nav.appendChild(divider);
        nav.appendChild(brand);
        nav.appendChild(rightSide);
        root.appendChild(nav);

        // Main content
        const main = document.createElement('div');
        main.style.maxWidth = '980px';
        main.style.margin = '0 auto';
        main.style.padding = '24px 14px 48px';

        const greeting = document.createElement('div');
        greeting.style.marginBottom = '22px';
        greeting.innerHTML = `
            <div style="font-size:9px; color:${role==='investor'?C.investor:C.operator}; letter-spacing:3px; text-transform:uppercase; font-weight:700; margin-bottom:5px;">${role==='investor' ? 'Investor Portal' : 'Farm Operator Portal'}</div>
            <div style="font-family:'Cinzel',serif; font-size:clamp(18px,4vw,24px); font-weight:700; color:${C.goldLight}">${role==='investor' ? 'Welcome back, Mohammed' : 'Welcome, Sara Mahmoud'}</div>
        `;
        main.appendChild(greeting);

        const portal = document.createElement('div');
        if (role === 'investor') {
            portal.appendChild(InvestorPortal());
        } else if (role === 'operator') {
            portal.appendChild(FarmOperatorPortal());
        } else {
            portal.appendChild(AdminPortal());
        }
        main.appendChild(portal);
        root.appendChild(main);

    } catch (e) {
        console.error(e);
    }
}

// Start
renderPortal();