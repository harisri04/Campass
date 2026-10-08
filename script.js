/* Campus Compass - frontend-only application
   Data is stored in localStorage. No backend is required. */

const STORAGE_KEY = "campusCompassStateV1";

const defaultState = {
  tasks: [
    {id: 1, title: "Revise Java arrays", subject: "DSA", due: todayISO(), priority: "high", time: 30, notes: "Review traversal, insertion and deletion.", completed: false},
    {id: 2, title: "Finish cybersecurity notes", subject: "Cybersecurity", due: addDaysISO(1), priority: "medium", time: 45, notes: "Summarize the access control chapter.", completed: false},
    {id: 3, title: "Submit UI assignment", subject: "Web Development", due: addDaysISO(3), priority: "low", time: 30, notes: "", completed: true}
  ],
  exams: [
    {id: 1, subject: "Data Structures", date: addDaysISO(12), time: "09:00", location: "Block A — Room 204"},
    {id: 2, subject: "Cybersecurity", date: addDaysISO(18), time: "10:30", location: "Block B — Room 102"}
  ],
  subjects: [
    {id: 1, name: "Data Structures", score: 82, target: 90},
    {id: 2, name: "Java", score: 76, target: 85},
    {id: 3, name: "Cybersecurity", score: 91, target: 90},
    {id: 4, name: "Mathematics", score: 68, target: 80}
  ],
  focusSessions: [],
  theme: "light"
};

let state = loadState();
let currentTaskFilter = "all";
let timer = {duration: 25 * 60, remaining: 25 * 60, running: false, interval: null};
let subjectChart = null;
let studyChart = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function todayISO() {
  const d = new Date();
  return localISO(d);
}
function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localISO(d);
}
function localISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? {...defaultState, ...saved} : structuredClone(defaultState);
  } catch { return structuredClone(defaultState); }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}
function uid() { return Date.now() + Math.floor(Math.random() * 1000); }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {day:"numeric", month:"short"});
}
function daysUntil(dateString) {
  const today = new Date(); today.setHours(0,0,0,0);
  const date = new Date(`${dateString}T00:00:00`);
  return Math.ceil((date - today) / 86400000);
}
function showToast(message) {
  $("#toast span").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => $("#toast").classList.remove("show"), 2300);
}

/* Navigation */
function showSection(id) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === id));
  $$(".nav-item[data-section]").forEach(b => b.classList.toggle("active", b.dataset.section === id));
  const active = $(`.nav-item[data-section="${id}"]`);
  $("#pageTitle").textContent = active ? active.textContent.trim() : "Dashboard";
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
  if (id === "progress") setTimeout(renderCharts, 50);
}
$$("[data-section-jump]").forEach(el => el.addEventListener("click", () => showSection(el.dataset.sectionJump)));
$$(".nav-item[data-section]").forEach(el => el.addEventListener("click", () => showSection(el.dataset.section)));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

/* Date / greeting */
function renderHeader() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("#greeting").textContent = `${greeting}, Student 👋`;
  const now = new Date();
  $("#dayName").textContent = now.toLocaleDateString("en-IN", {weekday:"long"});
  $("#fullDate").textContent = now.toLocaleDateString("en-IN", {day:"2-digit", month:"long", year:"numeric"});
}

/* Dashboard */
function renderDashboard() {
  const open = state.tasks.filter(t => !t.completed).length;
  $("#taskCount").textContent = open;
  $("#taskMeta").textContent = open ? `${state.tasks.filter(t => t.priority === "high" && !t.completed).length} high priority` : "You're all caught up";

  const exams = [...state.exams].sort((a,b) => a.date.localeCompare(b.date));
  $("#examCount").textContent = exams.length;
  if (exams[0]) {
    const d = daysUntil(exams[0].date);
    $("#examMeta").textContent = d < 0 ? "Past date — update it" : `${d === 0 ? "Today" : d + " days"} until ${exams[0].subject}`;
  } else $("#examMeta").textContent = "Add your first exam";

  const totalFocus = state.focusSessions.reduce((sum, s) => sum + Number(s.minutes || 0), 0);
  $("#studyMinutes").textContent = totalFocus >= 60 ? `${Math.floor(totalFocus/60)}h ${totalFocus%60}m` : `${totalFocus}m`;

  const avg = averageScore();
  $("#overallScore").textContent = avg ? `${avg}%` : "0%";
  $("#scoreMeta").textContent = avg ? (avg >= 85 ? "Excellent momentum" : avg >= 70 ? "Good — keep going" : "Room to improve") : "Add subject scores";

  const todayTasks = state.tasks.filter(t => t.due === todayISO() && !t.completed);
  const list = todayTasks.slice(0,5);
  if (!list.length) {
    $("#todaySchedule").innerHTML = empty("ri-calendar-check-line", "No tasks due today", "Enjoy the breathing room or add a new task.");
  } else {
    $("#todaySchedule").innerHTML = list.map(t => `
      <div class="schedule-item">
        <div class="schedule-time">${t.time} min</div>
        <div class="schedule-info"><span class="schedule-dot"></span><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.subject)} · Due today</small></div></div>
        <span class="schedule-tag">${escapeHTML(t.priority)}</span>
      </div>`).join("");
  }
  renderSmartPlan(30);
}
function renderSmartPlan(minutes) {
  $("#smartTimeLabel").textContent = minutes >= 60 ? `${minutes/60} hour${minutes > 60 ? "s":""}` : minutes;
  const openTasks = state.tasks.filter(t => !t.completed).sort((a,b) => priorityRank(a.priority)-priorityRank(b.priority) || a.due.localeCompare(b.due));
  let plan = [];
  if (minutes <= 15) {
    plan = [{title:"Pick one micro-topic", time:5},{title:"Review the key idea", time:5},{title:"Answer 2 quick questions", time:5}];
  } else if (minutes <= 30) {
    plan = [
      {title: openTasks[0] ? `Work on: ${openTasks[0].title}` : "Review one difficult topic", time:15},
      {title:"Solve 3 practice questions", time:10},
      {title:"Write a 5-minute summary", time:5}
    ];
  } else if (minutes <= 60) {
    plan = [
      {title: openTasks[0] ? `Deep work: ${openTasks[0].title}` : "Study your weakest topic", time:25},
      {title:"Take a 5-minute reset", time:5},
      {title:"Practice without notes", time:20},
      {title:"Record what you still don't know", time:10}
    ];
  } else {
    plan = [
      {title: openTasks[0] ? `Deep work: ${openTasks[0].title}` : "Study your weakest subject", time:45},
      {title:"Take a 10-minute break", time:10},
      {title:"Practice / past-paper questions", time:35},
      {title:"Review mistakes", time:20},
      {title:"Plan tomorrow's first task", time:10}
    ];
  }
  $("#smartPlan").innerHTML = plan.map((p,i) => `<div class="plan-step"><span class="step-number">${i+1}</span><div><strong>${escapeHTML(p.title)}</strong><small>Focused, distraction-free</small></div><span class="step-time">${p.time}m</span></div>`).join("");
}
function priorityRank(p){ return p === "high" ? 0 : p === "medium" ? 1 : 2; }
$$(".time-pill").forEach(btn => btn.addEventListener("click", () => {
  $$(".time-pill").forEach(b => b.classList.remove("active")); btn.classList.add("active");
  renderSmartPlan(Number(btn.dataset.minutes));
}));

/* Planner */
function renderPlanner() {
  const search = ($("#taskSearch")?.value || "").toLowerCase().trim();
  let tasks = [...state.tasks];
  if (currentTaskFilter === "today") tasks = tasks.filter(t => t.due === todayISO() && !t.completed);
  if (currentTaskFilter === "upcoming") tasks = tasks.filter(t => t.due > todayISO() && !t.completed);
  if (currentTaskFilter === "completed") tasks = tasks.filter(t => t.completed);
  if (search) tasks = tasks.filter(t => `${t.title} ${t.subject} ${t.notes}`.toLowerCase().includes(search));
  tasks.sort((a,b) => Number(a.completed)-Number(b.completed) || priorityRank(a.priority)-priorityRank(b.priority) || a.due.localeCompare(b.due));
  $("#visibleTaskCount").textContent = tasks.length;
  $("#taskBoardTitle").textContent = ({all:"All tasks",today:"Today",upcoming:"Upcoming",completed:"Completed"})[currentTaskFilter];

  $("#taskList").innerHTML = tasks.length ? tasks.map(t => `
    <div class="task-item">
      <button class="check ${t.completed ? "done":""}" data-toggle-task="${t.id}" title="Mark complete">${t.completed ? '<i class="ri-check-line"></i>' : ""}</button>
      <div class="task-main">
        <strong style="${t.completed ? "text-decoration:line-through;opacity:.55" : ""}">${escapeHTML(t.title)}</strong>
        <small>${escapeHTML(t.subject)} · ${t.due === todayISO() ? "Today" : formatDate(t.due)} · ${t.time} min</small>
        ${t.notes ? `<small class="task-note">${escapeHTML(t.notes)}</small>` : ""}
      </div>
      <div class="task-actions">
        <span class="priority ${t.priority}">${t.priority}</span>
        <button data-edit-task="${t.id}" title="Edit"><i class="ri-pencil-line"></i></button>
        <button data-delete-task="${t.id}" title="Delete"><i class="ri-delete-bin-6-line"></i></button>
      </div>
    </div>`).join("") : empty("ri-inbox-line","No tasks here","Add a task and turn your next step into something visible.");

  $$("[data-toggle-task]").forEach(b => b.addEventListener("click", () => {
    const t = state.tasks.find(x => x.id == b.dataset.toggleTask);
    if(t){ t.completed = !t.completed; saveState(); showToast(t.completed ? "Task completed ✓" : "Task reopened"); }
  }));
  $$("[data-delete-task]").forEach(b => b.addEventListener("click", () => {
    state.tasks = state.tasks.filter(x => x.id != b.dataset.deleteTask); saveState(); showToast("Task deleted");
  }));
  $$("[data-edit-task]").forEach(b => b.addEventListener("click", () => openTaskModal(Number(b.dataset.editTask))));
  renderWeekBars();
}
function renderWeekBars() {
  const days = [...Array(7)].map((_,i) => { const d = new Date(); d.setDate(d.getDate()+i); return {date:localISO(d), label:d.toLocaleDateString("en-IN",{weekday:"narrow"})}; });
  const max = Math.max(60, ...days.map(x => state.tasks.filter(t=>t.due===x.date).reduce((s,t)=>s+Number(t.time),0)));
  $("#weekBars").innerHTML = days.map(d => {
    const total = state.tasks.filter(t=>t.due===d.date).reduce((s,t)=>s+Number(t.time),0);
    const done = state.tasks.filter(t=>t.due===d.date && t.completed).reduce((s,t)=>s+Number(t.time),0);
    return `<div class="week-day"><div class="bar-track" title="${total} planned minutes"><span class="bar-fill" style="height:${Math.max(total?4:0,total/max*100)}%"></span></div><small>${d.label}</small><div style="position:absolute;display:none">${done}</div></div>`;
  }).join("");
}
$$("[data-filter]").forEach(b => b.addEventListener("click", () => {
  $$("#taskFilters button").forEach(x=>x.classList.remove("active")); b.classList.add("active");
  currentTaskFilter=b.dataset.filter; renderPlanner();
}));
$("#taskSearch").addEventListener("input", renderPlanner);
$("#addTaskBtn").addEventListener("click", () => openTaskModal());

function openTaskModal(id=null) {
  $("#taskModalTitle").textContent = id ? "Edit task" : "Add a task";
  const t = state.tasks.find(x=>x.id===id);
  $("#taskId").value = t?.id || "";
  $("#taskTitle").value = t?.title || "";
  $("#taskSubject").value = t?.subject || "";
  $("#taskDue").value = t?.due || todayISO();
  $("#taskPriority").value = t?.priority || "medium";
  $("#taskTime").value = t?.time || "30";
  $("#taskNotes").value = t?.notes || "";
  $("#taskModal").classList.add("open");
}
$("#taskForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("#taskId").value;
  const obj = {id:id?Number(id):uid(),title:$("#taskTitle").value.trim(),subject:$("#taskSubject").value.trim(),due:$("#taskDue").value,priority:$("#taskPriority").value,time:Number($("#taskTime").value),notes:$("#taskNotes").value.trim(),completed:id ? state.tasks.find(t=>t.id==id).completed : false};
  if(id) state.tasks = state.tasks.map(t=>t.id==id?obj:t); else state.tasks.push(obj);
  closeModals(); saveState(); showToast(id ? "Task updated" : "Task added");
});

/* Exams */
function renderExams() {
  const exams = [...state.exams].sort((a,b)=>a.date.localeCompare(b.date));
  const future = exams.filter(e=>daysUntil(e.date)>=0);
  const next = future[0];
  $("#nextExamName").textContent = next ? next.subject : "No upcoming exam";
  $("#nextExamDays").textContent = next ? (daysUntil(next.date)===0 ? "Your exam is today." : `${daysUntil(next.date)} days to prepare · ${formatDate(next.date)}`) : "Add an exam to start counting down.";
  const urgent = future.filter(e=>daysUntil(e.date)<=7).length;
  $("#urgentExamText").textContent = urgent ? `${urgent} exam${urgent>1?"s":""} need attention` : "You're clear";

  $("#examGrid").innerHTML = exams.length ? exams.map(e => {
    const d=daysUntil(e.date), date=new Date(`${e.date}T00:00:00`);
    return `<div class="card exam-card ${d>=0&&d<=7?"urgent":""}">
      <button class="exam-delete" data-delete-exam="${e.id}" title="Delete"><i class="ri-delete-bin-6-line"></i></button>
      <div class="exam-card-head"><div class="exam-date-box"><b>${date.getDate()}</b><small>${date.toLocaleDateString("en-IN",{month:"short"})}</small></div></div>
      <h3>${escapeHTML(e.subject)}</h3><p><i class="ri-time-line"></i> ${e.time || "Time not set"} ${e.location ? `· ${escapeHTML(e.location)}` : ""}</p>
      <span class="days-left ${d>=0&&d<=7?"urgent":""}">${d<0?"Past exam":d===0?"Today":`${d} days left`}</span>
    </div>`;
  }).join("") : empty("ri-calendar-event-line","No exams yet","Add your first exam and the countdown will start.");
  $$("[data-delete-exam]").forEach(b=>b.addEventListener("click",()=>{state.exams=state.exams.filter(e=>e.id!=b.dataset.deleteExam);saveState();showToast("Exam removed")}));
}
$("#addExamBtn").addEventListener("click",()=>$("#examModal").classList.add("open"));
$("#examForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.exams.push({id:uid(),subject:$("#examSubject").value.trim(),date:$("#examDate").value,time:$("#examTime").value,location:$("#examLocation").value.trim()});
  closeModals();saveState();e.target.reset();showToast("Exam added");
});

/* Progress */
function averageScore(){return state.subjects.length ? Math.round(state.subjects.reduce((s,x)=>s+Number(x.score),0)/state.subjects.length) : 0}
function renderProgress(){
  const avg=averageScore(), totalFocus=state.focusSessions.reduce((s,x)=>s+Number(x.minutes),0);
  $("#bigAverage").textContent=`${avg}%`; $("#completedCount").textContent=state.tasks.filter(t=>t.completed).length;
  $("#totalFocus").textContent=totalFocus>=60?`${Math.floor(totalFocus/60)}h ${totalFocus%60}m`:`${totalFocus}m`;
  $("#scoreHeadline").textContent=avg>=85?"Excellent momentum":avg>=70?"Good progress":avg?"Keep building":"Start tracking";
  $("#scoreDescription").textContent=avg?`${state.subjects.length} subjects tracked. Your target is ${Math.round(state.subjects.reduce((s,x)=>s+Number(x.target),0)/state.subjects.length)}%.`:"Add your subject scores to see your academic picture.";
  const deg=avg*3.6; $(".score-circle").style.background=`conic-gradient(var(--primary) ${deg}deg,var(--purple-soft) ${deg}deg)`;
  $("#subjectList").innerHTML=state.subjects.length?state.subjects.map(s=>`<div class="subject-row"><span class="subject-name">${escapeHTML(s.name)}</span><div class="progress-line"><span style="width:${Math.min(100,Math.max(0,s.score))}%"></span></div><span class="subject-score">${s.score}%</span><button class="subject-delete" data-delete-subject="${s.id}" title="Delete"><i class="ri-close-line"></i></button></div>`).join(""):empty("ri-bar-chart-line","No subjects tracked","Add subjects and your progress will appear here.");
  $$("[data-delete-subject]").forEach(b=>b.addEventListener("click",()=>{state.subjects=state.subjects.filter(s=>s.id!=b.dataset.deleteSubject);saveState();showToast("Subject removed")}));
}
$("#addSubjectBtn").addEventListener("click",()=>$("#subjectModal").classList.add("open"));
$("#subjectForm").addEventListener("submit",e=>{
  e.preventDefault();state.subjects.push({id:uid(),name:$("#subjectName").value.trim(),score:Number($("#subjectScore").value),target:Number($("#subjectTarget").value)});
  closeModals();saveState();e.target.reset();showToast("Subject added");
});
function renderCharts(){
  if(typeof Chart==="undefined") return;
  const textColor=getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
  const gridColor=getComputedStyle(document.documentElement).getPropertyValue("--border").trim();
  if(subjectChart)subjectChart.destroy(); if(studyChart)studyChart.destroy();
  subjectChart=new Chart($("#subjectChart"),{type:"bar",data:{labels:state.subjects.map(s=>s.name),datasets:[{label:"Score",data:state.subjects.map(s=>s.score),borderRadius:8,backgroundColor:"#6c63ff"}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:textColor,font:{size:10}},grid:{display:false}},y:{min:0,max:100,ticks:{color:textColor,font:{size:10}},grid:{color:gridColor}}}}});
  const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d});
  const labels=days.map(d=>d.toLocaleDateString("en-IN",{weekday:"short"}));
  const vals=days.map(d=>{const key=localISO(d);return state.focusSessions.filter(s=>s.date===key).reduce((sum,s)=>sum+Number(s.minutes),0)/60});
  studyChart=new Chart($("#studyChart"),{type:"line",data:{labels,datasets:[{label:"Hours",data:vals,borderColor:"#6c63ff",backgroundColor:"rgba(108,99,255,.1)",fill:true,tension:.4,pointRadius:4,pointBackgroundColor:"#6c63ff"}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:textColor,font:{size:10}},grid:{display:false}},y:{beginAtZero:true,ticks:{color:textColor,font:{size:10}},grid:{color:gridColor}}}}});
}

/* Focus timer */
function updateTimerDisplay(){
  const mins=Math.floor(timer.remaining/60), secs=timer.remaining%60;
  $("#timerDisplay").textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  const progress=1-(timer.remaining/timer.duration), deg=progress*360;
  $("#timerRing").style.background=`conic-gradient(var(--primary) ${deg}deg,var(--purple-soft) ${deg}deg)`;
}
function setTimer(minutes){
  clearInterval(timer.interval);timer.running=false;timer.duration=minutes*60;timer.remaining=minutes*60;
  $("#startTimer").innerHTML='<i class="ri-play-fill"></i> Start focus';$("#timerStatus").textContent="Ready to focus";updateTimerDisplay();
}
function startTimer(){
  if(timer.running){clearInterval(timer.interval);timer.running=false;$("#startTimer").innerHTML='<i class="ri-play-fill"></i> Resume';$("#timerStatus").textContent="Paused";return}
  timer.running=true;$("#startTimer").innerHTML='<i class="ri-pause-fill"></i> Pause';$("#timerStatus").textContent="Focus in progress";
  timer.interval=setInterval(()=>{
    timer.remaining--;updateTimerDisplay();
    if(timer.remaining<=0){clearInterval(timer.interval);timer.running=false;$("#startTimer").innerHTML='<i class="ri-play-fill"></i> Start focus';$("#timerStatus").textContent="Session complete!";
      const minutes=Math.round(timer.duration/60);state.focusSessions.push({id:uid(),date:todayISO(),minutes});saveState();showToast(`Great work — ${minutes} minutes logged!`);renderFocusHistory();
    }
  },1000);
}
$$(".timer-preset").forEach(b=>b.addEventListener("click",()=>{$$(".timer-preset").forEach(x=>x.classList.remove("active"));b.classList.add("active");setTimer(Number(b.dataset.duration))}));
$("#startTimer").addEventListener("click",startTimer);$("#resetTimer").addEventListener("click",()=>setTimer(Math.round(timer.duration/60)));
function renderFocusSelect(){
  const open=state.tasks.filter(t=>!t.completed);$("#focusTaskSelect").innerHTML=`<option value="">Choose a task...</option>`+open.map(t=>`<option value="${t.id}">${escapeHTML(t.title)} — ${escapeHTML(t.subject)}</option>`).join("");
}
function renderFocusHistory(){
  const sessions=[...state.focusSessions].slice(-5).reverse();
  $("#focusHistory").innerHTML=sessions.length?sessions.map(s=>`<div class="history-row"><span>${formatDate(s.date)}</span><strong>${s.minutes} min</strong></div>`).join(""):`<div class="empty-state"><i class="ri-timer-line"></i><strong>No sessions yet</strong><p>Complete a focus session to build your history.</p></div>`;
}

/* I'm Stuck */
const advice={
 topic:{title:"Make the topic smaller.",text:"Don't try to understand the whole chapter at once. Write down the exact concept you cannot explain, spend 10 minutes learning only that concept, then explain it in your own words without looking at your notes.",actions:[["Start a 15-minute focus","focus"],["Open planner","planner"]]},
 time:{title:"Shrink your plan.",text:"Pick only three outcomes for today: one must-do academic task, one short revision task, and one personal task. Estimate each honestly, then start the smallest one.",actions:[["Build a 30-minute plan","dashboard"],["Open planner","planner"]]},
 assignments:{title:"Choose by impact, not by mood.",text:"List your unfinished assignments. Mark the one with the nearest deadline and highest marks. Work on that for 25 minutes before touching anything else.",actions:[["Open planner","planner"],["Start focus","focus"]]},
 exam:{title:"Don't panic. Switch to active recall.",text:"For tomorrow's exam, avoid rereading everything. Spend 20 minutes recalling key concepts, 20 minutes solving questions, and 10 minutes reviewing your mistakes.",actions:[["Start 50-minute focus","focus"],["View exams","exams"]]},
 career:{title:"Choose one useful skill for 7 days.",text:"You don't need your entire career figured out today. Pick one skill that supports your current studies and give it a focused one-week experiment.",actions:[["Make a study plan","dashboard"],["Open planner","planner"]]},
 focus:{title:"Make the first 10 minutes impossible to avoid.",text:"Put your phone away, close unrelated tabs, choose one tiny outcome, and start a 10-minute sprint. Momentum usually comes after starting, not before.",actions:[["Start focus","focus"],["Choose a task","planner"]]}
};
$$(".stuck-card").forEach(b=>b.addEventListener("click",()=>{
  const a=advice[b.dataset.problem];$("#adviceCard").classList.remove("hidden");$("#adviceTitle").textContent=a.title;$("#adviceText").textContent=a.text;
  $("#adviceActions").innerHTML=a.actions.map(x=>`<button class="secondary-btn" data-section-jump="${x[1]}">${x[0]} <i class="ri-arrow-right-line"></i></button>`).join("");
  $$("#adviceActions [data-section-jump]").forEach(x=>x.addEventListener("click",()=>showSection(x.dataset.sectionJump)));
  $("#adviceCard").scrollIntoView({behavior:"smooth",block:"center"});
}));
$("#closeAdvice").addEventListener("click",()=>$("#adviceCard").classList.add("hidden"));

/* Theme / settings */
function applyTheme(){
  document.documentElement.dataset.theme=state.theme;
  $("#themeBtn").innerHTML=state.theme==="dark"?'<i class="ri-sun-line"></i>':'<i class="ri-moon-line"></i>';
}
$("#themeBtn").addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";localStorage.setItem(STORAGE_KEY,JSON.stringify(state));applyTheme();renderCharts();showToast(state.theme==="dark"?"Dark mode on":"Light mode on")});
$("#settingsBtn").addEventListener("click",()=>showSection("dashboard"));
$("#profileBtn").addEventListener("click",()=>showToast("Profile settings are frontend-only in this version"));
$("#notificationBtn").addEventListener("click",()=>showToast("You're up to date ✨"));

const quotes=[
["You don't need to see the whole staircase, just take the next step.","Unknown"],
["Success is the sum of small efforts, repeated day in and day out.","Robert Collier"],
["The secret of getting ahead is getting started.","Mark Twain"],
["A little progress each day adds up to big results.","Unknown"],
["Focus on the step in front of you, not the whole staircase.","Unknown"]
];
$("#newQuote").addEventListener("click",()=>{const q=quotes[Math.floor(Math.random()*quotes.length)];$("#quoteText").textContent=q[0];$("#quoteAuthor").textContent=`— ${q[1]}`});

/* Modals */
$$(".close-modal").forEach(b=>b.addEventListener("click",closeModals));
$$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModals()}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModals()});
function closeModals(){$$(".modal-backdrop").forEach(m=>m.classList.remove("open"))}
function empty(icon,title,text){return `<div class="empty-state"><i class="${icon}"></i><strong>${title}</strong><p>${text}</p></div>`}

/* Master render */
function renderAll(){
  renderHeader();renderDashboard();renderPlanner();renderExams();renderProgress();renderFocusSelect();renderFocusHistory();applyTheme();
}
renderAll();
updateTimerDisplay();

/* ===== Added student features: assignments, timetable, notes, GPA, attendance, resources, login ===== */
const EXTRA_KEY="campusCompassExtraV1";
let extra=JSON.parse(localStorage.getItem(EXTRA_KEY)||"null")||{
  assignments:[
    {id:1,title:"Complete Cybersecurity Assignment",subject:"Cybersecurity",due:todayISO(),time:"23:59",priority:"high",status:"pending",details:"Complete the assigned questions and submit the final PDF."},
    {id:2,title:"Practice Java Array Problems",subject:"DSA",due:addDaysISO(1),time:"18:00",priority:"medium",status:"in-progress",details:"Solve array traversal, insertion and deletion problems."},
    {id:3,title:"Submit UI Assignment",subject:"Web Development",due:addDaysISO(3),time:"20:00",priority:"low",status:"completed",details:"Upload the completed frontend assignment."}
  ],
  classes:[{id:1,subject:"Data Structures",day:"Monday",time:"9:00 AM - 10:00 AM",room:"Block A • Room 204"},{id:2,subject:"Cybersecurity",day:"Tuesday",time:"10:00 AM - 11:00 AM",room:"Block B • Room 102"},{id:3,subject:"Java Programming",day:"Wednesday",time:"11:00 AM - 12:00 PM",room:"Lab 2"},{id:4,subject:"Operating Systems",day:"Thursday",time:"9:00 AM - 10:00 AM",room:"Block A • Room 106"},{id:5,subject:"Python",day:"Friday",time:"2:00 PM - 3:00 PM",room:"Lab 1"}],
  notes:[{id:1,title:"Java Arrays",body:"Remember: arrays have fixed size. Practice traversal and searching."}],
  resources:[{id:1,name:"MDN Web Docs",category:"Web Development",url:"https://developer.mozilla.org/"},{id:2,name:"GeeksforGeeks",category:"DSA",url:"https://www.geeksforgeeks.org/"}],
  gpa:[{id:1,subject:"Data Structures",grade:9,credits:4},{id:2,subject:"Cybersecurity",grade:9,credits:4},{id:3,subject:"Java",grade:8,credits:3}],
  attendance:[{id:1,subject:"Data Structures",held:30,attended:27},{id:2,subject:"Cybersecurity",held:30,attended:28},{id:3,subject:"Java",held:28,attended:25}],
  loggedIn:false,name:"Student"
};
function saveExtra(){localStorage.setItem(EXTRA_KEY,JSON.stringify(extra));}
function extraId(){return Date.now()+Math.floor(Math.random()*1000)}
function assignmentOverdue(a){return a.status!=="completed" && a.due < todayISO()}
function renderAssignments(){
  const list=$("#assignmentList"); if(!list)return;
  const sf=document.querySelector("#assignmentStatusFilters .active")?.dataset.afilter||"all", pf=$("#assignmentPriorityFilter")?.value||"all", q=($("#assignmentSearch")?.value||"").toLowerCase();
  let arr=extra.assignments.filter(a=>(sf==="all"||a.status===sf)&&(pf==="all"||a.priority===pf)&&(`${a.title} ${a.subject} ${a.details}`.toLowerCase().includes(q)));
  $("#assignmentVisibleCount").textContent=arr.length; $("#assignmentTotal").textContent=extra.assignments.length; $("#assignmentPending").textContent=extra.assignments.filter(a=>a.status==="pending").length; $("#assignmentProgress").textContent=extra.assignments.filter(a=>a.status==="in-progress").length; $("#assignmentDone").textContent=extra.assignments.filter(a=>a.status==="completed").length;
  list.innerHTML=arr.length?arr.map(a=>`<div class="assignment-item ${assignmentOverdue(a)?"overdue-item":""}"><div class="assignment-main"><h3>${escapeHTML(a.title)}</h3><div class="assignment-meta"><span>${escapeHTML(a.subject)}</span><span>Due ${formatDate(a.due)} at ${escapeHTML(a.time||"23:59")}</span><span class="badge ${a.priority}">${a.priority}</span><span class="badge ${a.status}">${a.status.replace("-"," ")}</span>${assignmentOverdue(a)?'<span class="badge overdue">Overdue</span>':''}</div><p class="assignment-details">${escapeHTML(a.details||"No description added.")}</p></div><div class="assignment-actions"><button data-a-view="${a.id}"><i class="ri-eye-line"></i> Details</button><button data-a-edit="${a.id}"><i class="ri-edit-line"></i> Edit</button><button data-a-done="${a.id}">${a.status==="completed"?'↩ Reopen':'✓ Complete'}</button><button data-a-delete="${a.id}"><i class="ri-delete-bin-line"></i></button></div></div>`).join(""):empty("ri-file-list-2-line","No assignments found","Add an assignment or change your filters.");
}
function openAssignment(a){$("#assignmentId").value=a?.id||"";$("#assignmentTitle").value=a?.title||"";$("#assignmentSubject").value=a?.subject||"";$("#assignmentDue").value=a?.due||todayISO();$("#assignmentTime").value=a?.time||"23:59";$("#assignmentPriority").value=a?.priority||"medium";$("#assignmentStatus").value=a?.status||"pending";$("#assignmentDetails").value=a?.details||"";$("#assignmentModal").classList.add("open")}
function openAssignmentDetail(a){$("#assignmentDetailTitle").textContent=a.title;$("#assignmentDetailBody").innerHTML=`<div class="detail-grid"><div class="detail-row"><strong>Subject</strong><span>${escapeHTML(a.subject)}</span></div><div class="detail-row"><strong>Deadline</strong><span>${formatDate(a.due)} at ${escapeHTML(a.time||"23:59")}${assignmentOverdue(a)?" — OVERDUE":""}</span></div><div class="detail-row"><strong>Status</strong><span>${a.status.replace("-"," ")}</span></div><div class="detail-row"><strong>Priority</strong><span>${a.priority}</span></div><div class="detail-row"><strong>Description / details</strong><span>${escapeHTML(a.details||"No details added.")}</span></div></div>`;$("#assignmentDetailModal").classList.add("open")}
$("#addAssignmentBtn")?.addEventListener("click",()=>openAssignment());
$("#assignmentForm")?.addEventListener("submit",e=>{e.preventDefault();const id=Number($("#assignmentId").value);const obj={id:id||extraId(),title:$("#assignmentTitle").value.trim(),subject:$("#assignmentSubject").value.trim(),due:$("#assignmentDue").value,time:$("#assignmentTime").value,priority:$("#assignmentPriority").value,status:$("#assignmentStatus").value,details:$("#assignmentDetails").value.trim()};const i=extra.assignments.findIndex(a=>a.id===id);i>=0?extra.assignments[i]=obj:extra.assignments.push(obj);saveExtra();renderAssignments();closeModals();showToast("Assignment saved")});
$("#assignmentStatusFilters")?.addEventListener("click",e=>{const b=e.target.closest("button[data-afilter]");if(!b)return;$("#assignmentStatusFilters .active")?.classList.remove("active");b.classList.add("active");renderAssignments()});$("#assignmentPriorityFilter")?.addEventListener("change",renderAssignments);$("#assignmentSearch")?.addEventListener("input",renderAssignments);
$("#assignmentList")?.addEventListener("click",e=>{const id=Number(e.target.closest("button")?.dataset.aView||e.target.closest("button")?.dataset.aEdit||e.target.closest("button")?.dataset.aDone||e.target.closest("button")?.dataset.aDelete);if(!id)return;const a=extra.assignments.find(x=>x.id===id);if(e.target.closest("[data-a-view]"))openAssignmentDetail(a);else if(e.target.closest("[data-a-edit]"))openAssignment(a);else if(e.target.closest("[data-a-done]")){a.status=a.status==="completed"?"pending":"completed";saveExtra();renderAssignments();showToast(a.status==="completed"?"Assignment completed":"Assignment reopened")}else if(e.target.closest("[data-a-delete]")){extra.assignments=extra.assignments.filter(x=>x.id!==id);saveExtra();renderAssignments();showToast("Assignment deleted")}});
function renderTimetable(){const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];$("#timetableGrid").innerHTML=days.map(d=>`<div class="day-column"><h3>${d}</h3>${extra.classes.filter(c=>c.day===d).map(c=>`<div class="class-card"><strong>${escapeHTML(c.subject)}</strong><span>${escapeHTML(c.time)}</span><span>${escapeHTML(c.room||"")}</span><button class="icon-btn" data-class-delete="${c.id}" title="Delete"><i class="ri-delete-bin-line"></i></button></div>`).join("")||'<div class="empty-state">No class added.</div>'}</div>`).join("")}
$("#addClassBtn")?.addEventListener("click",()=>$("#classModal").classList.add("open"));$("#classForm")?.addEventListener("submit",e=>{e.preventDefault();extra.classes.push({id:extraId(),subject:$("#classSubject").value.trim(),day:$("#classDay").value,time:$("#classTime").value,room:$("#classRoom").value.trim()});saveExtra();renderTimetable();e.target.reset();closeModals();showToast("Class added")});$("#timetableGrid")?.addEventListener("click",e=>{const id=Number(e.target.closest("[data-class-delete]")?.dataset.classDelete);if(id){extra.classes=extra.classes.filter(c=>c.id!==id);saveExtra();renderTimetable()}});
function renderNotes(){const q=($("#noteSearch")?.value||"").toLowerCase();const arr=extra.notes.filter(n=>`${n.title} ${n.body}`.toLowerCase().includes(q));$("#notesGrid").innerHTML=arr.length?arr.map(n=>`<article class="note-card"><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p><div class="card-actions"><button data-note-edit="${n.id}">Edit</button><button data-note-delete="${n.id}">Delete</button></div></article>`).join(""):empty("ri-sticky-note-line","No notes found","Add your first note.")}
function openNote(n){$("#noteId").value=n?.id||"";$("#noteTitle").value=n?.title||"";$("#noteBody").value=n?.body||"";$("#noteModal").classList.add("open")}
$("#addNoteBtn")?.addEventListener("click",()=>openNote());$("#noteForm")?.addEventListener("submit",e=>{e.preventDefault();const id=Number($("#noteId").value),o={id:id||extraId(),title:$("#noteTitle").value.trim(),body:$("#noteBody").value.trim()};const i=extra.notes.findIndex(n=>n.id===id);i>=0?extra.notes[i]=o:extra.notes.push(o);saveExtra();renderNotes();closeModals();showToast("Note saved")});$("#noteSearch")?.addEventListener("input",renderNotes);$("#notesGrid")?.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const id=Number(b.dataset.noteEdit||b.dataset.noteDelete),n=extra.notes.find(x=>x.id===id);if(b.dataset.noteEdit)openNote(n);else{extra.notes=extra.notes.filter(x=>x.id!==id);saveExtra();renderNotes();showToast("Note deleted")}});
function renderGPA(){const rows=$("#gpaRows");rows.innerHTML=extra.gpa.map((r,i)=>`<div class="gpa-row"><input data-gpa-name="${r.id}" value="${escapeHTML(r.subject)}"><input data-gpa-grade="${r.id}" type="number" min="0" max="10" step="0.1" value="${r.grade}"><input data-gpa-credit="${r.id}" type="number" min="1" value="${r.credits}"><button class="icon-btn" data-gpa-delete="${r.id}"><i class="ri-delete-bin-line"></i></button></div>`).join("");const total=extra.gpa.reduce((s,r)=>s+r.grade*r.credits,0),credits=extra.gpa.reduce((s,r)=>s+r.credits,0);$("#gpaResult").textContent=credits?(total/credits).toFixed(2):"0.00"}
$("#addGpaRow")?.addEventListener("click",()=>{extra.gpa.push({id:extraId(),subject:"New Subject",grade:8,credits:3});saveExtra();renderGPA()});$("#gpaRows")?.addEventListener("input",e=>{const id=Number(e.target.dataset.gpaName||e.target.dataset.gpaGrade||e.target.dataset.gpaCredit),r=extra.gpa.find(x=>x.id===id);if(!r)return;if(e.target.dataset.gpaName)r.subject=e.target.value;if(e.target.dataset.gpaGrade)r.grade=Number(e.target.value);if(e.target.dataset.gpaCredit)r.credits=Number(e.target.value);saveExtra();renderGPA()});$("#gpaRows")?.addEventListener("click",e=>{const id=Number(e.target.closest("[data-gpa-delete]")?.dataset.gpaDelete);if(id){extra.gpa=extra.gpa.filter(r=>r.id!==id);saveExtra();renderGPA()}});
function renderAttendance(){const rows=$("#attendanceRows");rows.innerHTML=extra.attendance.map(r=>`<div class="attendance-row"><input data-att-name="${r.id}" value="${escapeHTML(r.subject)}"><input data-att-held="${r.id}" type="number" min="0" value="${r.held}"><input data-att-attended="${r.id}" type="number" min="0" value="${r.attended}"><button class="icon-btn" data-att-delete="${r.id}"><i class="ri-delete-bin-line"></i></button></div>`).join("");const held=extra.attendance.reduce((s,r)=>s+Number(r.held),0),att=extra.attendance.reduce((s,r)=>s+Number(r.attended),0);$("#attendanceResult").textContent=held?Math.round(att/held*100)+"%":"0%"}
$("#addAttendanceRow")?.addEventListener("click",()=>{extra.attendance.push({id:extraId(),subject:"New Subject",held:0,attended:0});saveExtra();renderAttendance()});$("#attendanceRows")?.addEventListener("input",e=>{const id=Number(e.target.dataset.attName||e.target.dataset.attHeld||e.target.dataset.attAttended),r=extra.attendance.find(x=>x.id===id);if(!r)return;if(e.target.dataset.attName)r.subject=e.target.value;if(e.target.dataset.attHeld)r.held=Number(e.target.value);if(e.target.dataset.attAttended)r.attended=Math.min(Number(e.target.value),r.held);saveExtra();renderAttendance()});$("#attendanceRows")?.addEventListener("click",e=>{const id=Number(e.target.closest("[data-att-delete]")?.dataset.attDelete);if(id){extra.attendance=extra.attendance.filter(r=>r.id!==id);saveExtra();renderAttendance()}});
function renderResources(){const q=($("#resourceSearch")?.value||"").toLowerCase();const arr=extra.resources.filter(r=>`${r.name} ${r.category}`.toLowerCase().includes(q));$("#resourcesGrid").innerHTML=arr.map(r=>`<article class="resource-card"><h3>${escapeHTML(r.name)}</h3><small>${escapeHTML(r.category||"Resource")}</small><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener">Open resource <i class="ri-external-link-line"></i></a></article>`).join("")}
$("#addResourceBtn")?.addEventListener("click",()=>$("#resourceModal").classList.add("open"));$("#resourceForm")?.addEventListener("submit",e=>{e.preventDefault();extra.resources.push({id:extraId(),name:$("#resourceName").value.trim(),category:$("#resourceCategory").value.trim(),url:$("#resourceUrl").value.trim()});saveExtra();renderResources();closeModals();e.target.reset();showToast("Resource added")});
$("#loginForm")?.addEventListener("submit",e=>{e.preventDefault();extra.loggedIn=true;extra.name=$("#loginName").value.trim()||"Student";saveExtra();$("#loginScreen").classList.add("hidden");showToast(`Welcome, ${extra.name}!`)});
function initExtra(){if(extra.loggedIn)$("#loginScreen")?.classList.add("hidden");renderAssignments();renderTimetable();renderNotes();renderGPA();renderAttendance();renderResources();if(extra.name&&$("#greeting"))$("#greeting").textContent=`Good morning, ${extra.name} 👋`;}
initExtra();
